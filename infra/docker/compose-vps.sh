#!/usr/bin/env bash
# Run VPS compose with repo-root .env while keeping compose-relative build paths.
# Usage (from repo root): ./infra/docker/compose-vps.sh up -d --force-recreate --no-deps trigger
set -euo pipefail
COMPOSE_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$COMPOSE_DIR/../.." && pwd)"
exec docker compose --project-directory "$COMPOSE_DIR" --env-file "$ROOT/.env" \
  -f "$COMPOSE_DIR/docker-compose.vps.yml" "$@"
