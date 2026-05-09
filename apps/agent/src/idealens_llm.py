"""Shared chat models for IdeaLens parallel sub-agents."""

from __future__ import annotations

import os
from typing import Any, Type, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


def _gemini():
    from langchain_google_genai import ChatGoogleGenerativeAI

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
    return ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        temperature=0.2,
        api_key=api_key or "stub",
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


def invoke_structured(model: Any, schema: Type[T], system: str, user: str) -> T:
    structured = model.with_structured_output(schema)
    from langchain_core.messages import HumanMessage, SystemMessage

    msg = structured.invoke(
        [
            SystemMessage(content=system),
            HumanMessage(content=user),
        ]
    )
    if isinstance(msg, schema):
        return msg
    if isinstance(msg, dict):
        return schema.model_validate(msg)
    raise TypeError(f"unexpected structured output type: {type(msg)}")
