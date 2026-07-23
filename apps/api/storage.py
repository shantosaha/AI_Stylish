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


def save_wardrobe_image(user_id: str, item_id: str, filename: str, content: bytes) -> str:
    ext = Path(filename).suffix.lower() or ".jpg"
    safe_name = f"{uuid.uuid4()}{ext}"
    item_dir = MEDIA_ROOT / "wardrobe" / user_id / item_id
    item_dir.mkdir(parents=True, exist_ok=True)
    (item_dir / safe_name).write_bytes(content)
    return f"/media/wardrobe/{user_id}/{item_id}/{safe_name}"
