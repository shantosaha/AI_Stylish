import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from context import get_todays_events
from database import get_db
from event_classifier import classify_event
from security import get_current_user

router = APIRouter(prefix="/calendar-events", tags=["calendar-events"])


def _get_owned_event(event_id: str, current_user: models.User, db: Session) -> models.CalendarEvent:
    event = (
        db.query(models.CalendarEvent)
        .filter(models.CalendarEvent.id == event_id, models.CalendarEvent.user_id == current_user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar event not found")
    return event


@router.get("/today", response_model=list[schemas.CalendarEventOut])
def list_todays_events(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_todays_events(current_user.id, db)


@router.post("/sync", response_model=list[schemas.CalendarEventOut])
def sync_calendar_events(
    payload: schemas.CalendarEventSyncRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    results = []
    for incoming in payload.events:
        existing = None
        if incoming.external_id:
            existing = (
                db.query(models.CalendarEvent)
                .filter(
                    models.CalendarEvent.user_id == current_user.id,
                    models.CalendarEvent.external_id == incoming.external_id,
                )
                .first()
            )

        if existing:
            existing.title = incoming.title
            existing.start_ts = incoming.start_ts
            existing.end_ts = incoming.end_ts
            existing.location = incoming.location
            event = existing
        else:
            classification = classify_event(incoming.title)
            event = models.CalendarEvent(
                user_id=current_user.id,
                source=incoming.source,
                external_id=incoming.external_id,
                title=incoming.title,
                start_ts=incoming.start_ts,
                end_ts=incoming.end_ts,
                location=incoming.location,
                **classification,
            )
            db.add(event)
        results.append(event)

    db.commit()
    for event in results:
        db.refresh(event)
    return results


@router.put("/{event_id}", response_model=schemas.CalendarEventOut)
def update_event(
    event_id: str,
    payload: schemas.CalendarEventUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_owned_event(event_id, current_user, db)

    update_data = payload.model_dump(exclude_unset=True)
    corrections = json.loads(event.corrections or "{}")
    for field in ("inferred_event_type", "inferred_formality"):
        new_value = update_data.get(field)
        current_value = getattr(event, field)
        if new_value is not None and current_value is not None and new_value != current_value:
            corrections[field] = {"from": current_value, "to": new_value}
    event.corrections = json.dumps(corrections)

    for field, value in update_data.items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_owned_event(event_id, current_user, db)
    db.delete(event)
    db.commit()
