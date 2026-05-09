"""IdeaLens backend tool — parallel researcher + designer (LLM) in one call."""

from __future__ import annotations

import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Annotated, Literal

from langchain_core.tools import tool
from pydantic import BaseModel, Field

from .idealens_figma_context import load_design_system_context
from .idealens_llm import invoke_structured, pick_chat_model


class AssumptionItem(BaseModel):
    text: str = Field(description="One explicit assumption about users or product")
    confidence: Literal["known", "guessing", "unknown"]


class AssumptionMapPayload(BaseModel):
    assumptions: list[AssumptionItem] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)
    risk_flags: list[str] = Field(default_factory=list)


class ConceptSketchPayload(BaseModel):
    concept_name: str = ""
    primary_surface: str = ""
    components_used: list[str] = Field(default_factory=list)
    user_flow: list[str] = Field(default_factory=list)
    key_interactions: list[str] = Field(default_factory=list)
    open_design_questions: list[str] = Field(default_factory=list)


def _fallback_bundle(idea: str) -> dict:
    """Deterministic demo payload when no LLM keys are configured."""
    snippet = (idea or "").strip()[:120] or "(empty idea)"
    return {
        "assumption_map": {
            "assumptions": [
                {"text": "Users will discover this through existing workflows", "confidence": "guessing"},
                {"text": "The problem is painful enough to adopt a new tool", "confidence": "unknown"},
                {"text": "Teams already align async today using docs + chat", "confidence": "known"},
            ],
            "open_questions": [
                "Who is the first user persona?",
                "What triggers someone to try this the first time?",
            ],
            "risk_flags": [
                "Scope creep: trying to replace Figma + Notion + Slack at once",
            ],
        },
        "concept_sketch": {
            "concept_name": "IdeaLens preview",
            "primary_surface": "Single-page capture → dual expert widgets",
            "components_used": ["Card", "Tabs", "Button", "Modal"],
            "user_flow": [
                "Paste raw idea",
                "See researcher + designer widgets inline",
                "Discuss in meeting using widgets as agenda",
            ],
            "key_interactions": [
                "Dismiss or flip assumption cards",
                "Pick an alternate concept direction (when enabled)",
            ],
            "open_design_questions": [
                "How much of this lives in chat vs. a dedicated canvas?",
                f"Your idea excerpt: {snippet}",
            ],
        },
    }


def _run_researcher(idea: str) -> AssumptionMapPayload:
    model = pick_chat_model()
    sys = (
        "You are a senior UX researcher. Be skeptical and behavior-focused. "
        "Output strictly matches the schema — no markdown."
    )
    user = (
        f"Product idea to stress-test:\n\n{idea}\n\n"
        "Surface hidden assumptions (with confidence), open questions, and risk flags."
    )
    return invoke_structured(model, AssumptionMapPayload, sys, user)


def _run_designer(idea: str, figma_ctx: str) -> ConceptSketchPayload:
    model = pick_chat_model()
    sys = (
        "You are a senior UX designer. Propose ONE pragmatic concept. "
        "You MUST only name UI components that appear in the design system context below. "
        "If the list is short, stay within it; do not invent fantasy component names.\n\n"
        f"{figma_ctx}"
    )
    user = (
        f"Product idea to conceptualize:\n\n{idea}\n\n"
        "Return a concept sketch: name, primary surface, components_used from the library, "
        "user_flow steps, key interactions, open_design_questions."
    )
    return invoke_structured(model, ConceptSketchPayload, sys, user)


def _keys_effectively_missing() -> bool:
    gem = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    anth = (os.getenv("ANTHROPIC_API_KEY") or "").strip()
    gem_bad = (not gem) or gem.startswith("stub")
    anth_bad = (not anth) or anth.startswith("stub")
    return gem_bad and anth_bad


@tool
def ideal_lens_run(
    idea: Annotated[str, "Verbatim product idea text from the user."],
) -> str:
    """Run IdeaLens researcher + designer in parallel on the server.

    Returns a JSON string with keys `assumption_map` and `concept_sketch`
    for the orchestrator to forward into the two frontend render tools.
    """
    if _keys_effectively_missing():
        return json.dumps(_fallback_bundle(idea))

    figma_ctx = load_design_system_context()
    assumption_map: AssumptionMapPayload | None = None
    concept_sketch: ConceptSketchPayload | None = None
    errs: list[str] = []

    def _safe_research() -> AssumptionMapPayload:
        return _run_researcher(idea)

    def _safe_design() -> ConceptSketchPayload:
        return _run_designer(idea, figma_ctx)

    with ThreadPoolExecutor(max_workers=2) as pool:
        fut_r = pool.submit(_safe_research)
        fut_d = pool.submit(_safe_design)
        labels = {fut_r: "researcher", fut_d: "designer"}
        for fut in as_completed([fut_r, fut_d]):
            label = labels[fut]
            try:
                res = fut.result()
                if label == "researcher":
                    assumption_map = res
                else:
                    concept_sketch = res
            except Exception as e:  # noqa: BLE001
                errs.append(f"{label} failed: {e}")

    fb = _fallback_bundle(idea)
    if assumption_map is None:
        assumption_map = AssumptionMapPayload.model_validate(fb["assumption_map"])
    if concept_sketch is None:
        concept_sketch = ConceptSketchPayload.model_validate(fb["concept_sketch"])

    am = assumption_map
    cs = concept_sketch
    out = {
        "assumption_map": am.model_dump(),
        "concept_sketch": cs.model_dump(),
    }
    if errs:
        out["partial_error"] = "; ".join(errs)
    return json.dumps(out)
