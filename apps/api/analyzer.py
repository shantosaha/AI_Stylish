"""Wardrobe item auto-tagging.

This is the seam described in IMPLEMENTATION_PLAN.md #8 (AI Provider Router):
a single function the API calls to get a tag proposal for a wardrobe photo.
Today it's a local heuristic (real dominant-color detection, a placeholder
category guess); local/cloud ML providers can replace the body of
analyze_wardrobe_image without changing callers, per the processing_mode
contract (auto / local_preferred / cloud_preferred).

Every field this returns is a low-confidence proposal, never a final value -
callers must store it as a normal editable field so the user can correct it.
"""

from PIL import Image

_PALETTE = {
    "black": (20, 20, 20),
    "white": (245, 245, 245),
    "gray": (128, 128, 128),
    "red": (200, 30, 30),
    "blue": (30, 60, 180),
    "navy": (20, 30, 80),
    "green": (40, 120, 60),
    "yellow": (220, 200, 40),
    "brown": (120, 80, 50),
    "beige": (210, 190, 150),
    "pink": (230, 150, 180),
    "orange": (220, 120, 40),
}

# Placeholder guess used until a real classifier is wired in; always returned
# with low confidence so the correction UI treats it as needs-review.
_DEFAULT_CATEGORY = "tops"
_DEFAULT_CATEGORY_CONFIDENCE = 0.2


def _closest_color_name(rgb: tuple[int, int, int]) -> str:
    def distance(candidate: tuple[int, int, int]) -> int:
        return sum((a - b) ** 2 for a, b in zip(rgb, candidate))

    return min(_PALETTE, key=lambda name: distance(_PALETTE[name]))


def analyze_wardrobe_image(image_path: str) -> dict:
    detected_color = None
    try:
        with Image.open(image_path) as img:
            small = img.convert("RGB").resize((32, 32))
            pixels = list(small.getdata())
            avg = tuple(sum(p[i] for p in pixels) // len(pixels) for i in range(3))
            detected_color = _closest_color_name(avg)
    except Exception:
        pass

    return {
        "detected_category": _DEFAULT_CATEGORY,
        "confidence": _DEFAULT_CATEGORY_CONFIDENCE,
        "detected_color": detected_color,
        "detected_pattern": None,
        "detected_material": None,
        "detected_brand": None,
    }
