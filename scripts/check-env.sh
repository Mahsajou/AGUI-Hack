#!/usr/bin/env bash
# scripts/check-env.sh — pre-flight wired into `predev` (npm convention).
#
# Validates, in order, that everything `npm run dev` needs is in place:
#   1. Docker daemon up — skipped when SKIP_DOCKER=1 (or SKIP_INFRA=1) in env or `.env`;
#      without Docker you can run UI+BFF+agent only (threads/Intelligence will fail).
#   2. npx is available so `@notionhq/notion-mcp-server` can be fetched
#      on demand. We don't pull the package here (slow) — we just prove
#      the resolver works.
#   3. apps/agent/.env exists and has GEMINI_API_KEY (and unless SKIP_NOTION=1,
#      NOTION_TOKEN and NOTION_LEADS_DATABASE_ID) set to non-stub values.
#   4. Notion is reachable AND the leads database is shared with the
#      integration — skipped when apps/agent/.env has SKIP_NOTION=1 (local
#      bundled leads). Defers to `apps/agent/src/notion_tools.py --check`.
#
# Collects every problem into a numbered list rather than bailing on the
# first failure, so participants can fix the whole batch in one pass.
# Exit 0 silently on success.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=scripts/lib/skip-docker.sh
source "$REPO_ROOT/scripts/lib/skip-docker.sh"

AGENT_ENV="$REPO_ROOT/apps/agent/.env"
skip_notion=0
if [[ -f "$AGENT_ENV" ]] && grep -qE '^[[:space:]]*SKIP_NOTION=(1|true|yes|on)' "$AGENT_ENV" 2>/dev/null; then
  skip_notion=1
fi

PROBLEMS=()

# ---------- 1. Docker daemon -------------------------------------------------
if [[ "$skip_docker" -eq 0 ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    PROBLEMS+=("Docker isn't installed. Install Docker Desktop and re-try.")
  elif ! docker info >/dev/null 2>&1; then
    PROBLEMS+=("Docker isn't running (or unreachable). Start Docker Desktop or add SKIP_DOCKER=1 to .env — then only UI+BFF+agent run; Threads/Intelligence need Docker infra.")
  fi
fi

# ---------- 2. npx (for the Notion MCP server) -------------------------------
if ! command -v npx >/dev/null 2>&1; then
  PROBLEMS+=("npx is not on PATH. Install Node.js 20+ (npm bundles npx).")
fi

# ---------- 3. agent/.env vars -----------------------------------------------
if [[ ! -f "$AGENT_ENV" ]]; then
  PROBLEMS+=("apps/agent/.env is missing. Run: cp apps/agent/.env.example apps/agent/.env, then fill in the keys.")
else
  # Read VAR=VALUE lines. We tolerate values without quotes (the .env files
  # ship without quotes) and strip surrounding whitespace.
  read_var() {
    local key="$1"
    grep -E "^[[:space:]]*${key}=" "$AGENT_ENV" | tail -n1 | sed -E "s/^[[:space:]]*${key}=//; s/^[\"']//; s/[\"'][[:space:]]*$//; s/[[:space:]]+$//"
  }
  is_stub() {
    local v="$1"
    [[ -z "$v" ]] && return 0
    case "$v" in
      stub*|"<paste"*|"<set"*|"replace-with-"*) return 0 ;;
    esac
    return 1
  }
  vars=(GEMINI_API_KEY)
  if [[ "$skip_notion" -eq 0 ]]; then
    vars+=(NOTION_TOKEN NOTION_LEADS_DATABASE_ID)
  fi
  for VAR in "${vars[@]}"; do
    val="$(read_var "$VAR" || true)"
    if is_stub "$val"; then
      case "$VAR" in
        GEMINI_API_KEY)
          PROBLEMS+=("$VAR is unset (or a stub) in apps/agent/.env. Get a key at https://aistudio.google.com -> Get API key.")
          ;;
        NOTION_TOKEN)
          PROBLEMS+=("$VAR is unset (or a stub) in apps/agent/.env. Get a token at https://notion.so/my-integrations -> New integration -> Internal Integration Token.")
          ;;
        NOTION_LEADS_DATABASE_ID)
          PROBLEMS+=("$VAR is unset in apps/agent/.env. Paste the database id from your Notion database URL.")
          ;;
      esac
    fi
  done
fi

# ---------- 4. Notion reachable + database shared ---------------------------
# Only run the live health check if the env vars passed (no point hitting the
# network when we know auth will fail). The script prints OK: ... or FAIL: ...
# with the share-gotcha fix on a 404. Skipped when SKIP_NOTION=1 (local leads JSON).
if [[ ${#PROBLEMS[@]} -eq 0 ]] && [[ "$skip_notion" -eq 0 ]]; then
  HEALTH_OUT="$(cd "$REPO_ROOT/apps/agent" && uv run python -m src.notion_tools --check 2>&1 || true)"
  if ! grep -q "^OK: " <<<"$HEALTH_OUT"; then
    # Pass the FAIL output through verbatim — the --check flag already
    # formats the share-gotcha fix instructions when applicable.
    PROBLEMS+=("Notion health check failed:
$HEALTH_OUT")
  fi
fi

# ---------- Report -----------------------------------------------------------
if [[ ${#PROBLEMS[@]} -gt 0 ]]; then
  echo ""
  echo "Pre-flight check found ${#PROBLEMS[@]} problem(s):"
  echo ""
  i=1
  for p in "${PROBLEMS[@]}"; do
    # Indent multi-line problems so they read as one item.
    first_line="${p%%$'\n'*}"
    rest="${p#*$'\n'}"
    echo "  $i. $first_line"
    if [[ "$rest" != "$p" ]]; then
      while IFS= read -r line; do
        echo "     $line"
      done <<<"$rest"
    fi
    i=$((i+1))
  done
  echo ""
  echo "Fix these and re-run \`npm run dev\`."
  exit 1
fi

exit 0
