# UX Designer Agent

Specification for the **UX Designer** selectable agent. Uses **Figma MCP** for **guardrails**. Pair with [`plan.md`](plan.md) and [`researcher-agent.md`](researcher-agent.md).

---

## Purpose

When the user selects **UX Designer**, this agent produces **generative UI** directions that are **grounded in the real design system** available through **Figma MCP** (components, variables/tokens, documented patterns). It must **not** hallucinate component names or tokens that are not justified by MCP-backed context.

The **final output** for designer-led runs includes **multiple UI options** the user can **select from** (e.g. 2–4 variants: layout emphasis, primary flow, density). Each option should be renderable as a distinct block or preview in the app.

---

## When it runs

- User includes `designer` (or `ux_designer`) in **selected agents**.
- **Precondition:** Figma MCP session (or cached MCP snapshot) must provide **guardrail context**. If not:
  - Return a structured **`setup_required`** payload so the UI can drive **design system connection**—not speculative UI.

---

## Guardrails (Figma MCP)

| Source | Use |
| --- | --- |
| Figma MCP tools | Fetch libraries/files, variables, component metadata as allowed by your MCP server |
| Cached snapshot | Optional performance layer; **refresh** on user action or TTL |
| Allowed vocabulary | `components_used[]` and style references **must** be subset of MCP-derived names / tokens |

If MCP returns partial data, the agent **narrows** proposals (fewer components, simpler surfaces) instead of inventing missing pieces.

### Reference design system (this repo)

Default Figma Community file used in the app’s design-system setup UI:

`https://www.figma.com/community/file/1543337041090580818`

(File key: `1543337041090580818`.) If the REST/MCP token cannot read Community files directly, duplicate the file into the user’s Figma drafts and point setup at the duplicated file URL.

**Full setup flows (REST + MCP, Cursor, backend):** see [`figma-mcp-setup.md`](figma-mcp-setup.md).

---

## Inputs

| Field | Description |
| --- | --- |
| `user_prompt` | Same prompt as the run; may include “mobile-first”, “dashboard”, etc. |
| `figma_context` | Serialized MCP results: component list, token families, optional pattern notes |
| `researcher_insights` | Optional structured output from Researcher when both agents run |
| `option_count` | Target number of variants (default 3, max 4 for demo) |

---

## Output schema (for generative UI + selection)

```json
{
  "agent": "ux_designer",
  "version": 1,
  "concept_summary": "string",
  "options": [
    {
      "id": "opt_a",
      "label": "string",
      "tagline": "string",
      "primary_surface": "string",
      "components_used": ["string"],
      "user_flow": ["string"],
      "key_interactions": ["string"],
      "open_design_questions": ["string"],
      "ui_preview_hint": "string"
    }
  ],
  "recommended_option_id": "opt_a",
  "guardrails_note": "string"
}
```

- **`options`**: Each entry is one **selectable** generative UI variant.
- **`ui_preview_hint`**: Short hint for the renderer (layout metaphor—**not** raw code unless product chooses code-gen).
- **`recommended_option_id`**: Soft default; user choice wins.

---

## Generative UI mapping

| Payload section | Suggested UI |
| --- | --- |
| Whole `options[]` | Grid or carousel of **selectable cards**; selected state drives footer CTA (“Use this direction”) |
| `components_used` | Chips validated against MCP list |
| `user_flow` | Numbered steps |
| `guardrails_note` | Footnote: “Constrained to components from [file/library name]” |

---

## Interaction with Researcher

- If Researcher ran first: Designer **responds to risks** (e.g. avoid flows that assume unvalidated adoption) and may **label** which option best mitigates a top risk.
- If Designer runs alone: omit cross-reference fields.

---

## Failure modes

- MCP unreachable → `setup_required` + actionable message; **no** `options[]`.
- MCP empty component list → return **one** minimal option + warning, or refuse with setup instructions.
- JSON parse errors → same retry policy as Researcher.

---

## Non-goals

- Replacing Figma as the design tool of record.
- Guaranteeing pixel-perfect Figma export from JSON hints (unless you add a separate codegen pipeline).
