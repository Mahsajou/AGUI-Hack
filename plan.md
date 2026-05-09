# Generative UI Hackathon — Build Plan

## Concept

**IdeaLens** — A multi-agent tool that takes a raw product idea and surfaces it through two expert lenses simultaneously: a UX Researcher who stress-tests assumptions, and a UX Designer who sketches a concept constrained by your real design system. The output is two generative UI widgets rendered inline — not a document, not a chat reply — that become the agenda for the team's discussion.

> Would this have been impossible as a chatbot? Yes. A chatbot can't pull your live Figma design system, reason against it, and render two parallel expert perspectives as interactive UI in the same thread.

---

## Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js + CopilotKit v2 (from starter kit) |
| Agent protocol | AG-UI (CopilotKit) |
| Agent backend | LangGraph (Python) |
| MCP client | mcp-use MCPClient |
| MCP server | Figma MCP (`https://mcp.figma.com/mcp`) |
| Models | Claude (Anthropic) |

---

## Architecture

```
User pastes rough idea
        ↓
Orchestrator (LangGraph router — lightweight, ~10 lines)
    ↓                         ↓
Researcher Agent          Designer Agent
(pure LLM)                (LLM + mcp-use)
reasons from                  ↓
user input only           MCPClient → Figma MCP
    ↓                     fetches design system
AssumptionMap             (components, tokens, patterns)
Widget                        ↓
                          ConceptSketch Widget
                          (guardrailed by real components)
```

Both agents run in **parallel**. Each renders its own widget directly. No PM assembly step — the juxtaposition of the two widgets IS the brief.

---

## Agents

### 1. Researcher Agent
- **Type:** Pure LLM — no external tools
- **Input:** Raw idea text from user
- **Persona:** Senior UX researcher — skeptical, user-behavior focused
- **Output (JSON):**
  ```json
  {
    "assumptions": [
      { "text": "...", "confidence": "known | guessing | unknown" }
    ],
    "open_questions": ["...", "..."],
    "risk_flags": ["...", "..."]
  }
  ```
- **Renders:** `AssumptionMap` widget

### 2. Designer Agent
- **Type:** LLM + mcp-use MCPClient → Figma MCP
- **Input:** Raw idea text + Figma design system context
- **Persona:** Senior UX designer — pragmatic, systems-aware, builds within constraints
- **Steps:**
  1. Call Figma MCP via mcp-use to fetch component library + design tokens
  2. Generate concept constrained to real existing components
- **Output (JSON):**
  ```json
  {
    "concept_name": "...",
    "primary_surface": "...",
    "components_used": ["Card", "Modal", "..."],
    "user_flow": ["step 1", "step 2", "..."],
    "key_interactions": ["...", "..."],
    "open_design_questions": ["...", "..."]
  }
  ```
- **Renders:** `ConceptSketch` widget

---

## Generative UI Widgets

### `AssumptionMap.tsx`
- Cards grouped by confidence: **Known** / **Guessing** / **Unknown**
- Open questions listed below
- Risk flags highlighted in amber
- Interactive: user can flip/dismiss cards inline

### `ConceptSketch.tsx`
- Concept name + primary surface
- User flow as a step sequence
- Components used (pulled from real Figma library)
- Key interactions listed
- Open design questions at the bottom
- Interactive: user can select an alternative direction

### CopilotKit Wiring
```tsx
useCopilotAction({
  name: "render_assumption_map",
  render: ({ args }) => <AssumptionMap data={args} />
})

useCopilotAction({
  name: "render_concept_sketch",
  render: ({ args }) => <ConceptSketch data={args} />
})
```

---

## File Structure

```
apps/
├── app/                          # Next.js frontend (from starter kit)
│   └── components/
│       ├── AssumptionMap.tsx
│       └── ConceptSketch.tsx
└── agent/                        # LangGraph Python backend
    ├── orchestrator.py           # Router node — triggers both agents
    └── skills/
        ├── researcher_skill.py   # Pure LLM, UX researcher persona
        └── designer_skill.py     # LLM + mcp-use MCPClient → Figma
```

---

## Build Timeline (6 hours)

| Time | Task | Owner |
|---|---|---|
| 0:00 – 0:45 | Clone starter kit, `make dev` running, read existing skill structure | All |
| 0:45 – 1:15 | Write Researcher system prompt + JSON output schema | 1 person |
| 0:45 – 1:45 | Wire mcp-use MCPClient → Figma MCP, confirm it fetches design system | 1 person |
| 1:15 – 2:00 | Write Designer system prompt using Figma context as guardrail | 1 person |
| 2:00 – 3:00 | Build `AssumptionMap.tsx` widget | 1 person |
| 2:00 – 3:00 | Build `ConceptSketch.tsx` widget | 1 person |
| 3:00 – 3:30 | Write orchestrator routing node in LangGraph | 1 person |
| 3:30 – 4:30 | Wire `useCopilotAction` on frontend — connect agent output to widgets | 1 person |
| 4:30 – 5:15 | End-to-end test: paste idea → both widgets render | All |
| 5:15 – 5:45 | Polish widgets, tighten prompts, fix edge cases | All |
| 5:45 – 6:00 | Record demo, submit | All |

---

## Demo Script (2–3 min)

1. Open the app — one input field, no pre-built UI
2. Paste a raw idea: *"An async tool for product teams to align on new feature ideas before Figma"*
3. Both agents run in parallel — show the loading state
4. `AssumptionMap` widget renders: assumptions surface, color-coded by confidence
5. `ConceptSketch` widget renders: concept constrained to real Figma components
6. Point out: *"The designer didn't freestyle — it used our actual component library"*
7. Point out: *"The two widgets together are the discussion. No doc, no synthesis step."*

---

## What to Cut If Behind

- Widget interactivity (flip/dismiss cards) — render as static first, add interaction after
- Risk flags in AssumptionMap — ship with just assumptions + open questions
- Multiple concept directions in ConceptSketch — one concept is enough for the demo
- Figma MCP depth — if it's flaky, mock the design system as a static JSON for the demo, swap in real MCP before submission

---

## Judging Criteria Alignment

| Criterion | How we hit it |
|---|---|
| Could not be built as a chatbot | Two parallel expert widgets rendered from agent output — impossible as text |
| Uses a core protocol | AG-UI (CopilotKit) + mcp-use MCPClient → Figma MCP |
| Working prototype | End-to-end: paste idea → widgets render |
| Agentic interface | Agent decides what to surface and in what shape — interface is a function of the idea |
| Real-world utility | Product teams actually need this — the gap between raw idea and structured brief is a real pain |
