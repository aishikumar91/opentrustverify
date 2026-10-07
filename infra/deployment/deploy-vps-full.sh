#!/usr/bin/env bash
# Full VPS deploy: Open Trust Verify (api/web/worker) + 3GGA Admin (/trigger).
#
# Uses the local tree (this workspace / cloud agent branch) and
# infra/docker/docker-compose.vps.yml. Does not invent secrets — requires
# an existing VPS .env with OTV_PG_PASSWORD, SESSION_SECRET, etc.
#
# Usage:
#   export SSHPASS='…'   # or VPS_SSH_KEY / VPS_SSH_PRIVATE_KEY
#   DEPLOY_HOST=administrator@93.127.142.159 \
#     bash infra/deployment/deploy-vps-full.sh --remote
#
# On the VPS:
#   bash infra/deployment/deploy-vps-full.sh
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-administrator@93.127.142.159}"
DEPLOY_PATH="${DEPLOY_PATH:-/home/administrator/deployments/opentrust-verify}"
EDGE_CADDY_DIR="${EDGE_CADDY_DIR:-/home/administrator/hosting/edge-proxy}"
COMPOSE_FILE="infra/docker/docker-compose.vps.yml"
BRANCH="${DEPLOY_BRANCH:-cursor/ot-admin-trigger-deploy-3332}"
REMOTE=0

for arg in "$@"; do
  case "$arg" in
    --remote) REMOTE=1 ;;
    --branch=*) BRANCH="${arg#*=}" ;;
  esac
done

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
SSH_PREFIX=()
if [[ -n "${VPS_SSH_PRIVATE_KEY:-}" ]]; then
  KEY_FILE="$(mktemp)"
  printf '%s\n' "$VPS_SSH_PRIVATE_KEY" >"$KEY_FILE"
  chmod 600 "$KEY_FILE"
  trap 'rm -f "$KEY_FILE"' EXIT
  SSH_OPTS+=(-o BatchMode=yes -i "$KEY_FILE" -o IdentitiesOnly=yes)
elif [[ -n "${VPS_SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-o BatchMode=yes -i "$VPS_SSH_KEY" -o IdentitiesOnly=yes)
elif [[ -n "${SSHPASS:-}" ]]; then
  if ! command -v sshpass >/dev/null 2>&1; then
    echo "ERROR: SSHPASS is set but sshpass is not installed" >&2
    exit 1
  fi
  SSH_PREFIX=(sshpass -e)
  SSH_OPTS+=(-o PreferredAuthentications=password -o PubkeyAuthentication=no)
elif [[ -n "${SSH_AUTH_SOCK:-}" ]]; then
  SSH_OPTS+=(-o BatchMode=yes)
  export SSH_AUTH_SOCK
else
  SSH_OPTS+=(-o BatchMode=yes)
fi

remote_cmd() {
  "${SSH_PREFIX[@]}" ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "$@"
}

remote_rsync() {
  local src="$1"
  local dest="$2"
  shift 2 || true
  if ! command -v rsync >/dev/null 2>&1; then
    echo "ERROR: rsync is required for remote sync" >&2
    exit 1
  fi
  if [[ ${#SSH_PREFIX[@]} -gt 0 ]]; then
    rsync -az --delete "$@" -e "${SSH_PREFIX[*]} ssh ${SSH_OPTS[*]}" "$src" "$dest"
  else
    rsync -az --delete "$@" -e "ssh ${SSH_OPTS[*]}" "$src" "$dest"
  fi
}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ensure_env_keys() {
  local env_file="$1"
  if [[ ! -f "$env_file" ]]; then
    echo "ERROR: missing $env_file" >&2
    exit 1
  fi
  for key in OTV_PG_PASSWORD SESSION_SECRET; do
    if ! grep -q "^${key}=" "$env_file"; then
      echo "ERROR: $env_file missing required $key" >&2
      exit 1
    fi
  done
  grep -q '^TRIGGER_ADMIN_SIGNER_PRIVATE_KEY=' "$env_file" || \
    echo 'TRIGGER_ADMIN_SIGNER_PRIVATE_KEY=' >>"$env_file"
  grep -q '^TRIGGER_ADMIN_ALLOWLIST=' "$env_file" || \
    echo 'TRIGGER_ADMIN_ALLOWLIST=' >>"$env_file"
  grep -q '^TRIGGER_CHAIN_ID=' "$env_file" || \
    echo 'TRIGGER_CHAIN_ID=8453' >>"$env_file"
  grep -q '^TRIGGER_CHAIN_NAME=' "$env_file" || \
    echo 'TRIGGER_CHAIN_NAME=Base' >>"$env_file"
  grep -q '^TRIGGER_ALLOW_MAINNET=' "$env_file" || \
    echo 'TRIGGER_ALLOW_MAINNET=true' >>"$env_file"
  grep -q '^WEBAUTHN_RP_ID=' "$env_file" || \
    echo 'WEBAUTHN_RP_ID=otv.poptrust.me' >>"$env_file"
  grep -q '^WEBAUTHN_ORIGIN=' "$env_file" || \
    echo 'WEBAUTHN_ORIGIN=https://otv.poptrust.me' >>"$env_file"
  grep -q '^OTV_PUBLIC_URL=' "$env_file" || \
    echo 'OTV_PUBLIC_URL=https://otv.poptrust.me' >>"$env_file"
  grep -q '^VITE_OTV_API_URL=' "$env_file" || \
    echo 'VITE_OTV_API_URL=https://otv.poptrust.me' >>"$env_file"
}

sync_edge_caddy() {
  # Delegate to trigger script's edge sync by invoking it after compose is ready,
  # or run a minimal reload if /trigger* already present.
  local dest="$EDGE_CADDY_DIR/Caddyfile"
  if [[ -f "$dest" ]] && grep -q 'handle /trigger\*' "$dest" 2>/dev/null; then
    echo "Edge Caddy already has /trigger* handle."
    if command -v docker >/dev/null 2>&1 && [[ -d "$EDGE_CADDY_DIR" ]]; then
      (cd "$EDGE_CADDY_DIR" && docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile) \
        || (cd "$EDGE_CADDY_DIR" && docker compose restart caddy) \
        || echo "WARN: could not reload edge Caddy" >&2
    fi
    return 0
  fi
  if [[ -x "$SCRIPT_DIR/deploy-vps-trigger.sh" || -f "$SCRIPT_DIR/deploy-vps-trigger.sh" ]]; then
    # Run only the Caddy portion via a temp env: call trigger deploy's sync by
    # copying snippet if missing.
    bash "$SCRIPT_DIR/deploy-vps-trigger.sh" 2>/dev/null || true
  fi
}

sync_remote_tree() {
  echo "==> Syncing cloud/local implementation → $DEPLOY_HOST:$DEPLOY_PATH"
  echo "    source: $ROOT (branch hint: $BRANCH)"

  remote_cmd "mkdir -p \
    '$DEPLOY_PATH/apps' \
    '$DEPLOY_PATH/packages' \
    '$DEPLOY_PATH/services' \
    '$DEPLOY_PATH/database' \
    '$DEPLOY_PATH/infra/docker' \
    '$DEPLOY_PATH/infra/caddy' \
    '$DEPLOY_PATH/infra/deployment' \
    '$DEPLOY_PATH/infra/oidc' \
    '$DEPLOY_PATH/open-trust' \
    '$DEPLOY_PATH/tests'"

  # Core monorepo sources for OTV (api / web / worker)
  for path in \
    apps/web \
    packages \
    services/api \
    services/worker \
    database \
    tests/conformance
  do
    if [[ -d "$ROOT/$path" ]]; then
      echo "    rsync $path/"
      remote_rsync "$ROOT/$path/" "$DEPLOY_HOST:$DEPLOY_PATH/$path/" \
        --exclude node_modules \
        --exclude dist \
        --exclude .next \
        --exclude coverage \
        --exclude .env \
        --exclude .env.local \
        --exclude .git
    fi
  done

  # 3GGA / Open Trust Admin
  echo "    rsync open-trust/"
  remote_rsync "$ROOT/open-trust/" "$DEPLOY_HOST:$DEPLOY_PATH/open-trust/" \
    --exclude node_modules \
    --exclude .next \
    --exclude .env \
    --exclude .env.local \
    --exclude .git

  # Infra + root manifests needed for Docker builds
  for f in \
    package.json \
    pnpm-workspace.yaml \
    pnpm-lock.yaml \
    tsconfig.base.json \
    .npmrc \
    .dockerignore
  do
    if [[ -f "$ROOT/$f" ]]; then
      remote_rsync "$ROOT/$f" "$DEPLOY_HOST:$DEPLOY_PATH/$f"
    fi
  done

  remote_rsync "$ROOT/infra/docker/" "$DEPLOY_HOST:$DEPLOY_PATH/infra/docker/" \
    --exclude '*.local'
  if [[ -d "$ROOT/infra/oidc" ]]; then
    remote_rsync "$ROOT/infra/oidc/" "$DEPLOY_HOST:$DEPLOY_PATH/infra/oidc/" \
      --exclude 'dex.yaml' || true
  fi
  remote_rsync "$ROOT/infra/caddy/otv.poptrust.me.caddy" \
    "$DEPLOY_HOST:$DEPLOY_PATH/infra/caddy/otv.poptrust.me.caddy"
  remote_rsync "$ROOT/infra/deployment/" "$DEPLOY_HOST:$DEPLOY_PATH/infra/deployment/"
  remote_cmd "chmod +x '$DEPLOY_PATH'/infra/deployment/*.sh"
}

deploy_local() {
  local root="$1"
  cd "$root"
  echo "==> Full deploy root: $root"
  echo "==> Open Trust Verify (api/web/worker) + 3GGA (trigger)"

  ensure_env_keys "$root/.env"

  # Prefer trigger script Caddy sync when present
  if [[ -f "$root/infra/deployment/deploy-vps-trigger.sh" ]]; then
    # Only sync Caddy: run ensure via sourcing would be complex; invoke python
    # block by calling trigger script after services — reload is enough if handle exists.
    EDGE_CADDY_DIR="$EDGE_CADDY_DIR" bash -lc "
      dest='$EDGE_CADDY_DIR/Caddyfile'
      if [[ -f \"\$dest\" ]] && grep -q 'handle /trigger\\*' \"\$dest\"; then
        echo 'Edge Caddy /trigger* OK'
        cd '$EDGE_CADDY_DIR' && docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile || true
      else
        echo 'WARN: /trigger* missing from edge Caddy — run deploy-vps-trigger.sh once to insert'
      fi
    "
  fi

  echo "==> Building and starting full stack (postgres redis api worker web trigger dex)"
  docker compose -f "$COMPOSE_FILE" --env-file "$root/.env" up -d --build \
    postgres redis api worker web trigger dex

  echo "==> Waiting for API ready…"
  for i in $(seq 1 48); do
    if curl -fsS "http://127.0.0.1:4080/v1/ready" | grep -q '"status"[[:space:]]*:[[:space:]]*"ready"'; then
      echo "OK: api ready on :4080"
      break
    fi
    if [[ "$i" -eq 48 ]]; then
      echo "ERROR: api not ready" >&2
      docker compose -f "$COMPOSE_FILE" --env-file "$root/.env" logs --tail=80 api >&2 || true
      exit 1
    fi
    sleep 5
  done

  echo "==> Waiting for web…"
  for i in $(seq 1 36); do
    if curl -fsS -o /dev/null "http://127.0.0.1:4090/"; then
      echo "OK: web on :4090"
      break
    fi
    if [[ "$i" -eq 36 ]]; then
      echo "ERROR: web not ready" >&2
      exit 1
    fi
    sleep 5
  done

  echo "==> Waiting for 3GGA trigger…"
  for i in $(seq 1 36); do
    if curl -fsS -o /dev/null "http://127.0.0.1:4091/trigger/admin/login"; then
      echo "OK: trigger on :4091"
      break
    fi
    if [[ "$i" -eq 36 ]]; then
      echo "ERROR: trigger not ready" >&2
      docker compose -f "$COMPOSE_FILE" --env-file "$root/.env" logs --tail=80 trigger >&2 || true
      exit 1
    fi
    sleep 5
  done

  echo "==> Smoke (local ports)"
  curl -fsS "http://127.0.0.1:4080/v1/ready" | head -c 200; echo
  curl -fsS -o /dev/null -w "web:%{http_code}\n" "http://127.0.0.1:4090/"
  curl -fsS -o /dev/null -w "trigger:%{http_code}\n" "http://127.0.0.1:4091/trigger/admin/login"

  echo "Deploy complete."
  echo "  Open Trust Verify: https://otv.poptrust.me"
  echo "  API:               https://otv.poptrust.me/v1/ready"
  echo "  3GGA Admin:        https://otv.poptrust.me/trigger/admin"
}

if [[ "$REMOTE" -eq 1 ]]; then
  echo "==> Remote full deploy via $DEPLOY_HOST:$DEPLOY_PATH"
  remote_cmd "test -d '$DEPLOY_PATH'"
  remote_cmd "test -f '$DEPLOY_PATH/.env'"
  sync_remote_tree
  remote_cmd "bash -lc \"set -euo pipefail; cd '$DEPLOY_PATH'; bash infra/deployment/deploy-vps-full.sh\""
else
  if [[ -f "$DEPLOY_PATH/.env" && -f "$DEPLOY_PATH/$COMPOSE_FILE" ]]; then
    deploy_local "$DEPLOY_PATH"
  else
    deploy_local "$ROOT"
  fi
fi
