# IdeaLens — Product & UX Design (Standalone, Figma-first)

This document describes **what users see and do** in the standalone web product. It complements `plan.md` (engineering scope). Implementation should match these flows unless explicitly revised.

---

## Design principles

1. **Product, not assistant** — The UI reads like a **workspace** (Notion-linear, Linear-ish density), not a chat app. Primary actions are buttons and forms; any “agent” language is secondary helper copy.
2. **Figma before fantasy** — The **design agent never pretends** it knows your library until **you** complete design-system setup. Empty or generic UI is avoided: show **clear next steps**.
3. **Parallel mental models** — **Research** and **design** are two **panels** of equal weight once both are available. Before Figma is ready, the design panel shows a **setup state**, not a broken sketch.

---

## Personas & jobs

| Persona | Job to be done |
| --- | --- |
| PM / lead | Paste a messy idea; get something **discussion-ready** with the team |
| Designer | Ensure concepts **only use real components** from their file/library |
| Researcher (hat) | Stress-test assumptions **without** needing design files |

---

## Information architecture

```
/workspace                     (primary workspace)
├── Primary: idea input + “Analyze” (or auto-save)
├── Region A: Research panel (Assumption map)
├── Region B: Design panel (Concept sketch OR Figma setup)
└── Global: “Design system” entry (badge: Not connected / Syncing / Ready)

/design-system/setup  (optional dedicated route; can be modal wizard instead)
├── Step 1: Why Figma + what we pull
├── Step 2: Connect (token / OAuth per engineering)
├── Step 3: Choose file or library scope
├── Step 4: Preview summary (counts, sample names)
└── Step 5: Confirm → status Ready
```

**Deep link:** Users may land on workspace first; Region B always explains how to reach setup if `status !== ready`.

---

## Design system setup (core UX)

### Purpose

Train the product on **your** components and tokens so the **design agent** can implement **user prompts** (idea descriptions, refinement instructions) **only** within that system.

### Copy tone (design agent)

- **Before connection:** Direct, short questions: *“Which Figma file contains your UI kit?”* *“Paste your file link or file key.”* Avoid apologizing; offer **one primary path** and a **link to docs** for token scopes.
- **During sync:** Progress: *“Pulling components and variables…”* with **cancel** if long-running.
- **After sync:** *“We found 42 components and 3 token groups. Does this match your design system?”* **Confirm** / **Change scope**.
- **On error:** Actionable: *“We couldn’t read that file. Check sharing permissions or your token.”*

### UI components

| Element | Behavior |
| --- | --- |
| Status badge | `Not connected` · `Syncing…` · `Ready` · `Error` (with tooltip) |
| Setup CTA | Opens wizard or side sheet; primary button |
| Preview list | Collapsible: sample component names (first 10) + “+ N more” |
| Re-sync | Secondary control; warns if idea analysis might change |

### Empty / gate states (Design panel)

1. **`Not connected`** — Illustration or icon; headline *“Connect Figma to unlock design concepts”*; primary CTA **Set up design system**; secondary *“Why we need this”* (expandable).
2. **`Syncing`** — Determinate or indeterminate progress; no concept sketch skeleton (avoid fake content).
3. **`Awaiting confirm`** — Summary card + Confirm / Edit scope.
4. **`Ready`** — Show **Concept sketch**; show *“Design system: [file name] · Synced [relative time]”* with Re-sync.

---

## Workspace (idea flow)

### Idea input

- Large text area; placeholder with **one example idea** (same as demo script).
- **Analyze** triggers researcher always; triggers designer **only** if design system is `Ready` (otherwise design panel stays in gate state and optionally the backend returns `setup_required` without blocking research).

### Research panel (`AssumptionMap`)

- Section title: **Research lens**
- Grouping by confidence (Known / Guessing / Unknown) with distinct **color + label** (accessible contrast).
- **Open questions** as bullet list; **Risk flags** visually distinct (e.g. amber callout).
- Optional: dismiss card, expand full text (micro-interactions).

### Design panel (`ConceptSketch`)

- Section title: **Design lens**
- When ready: concept name, primary surface, **components used** as chips (must map to snapshot), numbered **user flow**, **key interactions**, **open design questions**.
- Optional: “Direction A / B” as **tabs** (second direction can be stub or second model call later).

---

## Visual system (high level)

- **Typography:** One sans for UI, one mono for file keys / JSON snippets only.
- **Density:** Comfortable padding; panels in **cards** with clear separation.
- **Motion:** Subtle 150–200ms on panel appear; no distracting chat streaming unless SSE is used for status lines only.

---

## Accessibility

- Gate states and progress must be announced to screen readers (`aria-live` on status region).
- Confidence labels must not rely on color alone (icon or text suffix).
- Keyboard: wizard steps trap focus in modal; Esc returns to workspace with save draft of partial setup where possible.

---

## Analytics (optional for hackathon)

- Events: `setup_started`, `figma_sync_completed`, `idea_analyzed`, `design_blocked_by_gate`, `design_rendered`.
- Helps prove the **gate** is intentional UX, not a bug.

---

## Out of scope (for this design doc)

- CopilotKit-specific UI (sidebar, thread drawer, tool cards).
- Notion / lead triage flows unless product merges later.

---

## Open questions for the team

1. **Multi-workspace vs single-user** hackathon scope?
2. **OAuth vs PAT** for Figma in the demo environment?
3. Should **research** run automatically on paste or only on **Analyze**?
