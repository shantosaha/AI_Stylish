"""Deterministic outfit preview composition (mannequin layout, wardrobe-item
collage over the user's own body photo) plus the graceful-degradation seam
for the enhancement-only realistic AI preview mode.

This is the seam described in IMPLEMENTATION_PLAN.md #8 (AI Provider
Router): mannequin/collage do real, local image compositing today; a cloud
realistic-preview provider can replace compose_realistic without touching
callers. Per CLAUDE.md, the deterministic collage is the guaranteed baseline
and realistic preview must degrade gracefully rather than ever being the
only path - the actual generation approach for `realistic` is explicitly
left open until Phase 9 (IMPLEMENTATION_PLAN.md #8), so this always reports
"not yet configured" instead of guessing at a provider integration.
"""

from pathlib import Path

from PIL import Image, ImageDraw

CANVAS_SIZE = (480, 640)
_BACKGROUND = (240, 240, 242, 255)
_SILHOUETTE = (210, 210, 215, 255)


def _open_item_image(path: str | None) -> Image.Image | None:
    if not path or not Path(path).exists():
        return None
    try:
        return Image.open(path).convert("RGBA")
    except Exception:
        return None


def _fit_into(img: Image.Image, box: tuple[int, int, int, int]) -> tuple[Image.Image, tuple[int, int]]:
    box_w, box_h = box[2] - box[0], box[3] - box[1]
    scaled = img.copy()
    scaled.thumbnail((box_w, box_h))
    offset_x = box[0] + (box_w - scaled.width) // 2
    offset_y = box[1] + (box_h - scaled.height) // 2
    return scaled, (offset_x, offset_y)


def _paste(canvas: Image.Image, img: Image.Image | None, box: tuple[int, int, int, int]) -> None:
    if img is None:
        return
    scaled, offset = _fit_into(img, box)
    canvas.paste(scaled, offset, scaled)


def compose_mannequin(item_paths: dict[str, str | None]) -> Image.Image:
    """Flat, schematic body-shaped layout - not a photorealistic render.
    Draws a simple silhouette, then places each garment photo over its body
    region (head deliberately omitted - no face implied)."""
    canvas = Image.new("RGBA", CANVAS_SIZE, _BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    w, h = CANVAS_SIZE

    draw.rounded_rectangle((w * 0.32, h * 0.12, w * 0.68, h * 0.52), radius=24, fill=_SILHOUETTE)
    draw.rounded_rectangle((w * 0.34, h * 0.52, w * 0.66, h * 0.88), radius=16, fill=_SILHOUETTE)

    torso_box = (int(w * 0.30), int(h * 0.10), int(w * 0.70), int(h * 0.50))
    legs_box = (int(w * 0.32), int(h * 0.50), int(w * 0.68), int(h * 0.82))
    feet_box = (int(w * 0.30), int(h * 0.82), int(w * 0.70), int(h * 0.96))

    _paste(canvas, _open_item_image(item_paths.get("outerwear")), torso_box)
    _paste(canvas, _open_item_image(item_paths.get("top")), torso_box)
    _paste(canvas, _open_item_image(item_paths.get("bottom")), legs_box)
    _paste(canvas, _open_item_image(item_paths.get("shoes")), feet_box)
    return canvas


def compose_collage(item_paths: dict[str, str | None], body_photo_path: str | None) -> Image.Image:
    """Flat-lay item photos arranged over the user's own body photo when one
    exists, or a neutral background otherwise - both are equally valid,
    deterministic outputs; a missing body photo never blocks the preview."""
    w, h = CANVAS_SIZE
    background = _open_item_image(body_photo_path)
    if background is not None:
        canvas = background.resize(CANVAS_SIZE).convert("RGBA")
        # darken slightly so the overlaid strip stays legible on any photo
        overlay = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 60))
        canvas = Image.alpha_composite(canvas, overlay)
    else:
        canvas = Image.new("RGBA", CANVAS_SIZE, _BACKGROUND)

    strip_top = int(h * 0.62)
    slots = [key for key in ("top", "outerwear", "bottom", "shoes") if item_paths.get(key)]
    if slots:
        slot_w = w // len(slots)
        for i, key in enumerate(slots):
            box = (i * slot_w + 8, strip_top, (i + 1) * slot_w - 8, h - 12)
            _paste(canvas, _open_item_image(item_paths.get(key)), box)
    return canvas


def compose_realistic() -> dict:
    """Enhancement-only mode. No cloud realistic-preview provider is wired
    yet - IMPLEMENTATION_PLAN.md #8 defers that decision to Phase 9. Always
    reports failed-with-reason rather than fabricating an image, so callers
    fall back to collage/mannequin per CLAUDE.md's degrade-gracefully rule."""
    return {
        "status": "failed",
        "local_uri": None,
        "metadata": {
            "reason": "Realistic AI preview is not yet available. Showing the collage preview instead."
        },
    }
