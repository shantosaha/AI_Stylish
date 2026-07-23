"""Outfit recommendation engine.

Hard filtering -> candidate generation -> rule-based scoring, per
IMPLEMENTATION_PLAN.md #8: rules are the reliability backbone for v1, not a
pure-ML ranking path. Every score is paired with plain-language
explanation_tags so recommendations stay auditable, not a black box.

This is the seam pattern used throughout the codebase (analyzer.py,
body_analyzer.py, event_classifier.py, weather.py): plain functions
returning structured data, swappable/extendable later (e.g. a learned
per-user preference weight) without changing callers.
"""

import hashlib

FORMALITY_RANK = {"casual": 0, "business": 1, "formal": 2}
COLD_THRESHOLD_C = 18.0

# Phase 7 repeat-avoidance: soft nudges on top of the 0.2-0.5 scale above,
# never hard exclusions - a small wardrobe must still always produce main + 2
# alternatives.
RECENTLY_WORN_PENALTY = 0.25
REPEAT_COMBO_PENALTY = 0.5


def resolve_target_formality(event_formalities: list[str | None]) -> str | None:
    """Highest-formality event today, or None if no events have formality data.

    None (rather than a fabricated "casual" default) means no formality signal
    exists for today - callers should skip formality scoring entirely rather
    than penalizing items against a guessed target.
    """
    ranked = [f for f in event_formalities if f in FORMALITY_RANK]
    if not ranked:
        return None
    return max(ranked, key=lambda f: FORMALITY_RANK[f])


def score_item(
    item,
    temperature: float | None,
    target_formality: str | None,
    recently_worn_item_ids: frozenset[str] = frozenset(),
) -> tuple[float, list[str]]:
    """Scores a single wardrobe item against today's context.

    Returns (score, explanation_tags). Base score is 1.0; every adjustment is
    a small, explainable nudge, never a hard exclusion - a small/imperfect
    wardrobe must still always produce a recommendation.
    """
    score = 1.0
    tags: list[str] = []

    if item.category == "outerwear" and temperature is not None:
        if temperature < COLD_THRESHOLD_C:
            score += 0.5
            tags.append(f"Good for today's {round(temperature)}°C weather")
        else:
            score -= 0.3

    if item.formality and target_formality:
        distance = abs(FORMALITY_RANK[item.formality] - FORMALITY_RANK[target_formality])
        if distance == 0:
            score += 0.4
            tags.append(f"Matches today's {target_formality} dress code")
        else:
            score -= 0.2 * distance

    if item.id in recently_worn_item_ids:
        score -= RECENTLY_WORN_PENALTY

    return score, tags


def _rank_items(
    items: list,
    temperature: float | None,
    target_formality: str | None,
    recently_worn_item_ids: frozenset[str] = frozenset(),
) -> list[tuple]:
    scored = [
        (item, *score_item(item, temperature, target_formality, recently_worn_item_ids)) for item in items
    ]
    scored.sort(key=lambda entry: entry[1], reverse=True)
    return scored


def _pin_preferred(ranked: list[tuple], preferred_item_id: str | None) -> list[tuple]:
    """Moves the entry whose item id matches preferred_item_id to the front,
    so chat's "use <item>" directive always lands it in the top outfit."""
    if not preferred_item_id:
        return ranked
    for i, entry in enumerate(ranked):
        if entry[0].id == preferred_item_id:
            return [entry] + ranked[:i] + ranked[i + 1 :]
    return ranked


def compute_repeat_group_hash(
    top_item_id: str | None,
    bottom_item_id: str | None,
    outerwear_item_id: str | None,
    shoe_item_id: str | None,
) -> str:
    """Order-independent hash of an outfit's item-slot ids - the same set of
    items always hashes the same way regardless of slot order, so repeat
    detection works even if candidate generation reorders slots later."""
    ids = sorted(i for i in (top_item_id, bottom_item_id, outerwear_item_id, shoe_item_id) if i)
    return hashlib.sha256("|".join(ids).encode()).hexdigest()


def build_outfit_candidates(
    tops: list,
    bottoms: list,
    shoes: list,
    outerwear: list,
    temperature: float | None,
    target_formality: str | None,
    count: int = 3,
    recently_worn_item_ids: frozenset[str] = frozenset(),
    recent_repeat_hashes: frozenset[str] = frozenset(),
    pinned_item_id: str | None = None,
) -> list[dict]:
    """Builds up to `count` distinct outfit candidates.

    Uses a deterministic "diagonal" pairing (rank-1 top with rank-1 bottom
    with rank-1 shoes, then rank-2 with rank-2, ...) rather than scoring every
    top/bottom/shoe combination - cheap regardless of wardrobe size, and
    naturally produces increasingly-lower-scored alternatives. If a slot has
    fewer than `count` items, the best item repeats rather than the run
    failing - a small wardrobe must still always produce main + 2 alternatives.

    Accessories (bags/jewelry) are intentionally not selected here; that's
    deferred past the guaranteed-baseline phase.

    `recently_worn_item_ids`/`recent_repeat_hashes` (Phase 7 repeat-avoidance)
    and `pinned_item_id` (chat "use <item>" support) are optional and default
    to no-ops, so every existing caller keeps working unchanged.
    """
    if not tops or not bottoms or not shoes:
        return []

    ranked_tops = _pin_preferred(_rank_items(tops, temperature, target_formality, recently_worn_item_ids), pinned_item_id)
    ranked_bottoms = _pin_preferred(
        _rank_items(bottoms, temperature, target_formality, recently_worn_item_ids), pinned_item_id
    )
    ranked_shoes = _pin_preferred(
        _rank_items(shoes, temperature, target_formality, recently_worn_item_ids), pinned_item_id
    )
    ranked_outerwear = (
        _pin_preferred(_rank_items(outerwear, temperature, target_formality, recently_worn_item_ids), pinned_item_id)
        if outerwear
        else []
    )
    wants_outerwear = temperature is not None and temperature < COLD_THRESHOLD_C

    candidates = []
    for i in range(count):
        top, top_score, top_tags = ranked_tops[min(i, len(ranked_tops) - 1)]
        bottom, bottom_score, bottom_tags = ranked_bottoms[min(i, len(ranked_bottoms) - 1)]
        shoe, shoe_score, shoe_tags = ranked_shoes[min(i, len(ranked_shoes) - 1)]

        outerwear_item = None
        outerwear_score = 0.0
        outerwear_tags: list[str] = []
        if ranked_outerwear and wants_outerwear:
            outerwear_item, outerwear_score, outerwear_tags = ranked_outerwear[min(i, len(ranked_outerwear) - 1)]

        tags = list(dict.fromkeys(top_tags + bottom_tags + shoe_tags + outerwear_tags))
        total_score = top_score + bottom_score + shoe_score + outerwear_score

        combo_hash = compute_repeat_group_hash(
            top.id, bottom.id, outerwear_item.id if outerwear_item else None, shoe.id
        )
        if combo_hash in recent_repeat_hashes:
            total_score -= REPEAT_COMBO_PENALTY
            tags.append("You wore this exact combo recently")

        candidates.append(
            {
                "top_item_id": top.id,
                "bottom_item_id": bottom.id,
                "shoe_item_id": shoe.id,
                "outerwear_item_id": outerwear_item.id if outerwear_item else None,
                "score": total_score,
                "explanation_tags": tags,
            }
        )

    return candidates
