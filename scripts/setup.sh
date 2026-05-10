#!/usr/bin/env bash
# One-shot local bootstrap: env files + Node + Python agent deps.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f "$REPO_ROOT/.env" ]]; then
  cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
  echo "[setup] Created .env — edit GEMINI_API_KEY and other secrets."
fi

if [[ ! -f "$REPO_ROOT/apps/agent/.env" ]]; then
  cp "$REPO_ROOT/.env.example" "$REPO_ROOT/apps/agent/.env"
  echo "[setup] Created apps/agent/.env — langgraph reads this cwd; keep it in sync with root .env or copy: cp .env apps/agent/.env"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[setup] ERROR: Node.js not found. Install 20+ from https://nodejs.org" >&2
  exit 1
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "[setup] ERROR: uv not found. Install: curl -LsSf https://astral.sh/uv/install.sh | sh" >&2
  exit 1
fi

npm install

echo ""
echo "[setup] Done. Next:"
echo "  • Full stack (needs Docker Desktop): npm run dev"
echo "  • Without Docker: set SKIP_DOCKER=1 in .env, then npm run dev"
