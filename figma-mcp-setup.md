# Figma MCP & design system — user setup flow

This document describes **how a user (or developer) sets up Figma** so the **UX Designer** agent can apply **real design-system guardrails**. It covers both:

1. **In-app design system** (what the product ships today) — **`/design-system/setup`**: link a **Figma file URL** (your library or a Community file) **or** your **Figma MCP server URL**. No **personal access token (PAT)** is required in the app; the server stores the link and passes it into designer prompts (component names are not auto-fetched via REST in this flow).
2. **Figma MCP** (IDE / backend) — **Model Context Protocol** so an **agent** can call Figma tools (variables, components, metadata) via `https://mcp.figma.com/mcp` or your host’s MCP configuration.

---

## How the pieces fit together

| Layer | What it is | Who configures it |
| --- | --- | --- |
| **Figma file** | Your UI kit / variables live in a Figma file (e.g. Community design system or your team file). | Design owner in Figma |
| **In-app snapshot** | The web app stores a **confirmed link** (file URL or MCP URL) and metadata in an in-memory snapshot after you **Preview** → **Confirm**. | User in **`/design-system/setup`** |
| **Figma MCP** | AI runtimes (Cursor, Claude Code, or your **Python agent** with mcp-use) talk to Figma through **MCP tools** instead of only REST. | Developer / user per environment |

**Optional:** If you later add **REST + PAT** to import real component names, the **same Figma account** must be able to read the file (duplicate Community files to your drafts if the API returns 403).

---

## Flow A — In-app design system (required for designer guardrails in the web UI)

Use this so **Analyze** on `/workspace` can run the designer with your **linked** design-system reference (file URL or MCP URL).

### Step 1 — Choose what to link

- **Figma file URL** — Open your design system in the browser and copy the URL (`figma.com/design/…`, `figma.com/file/…`, or `figma.com/community/file/…`).
- **Figma MCP URL** — The HTTP endpoint your IDE or agents use (often `https://mcp.figma.com/mcp`). The app stores it for prompts and metadata; live MCP calls still happen in the client/agent that has Figma auth.

### Step 2 — App: preview and confirm

1. Open **`/design-system/setup`**.
2. Select **file URL** or **MCP URL**, paste the value, then **Preview link**.
3. Review the summary → **Confirm design system** — snapshot becomes **Ready**.
4. Return to **`/workspace`** and run **Analyze** — the designer uses the confirmed link in context (no PAT in this flow).

### Step 3 — Re-link when the target changes

Use **Reset** on the setup page, then preview + confirm again.

---

## Flow B — Figma MCP for **Cursor / IDE** (optional, for building & debugging agents)

Use this when you want **Cursor** (or another MCP client) to call Figma while you edit prompts and code.

### Step 1 — Official Figma MCP in Cursor

1. Open **Cursor Settings** → **MCP** (or **Features → MCP** depending on version).
2. **Add server** — choose or paste the **Figma MCP** integration if listed, or add a custom server pointing at Figma’s MCP endpoint per [Figma’s MCP documentation](https://www.figma.com/developers) (commonly `https://mcp.figma.com/mcp`).
3. Complete **OAuth / sign in to Figma** when the client prompts you.
4. In chat, verify the model can use Figma tools (e.g. “List components in file …”).

### Step 2 — Match file to the app

Use the **same file** as in Flow A (when you linked a file URL) so IDE exploration and in-app prompts stay aligned.

---

## Flow C — Figma MCP for **backend / LangGraph** (target architecture)

Use this when the **Designer agent** runs in **Python** and should call Figma via **mcp-use** `MCPClient` (see `plan.md` stack).

### Step 1 — Credentials on the server

- Set **`FIGMA_ACCESS_TOKEN`** (or OAuth-derived bearer) and **`FIGMA_FILE_KEY`** (or pass file key per request) in the agent environment — **never** in the client bundle.
- MCP URL default: `https://mcp.figma.com/mcp` (confirm against current Figma docs).

### Step 2 — mcp-use session

- Agent startup or per-request: `MCPClient.from_dict({...})` → `create_session("figma")` → call tools (`get_metadata`, `get_design_context`, etc. — names depend on server version).
- **Cache** tool results into the same **snapshot shape** the frontend expects, or merge MCP output with REST snapshot for richer guardrails.

### Step 3 — Health check

- If MCP fails, return **`setup_required`** to the UI (same as today when no snapshot).

---

## Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Wrong URL error on preview | Not a `figma.com` URL (file mode) or missing `http(s)://` (MCP mode) | Fix the pasted URL |
| MCP works in Cursor but designer still generic | In-app flow only stores the MCP URL for prompts | Use Flow C or enrich snapshot from MCP/REST in a future iteration |

---

## Single checklist (user-facing)

- [ ] Design system file openable in browser (if using file URL)  
- [ ] **`/design-system/setup`** → Preview link → Confirm → **Ready**  
- [ ] **`/workspace`** → Analyze with Designer expectations  
- [ ] *(Optional)* Cursor Figma MCP connected for development  
- [ ] *(Target)* Backend env + mcp-use for production Designer agent  

---

## References in this repo

- In-app UI: `apps/frontend/src/app/design-system/setup/page.tsx`
- URL parsing (optional file key): `apps/frontend/src/lib/idealens/figma-sync.ts`
- Snapshot store: `apps/frontend/src/lib/idealens/snapshot-store.ts`
- Designer agent spec: [`designer-agent.md`](designer-agent.md)
- Product plan: [`plan.md`](plan.md)
