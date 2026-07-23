import json

from fastapi import APIRouter, Depends
from pydantic import ValidationError
from sqlalchemy.orm import Session

import models
import recommender
import schemas
from database import get_db
from security import get_current_user

router = APIRouter(prefix="/sync", tags=["sync"])


def _replay_wardrobe_item(item_in: schemas.SyncItemIn, current_user: models.User, db: Session) -> schemas.SyncItemResult:
    item = (
        db.query(models.WardrobeItem)
        .filter(models.WardrobeItem.id == item_in.object_id, models.WardrobeItem.user_id == current_user.id)
        .first()
    )
    if not item:
        return schemas.SyncItemResult(object_id=item_in.object_id, status="failed", detail="Item no longer exists")

    # Conflict rule (documents/03 #16): last-write-wins by timestamp, but
    # report it rather than silently overwriting a newer server value with a
    # stale offline edit - the queued edit is dropped, not force-applied.
    # (schemas.SyncItemIn normalizes client_queued_at to naive UTC already.)
    if item.updated_at and item.updated_at > item_in.client_queued_at:
        return schemas.SyncItemResult(
            object_id=item_in.object_id,
            status="failed",
            detail="Item was updated elsewhere since this edit was queued",
        )

    try:
        update = schemas.WardrobeItemUpdate(**item_in.payload)
    except ValidationError:
        return schemas.SyncItemResult(object_id=item_in.object_id, status="failed", detail="Invalid edit payload")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    return schemas.SyncItemResult(object_id=item_in.object_id, status="done")


def _replay_outfit_feedback(item_in: schemas.SyncItemIn, current_user: models.User, db: Session) -> schemas.SyncItemResult:
    try:
        feedback = schemas.OutfitFeedbackRequest(outfit_id=item_in.object_id, **item_in.payload)
    except ValidationError:
        return schemas.SyncItemResult(object_id=item_in.object_id, status="failed", detail="Invalid feedback payload")

    run_id = item_in.payload.get("run_id")
    run = (
        db.query(models.RecommendationRun)
        .filter(models.RecommendationRun.id == run_id, models.RecommendationRun.user_id == current_user.id)
        .first()
    )
    if not run:
        return schemas.SyncItemResult(
            object_id=item_in.object_id, status="failed", detail="Recommendation run no longer exists"
        )

    valid_outfit_ids = {run.main_outfit_id, run.alt_1_outfit_id, run.alt_2_outfit_id}
    if feedback.outfit_id not in valid_outfit_ids:
        return schemas.SyncItemResult(
            object_id=item_in.object_id, status="failed", detail="Outfit does not belong to this run"
        )

    outfit = db.query(models.Outfit).filter(models.Outfit.id == feedback.outfit_id).first()
    repeat_group_hash = (
        recommender.compute_repeat_group_hash(
            outfit.top_item_id, outfit.bottom_item_id, outfit.outerwear_item_id, outfit.shoe_item_id
        )
        if outfit
        else None
    )

    history = models.OutfitHistory(
        user_id=current_user.id,
        outfit_id=feedback.outfit_id,
        recommendation_run_id=run.id,
        feedback_code=feedback.feedback_code,
        is_favorite=feedback.is_favorite,
        worn_at=feedback.worn_at,
        repeat_group_hash=repeat_group_hash,
    )
    db.add(history)
    db.commit()
    return schemas.SyncItemResult(object_id=item_in.object_id, status="done")


@router.post("/replay", response_model=schemas.SyncReplayResponse)
def replay_sync_queue(
    payload: schemas.SyncReplayRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Applies a batch of mutations the client queued while offline.

    Every item is logged to sync_queue for audit regardless of outcome -
    this is the table's real purpose, not just a canonical-schema box to
    check. Each item is independent: one failure/conflict never blocks the
    rest of the batch.
    """
    results = []
    for item_in in payload.items:
        queue_row = models.SyncQueue(
            user_id=current_user.id,
            object_type=item_in.object_type,
            object_id=item_in.object_id,
            action=item_in.action,
            payload_json=json.dumps(item_in.payload, default=str),
            status="running",
        )
        db.add(queue_row)
        db.commit()
        db.refresh(queue_row)

        if item_in.object_type == "wardrobe_item":
            result = _replay_wardrobe_item(item_in, current_user, db)
        else:  # outfit_feedback
            result = _replay_outfit_feedback(item_in, current_user, db)

        queue_row.status = result.status
        queue_row.last_error = result.detail if result.status == "failed" else None
        if result.status == "failed":
            queue_row.retry_count += 1
        db.commit()

        results.append(result)

    return schemas.SyncReplayResponse(results=results)
