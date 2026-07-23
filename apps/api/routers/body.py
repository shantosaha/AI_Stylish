import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

import models
import schemas
from body_analyzer import analyze_body_image
from database import get_db
from security import get_current_user
from storage import ALLOWED_CONTENT_TYPES, MAX_UPLOAD_BYTES, MEDIA_ROOT, save_body_image

router = APIRouter(tags=["body"])

MAX_BODY_IMAGES = 6


def _analysis_out(model: models.BodyAnalysisResult) -> schemas.BodyAnalysisOut:
    return schemas.BodyAnalysisOut(
        id=model.id,
        body_shape=model.body_shape,
        skin_tone=model.skin_tone,
        face_shape=model.face_shape,
        height=model.height,
        proportions=json.loads(model.proportions or "{}"),
        confidence=model.confidence,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


@router.get("/body-images", response_model=list[schemas.BodyImageOut])
def list_body_images(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.BodyImage)
        .filter(models.BodyImage.user_id == current_user.id)
        .order_by(models.BodyImage.created_at)
        .all()
    )


@router.post("/body-images", response_model=schemas.BodyImageOut, status_code=status.HTTP_201_CREATED)
async def upload_body_image(
    image: UploadFile = File(...),
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

    existing_count = (
        db.query(models.BodyImage).filter(models.BodyImage.user_id == current_user.id).count()
    )
    if existing_count >= MAX_BODY_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You can only have up to {MAX_BODY_IMAGES} body photos. Delete one first.",
        )

    image_url = save_body_image(current_user.id, image.filename or "photo.jpg", content)
    body_image = models.BodyImage(
        user_id=current_user.id,
        image_url=image_url,
        is_primary=(existing_count == 0),
    )
    db.add(body_image)
    db.commit()
    db.refresh(body_image)
    return body_image


@router.delete("/body-images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_body_image(
    image_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    image = (
        db.query(models.BodyImage)
        .filter(models.BodyImage.id == image_id, models.BodyImage.user_id == current_user.id)
        .first()
    )
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Body image not found")

    was_primary = image.is_primary
    db.delete(image)
    db.flush()

    if was_primary:
        next_image = (
            db.query(models.BodyImage)
            .filter(models.BodyImage.user_id == current_user.id)
            .order_by(models.BodyImage.created_at)
            .first()
        )
        if next_image:
            next_image.is_primary = True

    db.commit()


@router.get("/body-analysis", response_model=schemas.BodyAnalysisOut)
def get_body_analysis(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = (
        db.query(models.BodyAnalysisResult)
        .filter(models.BodyAnalysisResult.user_id == current_user.id)
        .first()
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No body analysis yet")
    return _analysis_out(result)


@router.post("/body-analysis/run", response_model=schemas.BodyAnalysisOut)
def run_body_analysis(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    primary_image = (
        db.query(models.BodyImage)
        .filter(models.BodyImage.user_id == current_user.id, models.BodyImage.is_primary.is_(True))
        .first()
    )
    if not primary_image:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a body photo first")

    detected = analyze_body_image(str(MEDIA_ROOT / primary_image.image_url.removeprefix("/media/")))

    result = (
        db.query(models.BodyAnalysisResult)
        .filter(models.BodyAnalysisResult.user_id == current_user.id)
        .first()
    )
    if result:
        result.body_shape = detected["body_shape"]
        result.skin_tone = detected["skin_tone"]
        result.face_shape = detected["face_shape"]
        result.height = detected["height"]
        result.proportions = json.dumps(detected["proportions"])
        result.confidence = detected["confidence"]
        result.corrections = "{}"
    else:
        result = models.BodyAnalysisResult(
            user_id=current_user.id,
            body_shape=detected["body_shape"],
            skin_tone=detected["skin_tone"],
            face_shape=detected["face_shape"],
            height=detected["height"],
            proportions=json.dumps(detected["proportions"]),
            confidence=detected["confidence"],
        )
        db.add(result)

    db.commit()
    db.refresh(result)
    return _analysis_out(result)


@router.put("/body-analysis", response_model=schemas.BodyAnalysisOut)
def update_body_analysis(
    payload: schemas.BodyAnalysisUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = (
        db.query(models.BodyAnalysisResult)
        .filter(models.BodyAnalysisResult.user_id == current_user.id)
        .first()
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No body analysis yet")

    update_data = payload.model_dump(exclude_unset=True)
    corrections = json.loads(result.corrections or "{}")
    detected_fields = {"body_shape", "skin_tone", "face_shape", "height"}
    for field in detected_fields:
        new_value = update_data.get(field)
        current_value = getattr(result, field)
        if new_value is not None and current_value is not None and new_value != current_value:
            corrections[field] = {"from": current_value, "to": new_value}
    result.corrections = json.dumps(corrections)

    for field, value in update_data.items():
        setattr(result, field, value)

    db.commit()
    db.refresh(result)
    return _analysis_out(result)
