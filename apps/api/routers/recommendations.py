import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

import models
import recommender
import schemas
from context import get_todays_events, resolve_recent_signals, resolve_routine_block, resolve_weather
from database import get_db
from outfit_serializers import outfit_out
from security import get_current_user

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def persist_recommendation_run(
    current_user: models.User,
    tops: list,
    bottoms: list,
    shoes: list,
    outerwear: list,
    temperature: float | None,
    target_formality: str | None,
    context_snapshot: dict,
    db: Session,
    recently_worn_item_ids: frozenset[str] = frozenset(),
    recent_repeat_hashes: frozenset[str] = frozenset(),
    pinned_item_id: str | None = None,
    refined_from_run_id: str | None = None,
) -> schemas.RecommendationRunOut:
    """Builds and persists a new RecommendationRun + its 3 Outfit rows.

    Shared by /recommendations/today (fresh context) and /assistant/refine
    (reused, frozen context) - the only difference between those two callers
    is what they pass in here, not how a run gets built and saved.
    """
    candidates = recommender.build_outfit_candidates(
        tops,
        bottoms,
        shoes,
        outerwear,
        temperature,
        target_formality,
        count=3,
        recently_worn_item_ids=recently_worn_item_ids,
        recent_repeat_hashes=recent_repeat_hashes,
        pinned_item_id=pinned_item_id,
    )

    outfit_rows = []
    for candidate in candidates:
        outfit = models.Outfit(
            user_id=current_user.id,
            top_item_id=candidate["top_item_id"],
            bottom_item_id=candidate["bottom_item_id"],
            outerwear_item_id=candidate["outerwear_item_id"],
            shoe_item_id=candidate["shoe_item_id"],
            score=candidate["score"],
            explanation_tags=json.dumps(candidate["explanation_tags"]),
        )
        db.add(outfit)
        outfit_rows.append(outfit)
    db.flush()  # populate outfit ids before referencing them on the run

    run = models.RecommendationRun(
        user_id=current_user.id,
        context_snapshot=json.dumps(context_snapshot, default=str),
        main_outfit_id=outfit_rows[0].id,
        alt_1_outfit_id=outfit_rows[1].id,
        alt_2_outfit_id=outfit_rows[2].id,
        refined_from_run_id=refined_from_run_id,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    for outfit in outfit_rows:
        db.refresh(outfit)

    return schemas.RecommendationRunOut(
        id=run.id,
        context_snapshot=context_snapshot,
        main_outfit=outfit_out(outfit_rows[0], db),
        alt_outfit_1=outfit_out(outfit_rows[1], db),
        alt_outfit_2=outfit_out(outfit_rows[2], db),
        refined_from_run_id=run.refined_from_run_id,
        created_at=run.created_at,
    )


@router.post("/today", response_model=schemas.RecommendationRunOut, status_code=status.HTTP_201_CREATED)
def generate_recommendation(
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    active_items = (
        db.query(models.WardrobeItem)
        .filter(models.WardrobeItem.user_id == current_user.id, models.WardrobeItem.is_active.is_(True))
        .all()
    )
    tops = [i for i in active_items if i.category == "tops"]
    bottoms = [i for i in active_items if i.category == "bottoms"]
    shoes = [i for i in active_items if i.category == "shoes"]
    outerwear = [i for i in active_items if i.category == "outerwear"]

    if not tops or not bottoms or not shoes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add at least one top, one bottom, and one pair of shoes to get a recommendation",
        )

    weather = None
    if lat is not None and lon is not None:
        weather = resolve_weather(current_user.id, lat, lon, db)
    events = get_todays_events(current_user.id, db)
    routine_block = resolve_routine_block(current_user.id, db)

    temperature = weather["temperature"] if weather else None
    target_formality = recommender.resolve_target_formality([e.inferred_formality for e in events])

    recent_signals = resolve_recent_signals(current_user.id, db)

    context_snapshot = {
        "weather": weather,
        "event_count": len(events),
        "target_formality": target_formality,
        "routine_block": routine_block,
    }

    return persist_recommendation_run(
        current_user,
        tops,
        bottoms,
        shoes,
        outerwear,
        temperature,
        target_formality,
        context_snapshot,
        db,
        recently_worn_item_ids=frozenset(recent_signals["recently_worn_item_ids"]),
        recent_repeat_hashes=frozenset(recent_signals["recent_repeat_hashes"]),
    )


@router.post(
    "/{run_id}/feedback", response_model=schemas.OutfitFeedbackOut, status_code=status.HTTP_201_CREATED
)
def submit_feedback(
    run_id: str,
    payload: schemas.OutfitFeedbackRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = (
        db.query(models.RecommendationRun)
        .filter(models.RecommendationRun.id == run_id, models.RecommendationRun.user_id == current_user.id)
        .first()
    )
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation run not found")

    valid_outfit_ids = {run.main_outfit_id, run.alt_1_outfit_id, run.alt_2_outfit_id}
    if payload.outfit_id not in valid_outfit_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That outfit does not belong to this recommendation run",
        )

    outfit = db.query(models.Outfit).filter(models.Outfit.id == payload.outfit_id).first()
    repeat_group_hash = (
        recommender.compute_repeat_group_hash(
            outfit.top_item_id, outfit.bottom_item_id, outfit.outerwear_item_id, outfit.shoe_item_id
        )
        if outfit
        else None
    )

    history = models.OutfitHistory(
        user_id=current_user.id,
        outfit_id=payload.outfit_id,
        recommendation_run_id=run.id,
        feedback_code=payload.feedback_code,
        is_favorite=payload.is_favorite,
        worn_at=payload.worn_at,
        repeat_group_hash=repeat_group_hash,
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history
