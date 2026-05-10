#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=scripts/lib/skip-docker.sh
source "$REPO_ROOT/scripts/lib/skip-docker.sh"

if [[ "$skip_docker" -eq 0 ]]; then
  npm run dev:infra
else
  printf '\n%s\n\n' '[run-dev-full] SKIP_DOCKER=1 — skipping Docker Compose.'
  printf '%s\n' '  Intelligence / threads need Docker; MCP sub-app still starts on the host.'
fi

exec npx concurrently -k -n ui,bff,agent,mcp -c blue,cyan,green,magenta \
  "npm run dev:ui" \
  "npm run dev:bff" \
  "npm run dev:agent" \
  "npm run dev:mcp"
