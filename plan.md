# IdeaLens — Standalone Web Product Build Plan

## Concept

**IdeaLens** is a **standalone web application** (no CopilotKit, no embedded chat runtime). It helps product teams turn a raw idea into a **structured dual lens**: UX **research** (assumptions, risks, open questions) and UX **design** (a concept sketch **grounded in their real Figma design system**).

The experience is **first-party UI**: dedicated screens, loading states, and in-page panels—not a generic assistant shell.

**Design-system gate (required):** The **design agent** does **not** invent UI from a blank slate. It **prompts the user to set up the design system from Figma** (connection, file/library scope, confirmation of what was indexed) **before** it will treat implementation prompts as actionable. Until setup is complete, the designer responds with **setup guidance and validation**, not final concept output.

> Why not a chatbot-only product? The value is **persistent workspace state** (idea → research panel → design panel → Figma link-in), **explicit Figma onboarding**, and **typed structured outputs** rendered as product UI—not a transcript.

---

## Stack (target)

| Layer | Choice |
| --- | --- |
| Frontend | Next.js (App Router), React, first-party layout and state (e.g. Zustand or React context) |
| API | Next.js Route Handlers **or** small Node/Hono service — REST or SSE for long runs |
| Agent / orchestration | LangGraph (Python) **or** single orchestrated service — team picks one; plan assumes **Python LangGraph** for parity with MCP tooling |
| Figma | Official **Figma REST API** and/or **Figma MCP** (`https://mcp.figma.com/mcp`) via **mcp-use** `MCPClient` from the backend |
| Models | Claude (Anthropic) recommended; Gemini acceptable for cost |

**Explicit non-goals:** CopilotKit, AG-UI sidebar, `useFrontendTool` / generative-UI tool wiring, Copilot Cloud / Intelligence threads as the primary UX.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Standalone Next.js app                       │
│  ┌──────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ Design system │  │ Idea workspace  │  │ Research + Design   │ │
│  │ setup (Figma) │→ │ (paste idea)    │→ │ panels (JSON → UI)  │ │
│  └──────────────┘  └─────────────────┘  └─────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend (LangGraph or orchestrator service)                      │
│                                                                  │
│  1) DesignSystemAgent — until Figma config valid:                │
│       "Ask user to connect Figma / pick file / confirm tokens"   │
│     After valid:                                                 │
│       sync + cache components/tokens (versioned snapshot)        │
│                                                                  │
│  2) ResearcherAgent — on user idea (no Figma required)           │
│                                                                  │
│  3) DesignerAgent — on user idea + ONLY if snapshot exists:      │
│       concept constrained to components in snapshot              │
│                                                                  │
│  (2) and (3) may run in parallel once gate passes for (3).      │
└─────────────────────────────────────────────────────────────────┘
```

**Gate rule:** `DesignerAgent` **must** check `design_system_status === "ready"` (or equivalent). If not, return a **structured "setup_required"** payload the frontend maps to the Figma setup wizard—not a concept sketch.

---

## Agents

### 1. Design system agent (Figma gatekeeper)

- **Role:** Walk the user through **setting up the design system from Figma** before design outputs are trusted.
- **Behaviors:**
  - Explain what will be pulled (components, variables/tokens, key pages/libraries as configured).
  - Ask for **missing inputs**: e.g. Figma file URL or file key, OAuth token handling (server-side only), optional node/library scope.
  - After fetch: **summarize** what was captured (component names count, token families) and ask user to **confirm** or adjust scope.
  - On success: persist a **versioned snapshot** (Postgres/JSON blob/S3 — implementation detail) keyed by workspace or user.
- **Output:** Machine-readable `design_system_setup` events: `prompting` | `fetching` | `awaiting_confirm` | `ready` | `error`.

### 2. Researcher agent

- **Type:** Pure LLM (no Figma).
- **Input:** Raw idea text.
- **Persona:** Senior UX researcher — skeptical, behavior-focused.
- **Output (JSON):** same shape as before (`assumptions`, `open_questions`, `risk_flags`).
- **UI:** `AssumptionMap` panel (plain React; data from API).

### 3. Designer agent

- **Type:** LLM + **cached Figma snapshot** (from gatekeeper); optional live MCP refresh on explicit user action.
- **Input:** Raw idea + **only** components/tokens present in snapshot.
- **Persona:** Senior UX designer — pragmatic, systems-aware.
- **Precondition:** If no snapshot → **do not** produce `ConceptSketch`; return `setup_required` with copy for the user.
- **Output (JSON):** `concept_name`, `primary_surface`, `components_used[]`, `user_flow[]`, `key_interactions[]`, `open_design_questions[]`.
- **UI:** `ConceptSketch` panel (plain React; data from API).

---

## UI surfaces (standalone)

### Pages / major views

1. **Home / workspace** — single place to paste or edit the current idea; run analysis.
2. **Design system setup** — dedicated flow (wizard or side panel): Figma connection → scope → preview → confirm. This is where the **design agent’s prompts** live in product copy (questions, errors, success).
3. **Results** — two columns or stacked sections: **Assumption map** + **Concept sketch** (disabled or placeholder with CTA until Figma ready).

### Components

- **`AssumptionMap`** — confidence groups, open questions, risk flags; interactive optional.
- **`ConceptSketch`** — concept summary, flow, components used (must match snapshot), open design questions.

**Data flow:** Frontend calls `POST /api/.../analyze` (or similar); backend returns JSON; React renders. Optional **SSE** for streamed partial JSON or status lines.

---

## File structure (this repo)

```
apps/frontend/src/
├── app/
│   ├── page.tsx                    → redirect to /workspace
│   ├── workspace/page.tsx          → standalone IdeaLens workspace
│   ├── design-system/setup/page.tsx
│   ├── idealens/page.tsx           → redirect to /workspace (legacy URL)
│   ├── leads/                      → CopilotKit lead triage (nested layout)
│   │   ├── layout.tsx              → CopilotKitProviderShell
│   │   └── page.tsx
│   └── api/idealens/
│       ├── analyze/route.ts
│       ├── design-system/route.ts  → GET status, DELETE reset
│       └── figma/
│           ├── preview/route.ts
│           └── confirm/route.ts
├── components/idealens/
│   ├── AssumptionMap.tsx
│   └── ConceptSketch.tsx
└── lib/idealens/
    ├── types.ts
    ├── snapshot-store.ts           → in-memory design snapshot (dev)
    ├── figma-sync.ts               → Figma REST file fetch
    └── agents.ts                   → researcher + designer LLM calls
```

Optional: remove legacy `apps/agent/idealens_*` CopilotKit graph when fully migrated.

---

## Build timeline (indicative)

| Phase | Task |
| --- | --- |
| Foundation | Strip or bypass CopilotKit shell; one routed app with layout + env-based API URL |
| Figma gate | Design system setup UI + backend sync + snapshot store + `design_system_status` |
| Agents | Researcher JSON; designer JSON gated on snapshot; orchestration + parallel run when allowed |
| UI | Wire `AssumptionMap` / `ConceptSketch` to API responses; loading and error states |
| Hardening | Token refresh, snapshot versioning, “re-sync Figma” action |

---

## Demo script (2–3 min)

1. Open the **standalone** app — clear workspace, no chat chrome.
2. Paste an idea — show **research** panel populating (or loading then populated).
3. Attempt **design** — designer **asks for Figma setup** (or shows incomplete setup); walk through **connect + scope + confirm**.
4. Re-run or continue — **concept sketch** appears with **only** components from the synced library.
5. Close: *“Design didn’t run until the system knew our Figma library; research didn’t need it.”*

---

## What to cut if behind

- Live MCP on every request — **cache snapshot**, refresh on button.
- Full OAuth — start with **personal access token** in server env for hackathon, upgrade to OAuth later.
- Parallel researcher + designer before gate — ship **sequential**: gate first, then parallel.

---

## Success criteria

| Criterion | How we hit it |
| --- | --- |
| Standalone product | No CopilotKit; app is usable as a normal web product |
| Figma-grounded design | Designer outputs reference **only** snapshot components/tokens |
| Design agent asks for setup | Explicit **setup_required** path and dedicated **Figma setup** UX |
| Working prototype | Idea → research UI; Figma setup → design UI |
| Clear utility | Teams align on assumptions + system-bound concept before high-fidelity design |
