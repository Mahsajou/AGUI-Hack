"""LangGraph entry for IdeaLens — parallel researcher/designer via `ideal_lens_run`."""

from __future__ import annotations

import os

from copilotkit import CopilotKitMiddleware
from dotenv import load_dotenv
from langchain.agents import create_agent

from src.idealens_llm import pick_chat_model
from src.idealens_prompts import IDEALENS_SYSTEM_PROMPT
from src.idealens_tools import ideal_lens_run
from src.timing import TimingMiddleware

load_dotenv()

timing = TimingMiddleware()
copilotkit = CopilotKitMiddleware()
middleware = [timing, copilotkit]


def _keys_effectively_missing() -> bool:
    gem = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    anth = (os.getenv("ANTHROPIC_API_KEY") or "").strip()
    gem_bad = (not gem) or gem.startswith("stub")
    anth_bad = (not anth) or anth.startswith("stub")
    return gem_bad and anth_bad


def _build_noop_graph(message: str):
    from langchain_core.messages import AIMessage
    from langgraph.graph import END, START, StateGraph
    from langgraph.graph.message import add_messages
    from typing_extensions import Annotated, TypedDict

    class _State(TypedDict):
        messages: Annotated[list, add_messages]

    def _respond(_state: _State) -> dict:
        return {"messages": [AIMessage(content=message, id="idealens-noop")]}

    g = StateGraph(_State)
    g.add_node("respond", _respond)
    g.add_edge(START, "respond")
    g.add_edge("respond", END)
    return g.compile()


if _keys_effectively_missing():
    graph = _build_noop_graph(
        "Set **GEMINI_API_KEY** or **ANTHROPIC_API_KEY** in `apps/agent/.env` "
        "to run IdeaLens. The dual-widget flow needs a model to call `ideal_lens_run` "
        "and the render tools; without keys the agent stays in this setup-only mode."
    )
    print(
        "[idealens] No LLM keys — noop graph (configure keys to enable IdeaLens).",
        flush=True,
    )
else:
    llm = pick_chat_model()
    graph = create_agent(
        model=llm,
        tools=[ideal_lens_run],
        system_prompt=IDEALENS_SYSTEM_PROMPT,
        middleware=middleware,
    )
    print("[idealens] IdeaLens graph loaded (agent id: idealens).", flush=True)

