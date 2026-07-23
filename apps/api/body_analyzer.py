"""Body profile auto-analysis.

Same seam as analyzer.py (wardrobe auto-tagging): a single function the API
calls to get a body-trait proposal from a photo. Local heuristic today,
swappable for a real local/cloud model later without changing callers.

Every field is a low-confidence proposal stored in a normal editable column -
never presented as final. Fields with no honest heuristic available (height,
proportions) are left null rather than fabricated; a plausible-looking
guessed number would be worse than no guess.

Deliberately does not do face recognition or any identity-linked biometric
processing - only coarse, non-identifying pixel color sampling. Full
biometric-data handling (regulatory categorization, retention policy) is
tracked as an open item in IMPLEMENTATION_PLAN.md #11 and is out of scope
for this MVP heuristic.
"""

from PIL import Image

_SKIN_TONE_PALETTE = {
    "fair": (245, 220, 195),
    "light": (230, 190, 155),
    "medium": (195, 150, 110),
    "tan": (160, 110, 75),
    "deep": (95, 65, 45),
}

# Placeholder guesses used until a real body/pose model is wired in; always
# low confidence so the correction UI treats them as needs-review.
_DEFAULT_BODY_SHAPE = "average"
_DEFAULT_FACE_SHAPE = "oval"
_DEFAULT_CONFIDENCE = 0.15


def _closest_skin_tone(rgb: tuple[int, int, int]) -> str:
    def distance(candidate: tuple[int, int, int]) -> int:
        return sum((a - b) ** 2 for a, b in zip(rgb, candidate))

    return min(_SKIN_TONE_PALETTE, key=lambda name: distance(_SKIN_TONE_PALETTE[name]))


def analyze_body_image(image_path: str) -> dict:
    skin_tone = None
    try:
        with Image.open(image_path) as img:
            width, height = img.convert("RGB").size
            # Sample the upper-center region as a coarse stand-in for a face/skin patch.
            box = (width * 3 // 8, height // 12, width * 5 // 8, height // 4)
            patch = img.convert("RGB").crop(box)
            pixels = list(patch.getdata())
            if pixels:
                avg = tuple(sum(p[i] for p in pixels) // len(pixels) for i in range(3))
                skin_tone = _closest_skin_tone(avg)
    except Exception:
        pass

    return {
        "body_shape": _DEFAULT_BODY_SHAPE,
        "skin_tone": skin_tone,
        "face_shape": _DEFAULT_FACE_SHAPE,
        "height": None,
        "proportions": {},
        "confidence": _DEFAULT_CONFIDENCE,
    }
