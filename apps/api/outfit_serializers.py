"""Shared Outfit -> OutfitOut expansion, used by every router that returns a
full outfit (recommendations, history, assistant) so item-slot-id lookups
aren't duplicated across them.
"""

import json

from sqlalchemy.orm import Session

import models
import schemas


def get_item(item_id: str | None, db: Session) -> models.WardrobeItem | None:
    if not item_id:
        return None
    return db.query(models.WardrobeItem).filter(models.WardrobeItem.id == item_id).first()


def outfit_out(outfit: models.Outfit, db: Session) -> schemas.OutfitOut:
    accessory_ids = json.loads(outfit.accessory_item_ids or "[]")
    accessories = (
        db.query(models.WardrobeItem).filter(models.WardrobeItem.id.in_(accessory_ids)).all()
        if accessory_ids
        else []
    )
    return schemas.OutfitOut(
        id=outfit.id,
        top=get_item(outfit.top_item_id, db),
        bottom=get_item(outfit.bottom_item_id, db),
        outerwear=get_item(outfit.outerwear_item_id, db),
        shoes=get_item(outfit.shoe_item_id, db),
        accessories=accessories,
        score=outfit.score,
        explanation_tags=json.loads(outfit.explanation_tags or "[]"),
        created_at=outfit.created_at,
    )
