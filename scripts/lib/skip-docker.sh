#!/usr/bin/env bash
# Sourced after `cd` repo root preferred; computes root if unset.
skip_docker=0

_sk_lib="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
_repo="${REPO_ROOT:-$(cd "$_sk_lib/../.." && pwd)}"

if [[ "${SKIP_DOCKER:-}" =~ ^(1|true|yes|on)$ ]] || [[ "${SKIP_INFRA:-}" =~ ^(1|true|yes|on)$ ]]; then
  skip_docker=1
fi

if [[ "$skip_docker" -eq 0 ]]; then
  for env_path in "$_repo/apps/agent/.env" "$_repo/.env"; do
    if [[ -f "$env_path" ]] && grep -qE '^[[:space:]]*(SKIP_DOCKER|SKIP_INFRA)=(1|true|yes|on)' "$env_path" 2>/dev/null; then
      skip_docker=1
      break
    fi
  done
fi
