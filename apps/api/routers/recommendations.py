import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

import models
import schemas
from context import get_todays_events, resolve_routine_block, resolve_weather
from database import get_db
from recommender import build_outfit_candidates, resolve_target_formality
from security import get_current_user

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _get_item(item_id: str | None, db: Session) -> models.WardrobeItem | None:
    if not item_id:
        return None
    return db.query(models.WardrobeItem).filter(models.WardrobeItem.id == item_id).first()


def _outfit_out(outfit: models.Outfit, db: Session) -> schemas.OutfitOut:
    accessory_ids = json.loads(outfit.accessory_item_ids or "[]")
    accessories = [
        item
        for item in (
            db.query(models.WardrobeItem).filter(models.WardrobeItem.id.in_(accessory_ids)).all()
            if accessory_ids
            else []
        )
    ]
    return schemas.OutfitOut(
        id=outfit.id,
        top=_get_item(outfit.top_item_id, db),
        bottom=_get_item(outfit.bottom_item_id, db),
        outerwear=_get_item(outfit.outerwear_item_id, db),
        shoes=_get_item(outfit.shoe_item_id, db),
        accessories=accessories,
        score=outfit.score,
        explanation_tags=json.loads(outfit.explanation_tags or "[]"),
        created_at=outfit.created_at,
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
    target_formality = resolve_target_formality([e.inferred_formality for e in events])

    candidates = build_outfit_candidates(tops, bottoms, shoes, outerwear, temperature, target_formality, count=3)

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

    context_snapshot = {
        "weather": weather,
        "event_count": len(events),
        "target_formality": target_formality,
        "routine_block": routine_block,
    }
    run = models.RecommendationRun(
        user_id=current_user.id,
        context_snapshot=json.dumps(context_snapshot, default=str),
        main_outfit_id=outfit_rows[0].id,
        alt_1_outfit_id=outfit_rows[1].id,
        alt_2_outfit_id=outfit_rows[2].id,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    for outfit in outfit_rows:
        db.refresh(outfit)

    return schemas.RecommendationRunOut(
        id=run.id,
        context_snapshot=context_snapshot,
        main_outfit=_outfit_out(outfit_rows[0], db),
        alt_outfit_1=_outfit_out(outfit_rows[1], db),
        alt_outfit_2=_outfit_out(outfit_rows[2], db),
        created_at=run.created_at,
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

    history = models.OutfitHistory(
        user_id=current_user.id,
        outfit_id=payload.outfit_id,
        recommendation_run_id=run.id,
        feedback_code=payload.feedback_code,
        is_favorite=payload.is_favorite,
        worn_at=payload.worn_at,
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history
