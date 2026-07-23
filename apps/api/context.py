"""Context resolution logic (routine/time-block, today's events, weather).

Pure logic, no router glue here - see routers/context.py for the HTTP layer.
Mirrors the separation already used elsewhere (analyzer.py vs routers/wardrobe.py).
"""

import json
from datetime import datetime, time, timedelta

from sqlalchemy.orm import Session

import models
from config import settings
from weather import WeatherFetchError, fetch_weather

_TIME_BLOCKS = [
    (5, 11, "morning"),
    (11, 17, "workday"),
    (17, 21, "evening"),
]
_NIGHT_BLOCK = "night"


def resolve_time_block(dt: datetime) -> str:
    for start_hour, end_hour, block in _TIME_BLOCKS:
        if start_hour <= dt.hour < end_hour:
            return block
    return _NIGHT_BLOCK


def get_todays_events(user_id: str, db: Session) -> list[models.CalendarEvent]:
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, time.min)
    end_of_day = datetime.combine(today, time.max)
    return (
        db.query(models.CalendarEvent)
        .filter(
            models.CalendarEvent.user_id == user_id,
            models.CalendarEvent.start_ts >= start_of_day,
            models.CalendarEvent.start_ts <= end_of_day,
        )
        .order_by(models.CalendarEvent.start_ts)
        .all()
    )


def resolve_routine_block(user_id: str, db: Session) -> str:
    # NOTE: recurrence_rule is intentionally never evaluated here - routine
    # applicability today is decided purely by time_block matching the
    # current computed block. Full RRULE evaluation is out of scope for an
    # MVP whose exit criteria only needs *a* routine snapshot to exist.
    current_block = resolve_time_block(datetime.utcnow())
    matched = (
        db.query(models.Routine)
        .filter(models.Routine.user_id == user_id, models.Routine.time_block == current_block)
        .order_by(models.Routine.created_at.desc())
        .first()
    )
    return matched.name if matched else current_block


def _location_hash(lat: float, lon: float) -> str:
    return f"{lat:.2f},{lon:.2f}"


def resolve_weather(user_id: str, lat: float, lon: float, db: Session) -> dict | None:
    location_hash = _location_hash(lat, lon)
    latest_cache = (
        db.query(models.WeatherCache)
        .filter(models.WeatherCache.user_id == user_id, models.WeatherCache.location_hash == location_hash)
        .order_by(models.WeatherCache.fetched_at.desc())
        .first()
    )

    now = datetime.utcnow()
    if latest_cache and latest_cache.expires_at and latest_cache.expires_at > now:
        forecast = json.loads(latest_cache.forecast_json)
        return {**forecast, "fetched_at": latest_cache.fetched_at, "is_stale": False}

    try:
        forecast = fetch_weather(lat, lon)
        cache_row = models.WeatherCache(
            user_id=user_id,
            location_hash=location_hash,
            fetched_at=now,
            expires_at=now + timedelta(minutes=settings.weather_cache_ttl_minutes),
            forecast_json=json.dumps(forecast),
        )
        db.add(cache_row)
        db.commit()
        return {**forecast, "fetched_at": now, "is_stale": False}
    except WeatherFetchError:
        if latest_cache:
            forecast = json.loads(latest_cache.forecast_json)
            return {**forecast, "fetched_at": latest_cache.fetched_at, "is_stale": True}
        return None


def resolve_recent_signals(user_id: str, db: Session, window_days: int | None = None) -> dict:
    """Repeat-avoidance signals for recommendation scoring (Phase 7).

    Only OutfitHistory rows with a real worn_at count as "recently worn" - a
    skip or a too_formal dislike is not "this was worn" and must not feed
    this signal, so rows with no worn_at are excluded entirely rather than
    falling back to created_at.
    """
    window = window_days if window_days is not None else settings.repeat_avoidance_window_days
    since = datetime.utcnow() - timedelta(days=window)

    rows = (
        db.query(models.OutfitHistory, models.Outfit)
        .join(models.Outfit, models.OutfitHistory.outfit_id == models.Outfit.id)
        .filter(
            models.OutfitHistory.user_id == user_id,
            models.OutfitHistory.worn_at.isnot(None),
            models.OutfitHistory.worn_at >= since,
        )
        .all()
    )

    recently_worn_item_ids: set[str] = set()
    recent_repeat_hashes: set[str] = set()
    for history, outfit in rows:
        for item_id in (outfit.top_item_id, outfit.bottom_item_id, outfit.outerwear_item_id, outfit.shoe_item_id):
            if item_id:
                recently_worn_item_ids.add(item_id)
        if history.repeat_group_hash:
            recent_repeat_hashes.add(history.repeat_group_hash)

    return {"recently_worn_item_ids": recently_worn_item_ids, "recent_repeat_hashes": recent_repeat_hashes}
