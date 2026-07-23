"""Outfit recommendation engine.

Hard filtering -> candidate generation -> rule-based scoring, per
IMPLEMENTATION_PLAN.md #8: rules are the reliability backbone for v1, not a
pure-ML ranking path. Every score is paired with plain-language
explanation_tags so recommendations stay auditable, not a black box.

This is the seam pattern used throughout the codebase (analyzer.py,
body_analyzer.py, event_classifier.py, weather.py): plain functions
returning structured data, swappable/extendable later (e.g. a learned
per-user preference weight in Phase 7) without changing callers.
"""

FORMALITY_RANK = {"casual": 0, "business": 1, "formal": 2}
COLD_THRESHOLD_C = 18.0


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


def score_item(item, temperature: float | None, target_formality: str | None) -> tuple[float, list[str]]:
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

    return score, tags


def _rank_items(items: list, temperature: float | None, target_formality: str | None) -> list[tuple]:
    scored = [(item, *score_item(item, temperature, target_formality)) for item in items]
    scored.sort(key=lambda entry: entry[1], reverse=True)
    return scored


def build_outfit_candidates(
    tops: list,
    bottoms: list,
    shoes: list,
    outerwear: list,
    temperature: float | None,
    target_formality: str | None,
    count: int = 3,
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
    """
    if not tops or not bottoms or not shoes:
        return []

    ranked_tops = _rank_items(tops, temperature, target_formality)
    ranked_bottoms = _rank_items(bottoms, temperature, target_formality)
    ranked_shoes = _rank_items(shoes, temperature, target_formality)
    ranked_outerwear = _rank_items(outerwear, temperature, target_formality) if outerwear else []
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
        candidates.append(
            {
                "top_item_id": top.id,
                "bottom_item_id": bottom.id,
                "shoe_item_id": shoe.id,
                "outerwear_item_id": outerwear_item.id if outerwear_item else None,
                "score": top_score + bottom_score + shoe_score + outerwear_score,
                "explanation_tags": tags,
            }
        )

    return candidates
