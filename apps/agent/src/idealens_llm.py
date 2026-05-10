"""Shared chat models for IdeaLens researcher + designer sub-agents."""

from __future__ import annotations

import os
import random
import time
from typing import Any, Type, TypeVar

from pydantic import BaseModel

from .gemini_config import gemini_chat_model_extra_kwargs

T = TypeVar("T", bound=BaseModel)


def _gemini():
    from langchain_google_genai import ChatGoogleGenerativeAI

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
    return ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        temperature=0.2,
        api_key=api_key or "stub",
        **gemini_chat_model_extra_kwargs(),
    )


def _claude():
    from langchain_anthropic import ChatAnthropic

    return ChatAnthropic(
        model="claude-sonnet-4-6",
        temperature=0.2,
        api_key=os.getenv("ANTHROPIC_API_KEY") or "stub",
    )


def pick_chat_model():
    """Prefer Claude when a real Anthropic key is set; else Gemini."""
    anth = (os.getenv("ANTHROPIC_API_KEY") or "").strip()
    if anth and not anth.startswith("stub"):
        return _claude()
    return _gemini()


def _is_retryable_rate_or_quota(exc: BaseException) -> bool:
    sc = getattr(exc, "status_code", None)
    if sc == 429:
        return True
    nm = type(exc).__name__
    if "ResourceExhausted" in nm or "TooManyRequests" in nm:
        return True
    low = str(exc).lower()
    if "429" in low or "resource exhausted" in low or "too many requests" in low:
        return True
    if "quota" in low and ("exceed" in low or "exhaust" in low):
        return True
    prev = getattr(exc, "__cause__", None)
    if isinstance(prev, BaseException):
        return _is_retryable_rate_or_quota(prev)
    ctx = getattr(exc, "context", None)
    return isinstance(ctx, BaseException) and _is_retryable_rate_or_quota(ctx)


def invoke_structured(model: Any, schema: Type[T], system: str, user: str) -> T:
    structured = model.with_structured_output(schema)
    from langchain_core.messages import HumanMessage, SystemMessage

    messages = [
        SystemMessage(content=system),
        HumanMessage(content=user),
    ]

    max_att = max(
        1,
        min(12, int(os.getenv("GEMINI_STRUCTURED_RETRY_MAX", "8") or "8")),
    )
    base_delay = float(os.getenv("GEMINI_STRUCTURED_RETRY_BASE_SEC", "2.25") or "2.25")

    delay = base_delay
    last: BaseException | None = None
    for attempt in range(max_att):
        try:
            msg = structured.invoke(messages)
            if isinstance(msg, schema):
                return msg
            if isinstance(msg, dict):
                return schema.model_validate(msg)
            raise TypeError(f"unexpected structured output type: {type(msg)}")
        except Exception as e:
            last = e
            if attempt >= max_att - 1 or not _is_retryable_rate_or_quota(e):
                raise
            time.sleep(delay + random.uniform(0, delay * 0.2))
            delay = min(delay * 1.85, 120.0)

    assert last is not None
    raise last
