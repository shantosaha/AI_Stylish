"""Chat-refinement seam for the Assistant screen (Phase 7).

No canonical schema/endpoint exists for this in documents/04 - it's designed
fresh here, following the same "AI Provider Router" seam pattern as
analyzer.py/body_analyzer.py/event_classifier.py: plain keyword-matching
functions returning structured, low-confidence, never-fabricated directives.
If a message isn't recognized, parse_refinement says so (understood=False)
rather than guessing at a change to apply.

Deliberately scoped to keyword matching only - no NLU model, no fuzzy
matching across multiple directives in one message (the first recognized
category wins; "use <item>" takes priority over warmer/cooler/formality if
present, and "explain"/"why" takes priority over everything else).
"""

import re

TEMPERATURE_NUDGE_C = 6.0

_EXPLAIN_KEYWORDS = ("explain", "why")
_USE_PATTERN = re.compile(r"\b(?:use|wear)\s+(.+)", re.IGNORECASE)
_MORE_FORMAL_KEYWORDS = ("more formal", "dressier", "formal")
_MORE_CASUAL_KEYWORDS = ("more casual", "casual", "relaxed")
_WARMER_KEYWORDS = ("warmer", "warm")
_COOLER_KEYWORDS = ("cooler", "cool", "colder", "cold")


def parse_refinement(message: str, wardrobe_items: list) -> dict:
    """Returns a structured directive:
    {"understood": bool, "temperature_delta_c": float|None, "formality_delta": int|None,
     "preferred_item_id": str|None, "explain_only": bool, "unmatched_item_query": str|None}

    temperature_delta_c is an adjustment to the EFFECTIVE temperature used for
    scoring, not a claim about real weather - "make it warmer" means "prefer
    warmer clothing," which the scorer achieves by biasing toward a colder
    effective temperature (recommender.score_item favors outerwear below
    COLD_THRESHOLD_C), so warmer-clothing requests use a NEGATIVE delta.
    """
    text = message.strip().lower()
    directive: dict = {
        "understood": False,
        "temperature_delta_c": None,
        "formality_delta": None,
        "preferred_item_id": None,
        "explain_only": False,
        "unmatched_item_query": None,
    }

    if any(keyword in text for keyword in _EXPLAIN_KEYWORDS):
        directive["understood"] = True
        directive["explain_only"] = True
        return directive

    use_match = _USE_PATTERN.search(text)
    if use_match:
        query = use_match.group(1).strip().strip(".!?")
        matches = [item for item in wardrobe_items if query and query in item.name.lower()]
        if len(matches) == 1:
            directive["understood"] = True
            directive["preferred_item_id"] = matches[0].id
        else:
            directive["unmatched_item_query"] = query
        return directive

    if any(keyword in text for keyword in _MORE_FORMAL_KEYWORDS):
        directive["formality_delta"] = 1
        directive["understood"] = True
    elif any(keyword in text for keyword in _MORE_CASUAL_KEYWORDS):
        directive["formality_delta"] = -1
        directive["understood"] = True

    if any(keyword in text for keyword in _WARMER_KEYWORDS):
        directive["temperature_delta_c"] = -TEMPERATURE_NUDGE_C
        directive["understood"] = True
    elif any(keyword in text for keyword in _COOLER_KEYWORDS):
        directive["temperature_delta_c"] = TEMPERATURE_NUDGE_C
        directive["understood"] = True

    return directive


def render_reply(tone: str, directive: dict, outfit_summary: str | None = None) -> str:
    """Tone-templated reply string. Tone changes phrasing only - never the
    content, logic, or scoring of what actually happened."""
    if not directive["understood"]:
        if directive.get("unmatched_item_query"):
            base = f'I couldn\'t find "{directive["unmatched_item_query"]}" in your wardrobe.'
        else:
            base = 'I didn\'t catch a specific change - try "make it warmer", "more formal", or "use <item name>".'
        return f"No worries! {base}" if tone == "encouraging" else base

    if directive["explain_only"]:
        base = outfit_summary or "No specific weather or formality factors drove this pick."
        if tone == "encouraging":
            return f"Happy to explain! {base}"
        if tone == "direct":
            return base
        return f"Here's why: {base}"

    parts = []
    if directive["temperature_delta_c"] is not None:
        parts.append("warmer" if directive["temperature_delta_c"] < 0 else "cooler")
    if directive["formality_delta"]:
        parts.append("more formal" if directive["formality_delta"] > 0 else "more casual")
    change_desc = " and ".join(parts) if parts else None

    if change_desc and directive["preferred_item_id"]:
        summary = f"a {change_desc} option built around the item you asked for"
    elif directive["preferred_item_id"]:
        summary = "an option built around the item you asked for"
    elif change_desc:
        summary = f"a {change_desc} alternative"
    else:
        summary = "an adjusted alternative"

    if tone == "encouraging":
        return f"Great idea! Here's {summary}."
    if tone == "direct":
        return f"Updated: here's {summary}."
    return f"Here's {summary}."
