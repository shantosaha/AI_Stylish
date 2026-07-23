"""AI Provider Router (Phase 9).

Every other seam in this codebase (analyzer.py, body_analyzer.py,
event_classifier.py, recommender.py, preview_generator.py) is a local,
zero-cost, zero-network heuristic - meaning "local_preferred" has always
been satisfied by construction. What was missing was an actual routing
decision and a real second provider to route to. This module is that decision
point: resolve_provider() reads the per-user processing_mode setting and
decides whether a cloud call should even be attempted, and
generate_cloud_explanation() is the one real cloud call in this codebase.

Config-gated on settings.anthropic_api_key, exactly like the graceful
degradation already used everywhere else in this app (Open-Meteo failures,
Phase 6's realistic-preview stub): cloud_preferred/auto fall back to "local"
cleanly when no key is configured, or if the call fails for any reason -
never a hard failure, never fabricated output. Adding a second cloud
provider later means adding one more branch to resolve_provider() and one
more generate_* function, without touching any caller.
"""

from typing import Literal

import httpx

from config import settings

Provider = Literal["local", "cloud"]

_ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages"
_ANTHROPIC_VERSION = "2023-06-01"


def is_cloud_available() -> bool:
    return bool(settings.anthropic_api_key)


def resolve_provider(processing_mode: str) -> Provider:
    """local_preferred always stays local, even if a cloud key is
    configured - the user's explicit choice wins. cloud_preferred and auto
    both prefer cloud when available, and both fall back to local rather
    than failing when it isn't - the guaranteed local path must never break."""
    if processing_mode == "local_preferred":
        return "local"
    return "cloud" if is_cloud_available() else "local"


def generate_cloud_explanation(outfit_summary: str, context_summary: str) -> str | None:
    """A short, natural-language styling note - richer than the
    deterministic explanation_tags, which stay the reliability backbone and
    are never replaced by this. Returns None on any failure (no key,
    network error, bad response) so callers can always fall back to the
    tag-based explanation without special-casing."""
    if not settings.anthropic_api_key:
        return None

    prompt = (
        "You are a men's style assistant. In one or two short, natural "
        "sentences, explain why this outfit works for today. Be specific "
        "and concrete, never generic filler. Do not use markdown.\n\n"
        f"Outfit: {outfit_summary}\n"
        f"Context: {context_summary}"
    )

    try:
        response = httpx.post(
            _ANTHROPIC_MESSAGES_URL,
            headers={
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": _ANTHROPIC_VERSION,
                "content-type": "application/json",
            },
            json={
                "model": settings.anthropic_model,
                "max_tokens": 150,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=10.0,
        )
        response.raise_for_status()
        content = response.json()["content"]
        text = "".join(block["text"] for block in content if block.get("type") == "text").strip()
        return text or None
    except (httpx.HTTPError, KeyError, ValueError, IndexError):
        return None
