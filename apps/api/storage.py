"""Local-disk media storage for the dev/self-hosted baseline.

Swaps out for Supabase Storage (the cloud sync path from IMPLEMENTATION_PLAN.md
#3) without touching callers, since they only depend on save/resolve returning
a servable URL, not on the filesystem layout.
"""

import uuid
from pathlib import Path

MEDIA_ROOT = Path(__file__).parent / "media"
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def _save_image(namespace: str, sub_path: str, filename: str, content: bytes) -> str:
    ext = Path(filename).suffix.lower() or ".jpg"
    safe_name = f"{uuid.uuid4()}{ext}"
    target_dir = MEDIA_ROOT / namespace / sub_path
    target_dir.mkdir(parents=True, exist_ok=True)
    (target_dir / safe_name).write_bytes(content)
    return f"/media/{namespace}/{sub_path}/{safe_name}"


def save_wardrobe_image(user_id: str, item_id: str, filename: str, content: bytes) -> str:
    return _save_image("wardrobe", f"{user_id}/{item_id}", filename, content)


def save_body_image(user_id: str, filename: str, content: bytes) -> str:
    return _save_image("body", user_id, filename, content)


def save_preview_image(user_id: str, outfit_id: str, preview_type: str, content: bytes) -> str:
    return _save_image("previews", f"{user_id}/{outfit_id}", f"{preview_type}.png", content)
