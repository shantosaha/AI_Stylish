import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import recommender
import schemas
from assistant import parse_refinement, render_reply
from context import resolve_recent_signals
from database import get_db
from routers.recommendations import persist_recommendation_run
from security import get_current_user

router = APIRouter(prefix="/assistant", tags=["assistant"])

# Ordered by rank ascending (casual -> business -> formal), derived from
# recommender.FORMALITY_RANK so the two stay in lockstep automatically.
_FORMALITY_BY_RANK = sorted(recommender.FORMALITY_RANK, key=recommender.FORMALITY_RANK.get)


def _shift_formality(current: str | None, delta: int) -> str:
    # No signal for today (current=None) still needs *some* baseline to shift
    # from when the user explicitly asks for a formality change - casual (0)
    # is the honest floor, never a guessed "business" middle ground.
    base_rank = recommender.FORMALITY_RANK.get(current, 0)
    new_rank = max(0, min(len(_FORMALITY_BY_RANK) - 1, base_rank + delta))
    return _FORMALITY_BY_RANK[new_rank]


@router.post("/refine", response_model=schemas.AssistantRefineResponse)
def refine_recommendation(
    payload: schemas.AssistantRefineRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = (
        db.query(models.RecommendationRun)
        .filter(
            models.RecommendationRun.id == payload.run_id, models.RecommendationRun.user_id == current_user.id
        )
        .first()
    )
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation run not found")

    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == current_user.id).first()
    tone = profile.tone_preference if profile and profile.tone_preference else "practical"

    active_items = (
        db.query(models.WardrobeItem)
        .filter(models.WardrobeItem.user_id == current_user.id, models.WardrobeItem.is_active.is_(True))
        .all()
    )

    directive = parse_refinement(payload.message, active_items)

    if not directive["understood"]:
        return schemas.AssistantRefineResponse(reply=render_reply(tone, directive), understood=False, run=None)

    if directive["explain_only"]:
        main_outfit = db.query(models.Outfit).filter(models.Outfit.id == run.main_outfit_id).first()
        tags = json.loads(main_outfit.explanation_tags or "[]") if main_outfit else []
        summary = "; ".join(tags) if tags else None
        return schemas.AssistantRefineResponse(
            reply=render_reply(tone, directive, outfit_summary=summary), understood=True, run=None
        )

    # Reuse the ORIGINAL run's frozen context - no re-fetch of live weather or
    # calendar data. This is deliberate: it's what "re-ranks without losing
    # context" means. The accepted v1 trade-off is that a refinement issued
    # long after the original run won't pick up a genuine weather change for
    # directives that don't touch temperature - full context refresh is what
    # POST /recommendations/today is for; this endpoint is same-session only.
    context_snapshot = json.loads(run.context_snapshot or "{}")
    weather = context_snapshot.get("weather")
    temperature = weather["temperature"] if weather else None
    if directive["temperature_delta_c"] is not None and temperature is not None:
        temperature += directive["temperature_delta_c"]

    target_formality = context_snapshot.get("target_formality")
    if directive["formality_delta"]:
        target_formality = _shift_formality(target_formality, directive["formality_delta"])

    tops = [i for i in active_items if i.category == "tops"]
    bottoms = [i for i in active_items if i.category == "bottoms"]
    shoes = [i for i in active_items if i.category == "shoes"]
    outerwear = [i for i in active_items if i.category == "outerwear"]

    # Recency signals were never part of context_snapshot - they're a cheap
    # separate read every time, not frozen context.
    recent_signals = resolve_recent_signals(current_user.id, db)

    new_run = persist_recommendation_run(
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
        pinned_item_id=directive["preferred_item_id"],
        refined_from_run_id=run.id,
    )

    return schemas.AssistantRefineResponse(reply=render_reply(tone, directive), understood=True, run=new_run)
