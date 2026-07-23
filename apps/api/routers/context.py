from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import models
import schemas
from context import get_todays_events, resolve_routine_block, resolve_weather
from database import get_db
from security import get_current_user

router = APIRouter(prefix="/context", tags=["context"])


@router.get("/today", response_model=schemas.ContextTodayOut)
def get_context_today(
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    weather_out = None
    if lat is not None and lon is not None:
        weather_out = resolve_weather(current_user.id, lat, lon, db)

    events = get_todays_events(current_user.id, db)
    routine_block = resolve_routine_block(current_user.id, db)

    return schemas.ContextTodayOut(
        timestamp=datetime.utcnow(),
        weather=weather_out,
        events=events,
        routine_block=routine_block,
        location_provided=lat is not None and lon is not None,
    )
