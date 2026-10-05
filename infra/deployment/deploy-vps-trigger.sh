#!/usr/bin/env bash
# Deploy / refresh Open Trust Admin (otv-trigger) on the OTV VPS.
#
# Expected host layout (HealFast VPS):
#   Deploy root:  /home/administrator/deployments/opentrust-verify
#   Edge Caddy:   /home/administrator/hosting/edge-proxy/
#   Env file:     <deploy-root>/.env  (OTV_PG_PASSWORD, SESSION_SECRET, DEMO_PASSWORD,
#                 BASE_RPC_URL / ETH_RPC_URL, optional TRIGGER_ADMIN_SIGNER_PRIVATE_KEY)
#
# Usage (on the VPS, from the deploy root):
#   bash infra/deployment/deploy-vps-trigger.sh
#
# Or from a workstation with SSH:
#   DEPLOY_HOST=administrator@93.127.142.159 \
#   DEPLOY_PATH=/home/administrator/deployments/opentrust-verify \
#   bash infra/deployment/deploy-vps-trigger.sh --remote
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

SSH_OPTS=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new)
if [[ -n "${VPS_SSH_PRIVATE_KEY:-}" ]]; then
  KEY_FILE="$(mktemp)"
  printf '%s\n' "$VPS_SSH_PRIVATE_KEY" >"$KEY_FILE"
  chmod 600 "$KEY_FILE"
  trap 'rm -f "$KEY_FILE"' EXIT
  SSH_OPTS+=(-i "$KEY_FILE" -o IdentitiesOnly=yes)
elif [[ -n "${VPS_SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "$VPS_SSH_KEY" -o IdentitiesOnly=yes)
elif [[ -n "${SSH_AUTH_SOCK:-}" ]]; then
  export SSH_AUTH_SOCK
fi

remote_cmd() {
  ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "$@"
}

ensure_env_keys() {
  local env_file="$1"
  if [[ ! -f "$env_file" ]]; then
    echo "ERROR: missing $env_file" >&2
    exit 1
  fi

  # Ensure optional trigger keys exist (empty is fine — never invent signer keys).
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

  # Sanity: required OTV secrets must already be present.
  for key in OTV_PG_PASSWORD SESSION_SECRET; do
    if ! grep -q "^${key}=" "$env_file"; then
      echo "ERROR: $env_file missing required $key" >&2
      exit 1
    fi
  done

  if ! grep -qE '^(BASE_RPC_URL|ETH_RPC_URL|EVM_RPC_URL|RPC_URL)=' "$env_file"; then
    echo "WARN: no BASE_RPC_URL / ETH_RPC_URL / EVM_RPC_URL / RPC_URL in $env_file — trigger will start without a live RPC." >&2
  fi
}

sync_edge_caddy() {
  local src="$1/infra/caddy/otv.poptrust.me.caddy"
  local dest="$EDGE_CADDY_DIR/Caddyfile"
  if [[ ! -f "$src" ]]; then
    echo "WARN: missing $src — skip Caddy sync" >&2
    return 0
  fi
  if [[ ! -d "$EDGE_CADDY_DIR" ]]; then
    echo "WARN: edge Caddy dir $EDGE_CADDY_DIR not found — skip Caddy sync" >&2
    return 0
  fi

  if grep -q 'handle /trigger\*' "$dest" 2>/dev/null; then
    echo "Edge Caddy already has /trigger* handle."
  else
    echo "Inserting /trigger* reverse_proxy block into $dest"
    if grep -q 'otv.poptrust.me {' "$dest" 2>/dev/null; then
      python3 - "$dest" <<'PY' || true
import pathlib, re, sys
dest = pathlib.Path(sys.argv[1])
text = dest.read_text()
snippet = """
	# Open Trust Admin trigger console (Next.js, basePath=/trigger)
	handle /trigger* {
		reverse_proxy host.docker.internal:4091 {
			header_up Host {host}
			header_up X-Forwarded-Proto https
			header_up X-Forwarded-Host {host}
			header_up X-Forwarded-Port 443
		}
	}
"""
if "handle /trigger*" in text:
    print("already present")
else:
    replaced = re.sub(
        r"(\n\thandle \{\n\t\treverse_proxy host\.docker\.internal:4090)",
        snippet + r"\1",
        text,
        count=1,
    )
    if replaced == text:
        replaced = text.rstrip() + "\n" + snippet + "\n"
    dest.write_text(replaced)
    print("inserted /trigger* handle")
PY
    else
      cat "$src" >>"$dest"
    fi
  fi

  if command -v docker >/dev/null 2>&1; then
    (cd "$EDGE_CADDY_DIR" && docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null) \
      || (cd "$EDGE_CADDY_DIR" && docker compose restart caddy 2>/dev/null) \
      || echo "WARN: could not reload edge Caddy automatically — reload manually." >&2
  fi
}

deploy_local() {
  local root="$1"
  cd "$root"
  echo "==> Deploy root: $root"
  echo "==> Branch: $BRANCH"

  if [[ -d .git ]]; then
    git fetch origin "$BRANCH" || git fetch origin
    git checkout "$BRANCH" 2>/dev/null || git checkout -B "$BRANCH" "origin/$BRANCH"
    git pull --ff-only origin "$BRANCH" || true
  fi

  ensure_env_keys "$root/.env"
  set -a
  # shellcheck disable=SC1091
  source "$root/.env"
  set +a

  sync_edge_caddy "$root"

  echo "==> Building and starting otv-trigger (and dependencies)"
  docker compose -f "$COMPOSE_FILE" --env-file "$root/.env" up -d --build postgres trigger

  echo "==> Waiting for trigger health…"
  for i in $(seq 1 36); do
    if curl -fsS -o /dev/null "http://127.0.0.1:4091/trigger/admin/login"; then
      echo "OK: trigger listening on 127.0.0.1:4091"
      break
    fi
    if [[ "$i" -eq 36 ]]; then
      echo "ERROR: trigger did not become ready" >&2
      docker compose -f "$COMPOSE_FILE" --env-file "$root/.env" logs --tail=80 trigger >&2 || true
      exit 1
    fi
    sleep 5
  done

  echo "==> Smoke: https://otv.poptrust.me/trigger (via local port)"
  curl -fsS -o /dev/null "http://127.0.0.1:4091/trigger/admin/login"
  echo "Deploy complete. Public URL: https://otv.poptrust.me/trigger"
  echo "Default admin user: admin (password from DEMO_PASSWORD in .env)"
}

if [[ "$REMOTE" -eq 1 ]]; then
  echo "==> Remote deploy via $DEPLOY_HOST:$DEPLOY_PATH"
  remote_cmd "test -d '$DEPLOY_PATH'"
  # Copy latest script + ensure repo has branch, then run on host.
  remote_cmd "bash -lc 'set -euo pipefail
    cd \"$DEPLOY_PATH\"
    if [[ -d .git ]]; then
      git fetch origin \"$BRANCH\" || true
      git checkout \"$BRANCH\" 2>/dev/null || git checkout -B \"$BRANCH\" \"origin/$BRANCH\"
      git pull --ff-only origin \"$BRANCH\" || true
    fi
    bash infra/deployment/deploy-vps-trigger.sh
  '"
else
  ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
  # Prefer explicit DEPLOY_PATH when already on the VPS layout.
  if [[ -f "$DEPLOY_PATH/.env" && -f "$DEPLOY_PATH/$COMPOSE_FILE" ]]; then
    deploy_local "$DEPLOY_PATH"
  else
    deploy_local "$ROOT"
  fi
fi
