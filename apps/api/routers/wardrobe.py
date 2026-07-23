import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

import models
import schemas
from analyzer import analyze_wardrobe_image
from database import get_db
from security import get_current_user
from storage import ALLOWED_CONTENT_TYPES, MAX_UPLOAD_BYTES, MEDIA_ROOT, save_wardrobe_image

router = APIRouter(prefix="/wardrobe", tags=["wardrobe"])


def _get_owned_item(item_id: str, current_user: models.User, db: Session) -> models.WardrobeItem:
    item = (
        db.query(models.WardrobeItem)
        .filter(models.WardrobeItem.id == item_id, models.WardrobeItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wardrobe item not found")
    return item


@router.get("/items", response_model=list[schemas.WardrobeItemOut])
def list_items(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.WardrobeItem)
        .filter(models.WardrobeItem.user_id == current_user.id, models.WardrobeItem.is_active.is_(True))
        .order_by(models.WardrobeItem.created_at.desc())
        .all()
    )


@router.post("/items", response_model=schemas.WardrobeItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(
    image: UploadFile = File(...),
    name: str | None = Form(None),
    category: schemas.WardrobeCategory | None = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Image must be JPEG, PNG, or WebP",
        )
    content = await image.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image too large")

    item = models.WardrobeItem(
        user_id=current_user.id,
        category=category or "tops",
        name=name or "New item",
    )
    db.add(item)
    db.flush()  # populate item.id before saving the file / analysis row

    image_url = save_wardrobe_image(current_user.id, item.id, image.filename or "photo.jpg", content)
    db.add(models.WardrobeImage(wardrobe_item_id=item.id, image_url=image_url, is_primary=True))

    result = analyze_wardrobe_image(str(MEDIA_ROOT / image_url.removeprefix("/media/")))
    db.add(models.ItemAnalysisResult(wardrobe_item_id=item.id, **result))

    if category is None:
        item.category = result["detected_category"]
    if result["detected_color"] is not None:
        item.color = result["detected_color"]
    if name is None:
        item.name = f"New {item.category.capitalize()}"

    db.commit()
    db.refresh(item)
    return item


@router.get("/items/{item_id}", response_model=schemas.WardrobeItemOut)
def get_item(
    item_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_owned_item(item_id, current_user, db)


@router.put("/items/{item_id}", response_model=schemas.WardrobeItemOut)
def update_item(
    item_id: str,
    payload: schemas.WardrobeItemUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _get_owned_item(item_id, current_user, db)

    update_data = payload.model_dump(exclude_unset=True)
    if item.analysis:
        corrections = json.loads(item.analysis.corrections or "{}")
        for field in ("category", "color"):
            detected_field = f"detected_{field}"
            new_value = update_data.get(field)
            detected_value = getattr(item.analysis, detected_field)
            if new_value is not None and detected_value is not None and new_value != detected_value:
                corrections[field] = {"from": detected_value, "to": new_value}
        item.analysis.corrections = json.dumps(corrections)

    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _get_owned_item(item_id, current_user, db)
    db.delete(item)
    db.commit()


@router.post("/items/{item_id}/analyze", response_model=schemas.WardrobeItemOut)
def analyze_item(
    item_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _get_owned_item(item_id, current_user, db)
    primary_image = next((img for img in item.images if img.is_primary), None)
    if not primary_image:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Item has no image to analyze")

    result = analyze_wardrobe_image(str(MEDIA_ROOT / primary_image.image_url.removeprefix("/media/")))
    if item.analysis:
        for field, value in result.items():
            setattr(item.analysis, field, value)
    else:
        db.add(models.ItemAnalysisResult(wardrobe_item_id=item.id, **result))

    db.commit()
    db.refresh(item)
    return item
