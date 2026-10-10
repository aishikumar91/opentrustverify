#!/usr/bin/env bash
# Run VPS compose with repo-root .env (compose file lives under infra/docker/).
# Usage: ./infra/docker/compose-vps.sh up -d --force-recreate --no-deps trigger
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec docker compose --project-directory "$ROOT" --env-file "$ROOT/.env" \
  -f "$ROOT/infra/docker/docker-compose.vps.yml" "$@"
