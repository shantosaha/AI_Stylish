import io
import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from preview_generator import compose_collage, compose_mannequin, compose_realistic
from security import get_current_user
from storage import MEDIA_ROOT, save_preview_image

router = APIRouter(prefix="/preview", tags=["preview"])


def _get_owned_outfit(outfit_id: str, current_user: models.User, db: Session) -> models.Outfit:
    outfit = (
        db.query(models.Outfit)
        .filter(models.Outfit.id == outfit_id, models.Outfit.user_id == current_user.id)
        .first()
    )
    if not outfit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit not found")
    return outfit


def _media_path(image_url: str | None) -> str | None:
    if not image_url:
        return None
    return str(MEDIA_ROOT / image_url.removeprefix("/media/"))


def _item_image_path(item_id: str | None, db: Session) -> str | None:
    if not item_id:
        return None
    image = (
        db.query(models.WardrobeImage)
        .filter(models.WardrobeImage.wardrobe_item_id == item_id, models.WardrobeImage.is_primary.is_(True))
        .first()
    )
    return _media_path(image.image_url if image else None)


def _asset_out(asset: models.PreviewAsset) -> schemas.PreviewAssetOut:
    return schemas.PreviewAssetOut(
        id=asset.id,
        outfit_id=asset.outfit_id,
        preview_type=asset.preview_type,
        local_uri=asset.local_uri,
        status=asset.status,
        metadata=json.loads(asset.metadata_json or "{}"),
        created_at=asset.created_at,
    )


@router.get("/{outfit_id}", response_model=list[schemas.PreviewAssetOut])
def list_previews(
    outfit_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    outfit = _get_owned_outfit(outfit_id, current_user, db)
    assets = (
        db.query(models.PreviewAsset)
        .filter(models.PreviewAsset.outfit_id == outfit.id)
        .order_by(models.PreviewAsset.created_at.desc())
        .all()
    )
    return [_asset_out(a) for a in assets]


@router.post("/generate", response_model=schemas.PreviewAssetOut, status_code=status.HTTP_201_CREATED)
def generate_preview(
    payload: schemas.PreviewGenerateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    outfit = _get_owned_outfit(payload.outfit_id, current_user, db)

    if not payload.force_refresh:
        existing = (
            db.query(models.PreviewAsset)
            .filter(
                models.PreviewAsset.outfit_id == outfit.id,
                models.PreviewAsset.preview_type == payload.preview_type,
                models.PreviewAsset.status == "ready",
            )
            .order_by(models.PreviewAsset.created_at.desc())
            .first()
        )
        if existing:
            return _asset_out(existing)

    if payload.preview_type == "combined_card":
        # No server-side compositing needed - the client renders the item
        # photos it already has. A row still gets created so preview-mode
        # switching has one uniform status contract across all 4 types.
        result: dict = {"status": "ready", "local_uri": None, "metadata": {}}

    elif payload.preview_type == "realistic":
        result = compose_realistic()

    else:
        item_paths = {
            "top": _item_image_path(outfit.top_item_id, db),
            "bottom": _item_image_path(outfit.bottom_item_id, db),
            "outerwear": _item_image_path(outfit.outerwear_item_id, db),
            "shoes": _item_image_path(outfit.shoe_item_id, db),
        }
        if payload.preview_type == "mannequin":
            image = compose_mannequin(item_paths)
        else:  # collage
            body_image = (
                db.query(models.BodyImage)
                .filter(models.BodyImage.user_id == current_user.id, models.BodyImage.is_primary.is_(True))
                .first()
            )
            image = compose_collage(item_paths, _media_path(body_image.image_url if body_image else None))

        buffer = io.BytesIO()
        image.convert("RGB").save(buffer, format="PNG")
        local_uri = save_preview_image(current_user.id, outfit.id, payload.preview_type, buffer.getvalue())
        result = {"status": "ready", "local_uri": local_uri, "metadata": {}}

    asset = models.PreviewAsset(
        outfit_id=outfit.id,
        preview_type=payload.preview_type,
        local_uri=result.get("local_uri"),
        status=result["status"],
        metadata_json=json.dumps(result.get("metadata", {})),
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return _asset_out(asset)
