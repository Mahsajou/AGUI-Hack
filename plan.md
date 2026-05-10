# Generative UI Application — Build Plan

## Concept

A **standalone web application** where the user enters a **prompt** and receives **generative UI**—not a wall of text, but **rendered interface elements** (cards, flows, option tiles, previews) driven by structured agent output.

The user **chooses which agents participate** in a run (multi-select or toggles), for example:

| Agent | Role |
| --- | --- |
| **UX Researcher** | Deep **reasoning** over the prompt: assumptions, risks, open questions, and evidence-style framing. Output feeds **research-oriented UI blocks** (e.g. assumption map, question list). |
| **UX Designer** | Applies **guardrails from the live design system** exposed via **Figma MCP** (components, variables, patterns). Output feeds **design-oriented generative UI** that may only reference real tokens and components. |

**Final output:** **Generated UI** that includes **multiple selectable options** (e.g. concept directions, layout variants, or interaction patterns)—the user **picks one** (or more) to carry forward, export, or send to a downstream step.

**Design system source:** Figma is the source of truth for designer guardrails—via **Figma MCP** (and optionally REST/cache for performance). Until the design system is reachable and acknowledged, the **Designer** agent should surface **setup UI** or structured `setup_required` states, not ungrounded visual proposals.

> Why generative UI? The product is the **interface itself**—options, panels, and controls—so evaluation and iteration happen **in the UI**, not only in a chat transcript.

**See also:** [`researcher-agent.md`](researcher-agent.md), [`designer-agent.md`](designer-agent.md).

---

## Stack (target)

| Layer | Choice |
| --- | --- |
| Frontend | Next.js (App Router), React; render generative UI from **typed JSON** or **component registry** |
| API | Route Handlers or small backend service; optional **SSE** for streaming UI patches |
| Orchestration | LangGraph (Python) **or** coordinated server functions—parallel agent runs when multiple agents selected |
| Figma | **Figma MCP** (`https://mcp.figma.com/mcp` or hosted MCP) via **mcp-use** `MCPClient` from the **backend**; cache snapshots for latency |
| Models | Claude (Anthropic) recommended; Gemini acceptable |

**CopilotKit:** Optional for legacy demos in-repo; **not** required for this product vision.

---

## Architecture

```
User prompt + selected agents [Researcher] [Designer]
        │
        ▼
┌───────────────────────────────────────┐
│ Orchestrator                           │
│  · Runs only selected agents           │
│  · Merges / sequences outputs for UI   │
└───────────────────────────────────────┘
        │
        ├── Researcher (if selected)
        │     └── Reasoning → structured research payload → Generative UI (research blocks)
        │
        └── Designer (if selected)
              └── Figma MCP → guardrails (components/tokens)
              └── LLM constrained by MCP context
              └── N UI options (variants) → Generative UI (selectable options)

        ▼
Frontend: render registry maps payloads → React components;
          user selection state → “chosen option(s)” for export / next step
```

**Rules:**

- **Researcher** may run **without** Figma.
- **Designer** **must** use **Figma MCP-backed** context for guardrails when producing **grounded** UI; if unavailable, return **setup / degraded mode** (no fake component names).
- **Final screen** always presents **selectable options** when the designer (or a “variants” sub-step) produces more than one candidate.

---

## Generative UI contract

- **Input:** User prompt + `agents: string[]` + optional session/design-system handle.
- **Output envelope (illustrative):**
  - `generative_ui: { kind, payload }[]` — ordered blocks (research panel, design options strip, etc.).
  - `options: { id, label, description?, preview_payload? }[]` — **user-selectable** candidates; **selection_required** flag when appropriate.
- **Interaction:** Clicking an option updates client state and optionally triggers a **refinement** prompt (“tighten option B for mobile”).

---

## UI surfaces

1. **Composer** — Prompt input + **agent picker** (Researcher, Designer, …).
2. **Run / Generate** — Triggers orchestration; loading per agent.
3. **Canvas / results** — Renders generative UI blocks; **option grid** or carousel for designer outputs.
4. **Design system** — Connection to Figma MCP / token; health indicator for Designer.

---

## File structure (documentation + code alignment)

Product specs:

- [`plan.md`](plan.md) (this file)
- [`researcher-agent.md`](researcher-agent.md)
- [`designer-agent.md`](designer-agent.md)
- [`design.md`](design.md) — UX copy and flows (update as needed)

Current repo implementation (incremental):

```
apps/frontend/src/
├── app/workspace/ …              # prompt + analysis (evolve toward agent picker + generative UI)
├── app/design-system/setup/ …    # Figma connection
├── app/api/idealens/ …           # APIs to extend for MCP + multi-agent + options[]
└── components/idealens/ …      # extend to option-selectable generative components
```

---

## Build phases (indicative)

| Phase | Deliverable |
| --- | --- |
| 1 | Agent picker UI + API accepts `agents[]` |
| 2 | Researcher path → reasoning-heavy prompts + research generative UI |
| 3 | Designer path → **Figma MCP** in backend + guardrailed prompts + **options[]** in response |
| 4 | Generative UI registry: map payloads → components; selection state + persistence |
| 5 | Polish: SSE, errors, re-run with selected option as context |

---

## Demo script (2–3 min)

1. Enter a product **prompt** and select **UX Researcher** → show **generative research UI** (assumptions, questions).
2. Select **UX Designer** (and ensure Figma MCP / design system is connected) → show **generative UI** with **multiple options**.
3. User **clicks an option** → highlight choice; optional “Refine selection.”
4. Close: *“Reasoning from research; guardrails from Figma; the UI is the deliverable.”*

---

## Success criteria

| Criterion | How we hit it |
| --- | --- |
| Prompt → generative UI | Primary output is rendered UI, not chat |
| Selectable agents | User toggles Researcher / Designer (extensible list) |
| Researcher = reasoning | Structured skepticism, assumptions, risks |
| Designer = Figma MCP guardrails | No off-system components; MCP for live system |
| Selectable final options | Multiple UI variants; user picks one |

---

## What to cut if behind

- SSE streaming — ship full JSON response first.
- More than two agents — ship Researcher + Designer only.
- Many options — ship **2–3** variants max for demo.
