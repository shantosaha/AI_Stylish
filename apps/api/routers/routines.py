from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import get_current_user

router = APIRouter(prefix="/routines", tags=["routines"])


@router.get("", response_model=list[schemas.RoutineOut])
def list_routines(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Routine)
        .filter(models.Routine.user_id == current_user.id)
        .order_by(models.Routine.created_at.desc())
        .all()
    )


@router.post("", response_model=schemas.RoutineOut, status_code=status.HTTP_201_CREATED)
def create_routine(
    payload: schemas.RoutineCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    routine = models.Routine(user_id=current_user.id, **payload.model_dump())
    db.add(routine)
    db.commit()
    db.refresh(routine)
    return routine


@router.delete("/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_routine(
    routine_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    routine = (
        db.query(models.Routine)
        .filter(models.Routine.id == routine_id, models.Routine.user_id == current_user.id)
        .first()
    )
    if not routine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found")
    db.delete(routine)
    db.commit()
