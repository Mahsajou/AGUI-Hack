# UX Researcher Agent

Specification for the **UX Researcher** selectable agent. Pair with [`plan.md`](plan.md) and [`designer-agent.md`](designer-agent.md).

---

## Purpose

When the user selects **UX Researcher**, this agent applies **structured reasoning** to the user’s prompt. It does **not** invent UI visuals or reference Figma components. Its job is to **de-risk the idea** and **surface discussion-ready structure** that the frontend renders as **generative UI** (e.g. assumption cards, question lists, risk callouts).

---

## When it runs

- User includes `researcher` (or `ux_researcher`) in the **selected agents** list for a run.
- It may run **alone** (no Designer) or **in parallel** with Designer after orchestration rules are defined.

---

## Inputs

| Field | Description |
| --- | --- |
| `user_prompt` | Free text: product idea, feature ask, or “generate UI for …” |
| `constraints` | Optional: audience, platform, deadline, links (non-Figma). |
| `prior_selection` | Optional: if user already picked a design option, researcher can critique that direction. |

---

## Reasoning behavior

- **Explicit assumptions** — label each with **confidence** (`known` \| `guessing` \| `unknown`).
- **Open questions** — concrete, user- or business-testable.
- **Risk flags** — scope, ethics, feasibility, adoption; avoid vague worry.
- **No solutioning** — do not propose final layouts or component names; that belongs to the **Designer** agent.

Tone: senior UX researcher—skeptical, evidence-minded, concise.

---

## Output schema (for generative UI)

Machine-readable JSON the UI maps to components (e.g. `AssumptionMap`).

```json
{
  "agent": "ux_researcher",
  "version": 1,
  "assumptions": [
    { "text": "string", "confidence": "known" }
  ],
  "open_questions": ["string"],
  "risk_flags": ["string"],
  "reasoning_summary": "string"
}
```

- `reasoning_summary`: 2–4 sentences the UI can show above the cards (optional collapse).

---

## Generative UI mapping

| Payload section | Suggested UI |
| --- | --- |
| `assumptions` | Grouped cards by confidence; dismiss / expand interactions optional |
| `open_questions` | Bulleted or checklist list |
| `risk_flags` | Highlighted callout strip |
| `reasoning_summary` | Subheader or “Why we think this” drawer |

---

## Failure modes

- Empty or hostile prompt → short refusal + one clarifying question in JSON.
- Model returns non-JSON → orchestrator retries once with “JSON only”; UI shows error state.

---

## Non-goals

- Pulling Figma files.
- Emitting `options[]` for visual layout variants (that is **Designer**).
