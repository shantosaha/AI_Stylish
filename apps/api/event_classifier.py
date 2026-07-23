"""Calendar event type/formality inference.

Same seam pattern as analyzer.py/body_analyzer.py: a single function the API
calls to get a low-confidence proposal for an event's type and formality from
its title. Today it's keyword matching; a real NLP/LLM classifier can replace
the body of classify_event without changing callers. Every field is stored as
a normal editable column - never presented as final; users can always
override via PUT /calendar-events/{id}.
"""

_EVENT_TYPE_KEYWORDS: dict[str, list[str]] = {
    "business": ["meeting", "call", "interview", "client", "standup", "presentation"],
    "fitness": ["gym", "run", "workout", "yoga", "training"],
    "social": ["dinner", "party", "drinks", "date"],
    "formal": ["wedding", "gala", "ceremony", "funeral"],
    "travel": ["flight", "airport", "train"],
}
_EVENT_TYPE_FORMALITY: dict[str, str] = {
    "business": "business",
    "fitness": "casual",
    "social": "casual",
    "formal": "formal",
    "travel": "casual",
}
_DEFAULT_EVENT_TYPE = "general"
_DEFAULT_FORMALITY = "casual"


def classify_event(title: str) -> dict:
    lowered = title.lower()
    for event_type, keywords in _EVENT_TYPE_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return {
                "inferred_event_type": event_type,
                "inferred_formality": _EVENT_TYPE_FORMALITY[event_type],
            }
    return {
        "inferred_event_type": _DEFAULT_EVENT_TYPE,
        "inferred_formality": _DEFAULT_FORMALITY,
    }
