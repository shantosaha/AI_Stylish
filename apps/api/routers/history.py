from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from outfit_serializers import outfit_out
from security import get_current_user

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=list[schemas.HistoryEntryOut])
def list_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.OutfitHistory)
        .filter(models.OutfitHistory.user_id == current_user.id)
        .order_by(models.OutfitHistory.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    entries = []
    for row in rows:
        outfit = db.query(models.Outfit).filter(models.Outfit.id == row.outfit_id).first()
        if not outfit:
            continue
        entries.append(
            schemas.HistoryEntryOut(
                id=row.id,
                outfit=outfit_out(outfit, db),
                recommendation_run_id=row.recommendation_run_id,
                feedback_code=row.feedback_code,
                is_favorite=row.is_favorite,
                worn_at=row.worn_at,
                created_at=row.created_at,
            )
        )
    return entries
