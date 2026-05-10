"""Shared Gemini / ChatGoogleGenerativeAI options (rate shaping, retries)."""

from __future__ import annotations

import os
from typing import Any


def optional_gemini_rate_limiter():
    """In-process RPS throttle when GEMINI_RATE_LIMIT_RPS is a positive float (e.g. 0.35)."""

    raw = (os.getenv("GEMINI_RATE_LIMIT_RPS") or "").strip()
    if not raw:
        return None
    try:
        rps = float(raw)
    except ValueError:
        return None
    if rps <= 0:
        return None
    from langchain_core.rate_limiters import InMemoryRateLimiter

    return InMemoryRateLimiter(requests_per_second=rps, max_bucket_size=2)


def gemini_chat_model_extra_kwargs() -> dict[str, Any]:
    out: dict[str, Any] = {}
    rl = optional_gemini_rate_limiter()
    if rl is not None:
        out["rate_limiter"] = rl
    r = (os.getenv("GEMINI_LC_RETRIES") or "").strip()
    if r.isdigit():
        out["retries"] = max(1, min(24, int(r)))
    return out
