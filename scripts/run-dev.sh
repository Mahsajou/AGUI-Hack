#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=scripts/lib/skip-docker.sh
source "$REPO_ROOT/scripts/lib/skip-docker.sh"

if [[ "$skip_docker" -eq 0 ]]; then
  npm run dev:infra
else
  printf '\n%s\n\n' '[run-dev] SKIP_DOCKER=1 (or SKIP_INFRA=1) — skipping Docker Compose and DB seed.'
  printf '%s\n' '  Threads / Intelligence-backed chat paths need `npm run dev:infra` with Docker Desktop running.'
fi

exec npx concurrently -k -n ui,bff,agent -c blue,cyan,green \
  "npm run dev:ui" \
  "npm run dev:bff" \
  "npm run dev:agent"
