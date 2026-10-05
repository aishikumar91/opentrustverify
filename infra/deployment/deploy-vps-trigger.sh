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
# Or from a workstation with SSH (key or SSHPASS):
#   DEPLOY_HOST=administrator@93.127.142.159 \
#   bash infra/deployment/deploy-vps-trigger.sh --remote
#
# Password auth (do not put the password on argv or in git):
#   export SSHPASS='…'
#   DEPLOY_HOST=administrator@93.127.142.159 \
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
  # Prefer env var (-e) so the password is never placed on argv.
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
    echo "ERROR: rsync is required for remote sync (apt/brew install rsync)" >&2
    exit 1
  fi
  # Rsync over the same SSH auth wrapper as remote_cmd.
  if [[ ${#SSH_PREFIX[@]} -gt 0 ]]; then
    rsync -az --delete "$@" -e "${SSH_PREFIX[*]} ssh ${SSH_OPTS[*]}" "$src" "$dest"
  else
    rsync -az --delete "$@" -e "ssh ${SSH_OPTS[*]}" "$src" "$dest"
  fi
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

  # WalletConnect: ensure key exists; copy from VITE_* when present, never invent.
  if ! grep -q '^NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=' "$env_file"; then
    local vite_wc=""
    vite_wc="$(grep -E '^VITE_WALLETCONNECT_PROJECT_ID=.+' "$env_file" | head -n1 || true)"
    if [[ -n "$vite_wc" ]]; then
      echo "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${vite_wc#VITE_WALLETCONNECT_PROJECT_ID=}" >>"$env_file"
    else
      echo 'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=' >>"$env_file"
    fi
  fi

  # Sanity: required OTV secrets must already be present.
  for key in OTV_PG_PASSWORD SESSION_SECRET; do
    if ! grep -q "^${key}=" "$env_file"; then
      echo "ERROR: $env_file missing required $key" >&2
      exit 1
    fi
  done

  # Reuse RPC from a running otv-api container when .env lacks it (do not invent keys).
  if ! grep -qE '^(BASE_RPC_URL|ETH_RPC_URL|EVM_RPC_URL|RPC_URL)=.+' "$env_file"; then
    if command -v docker >/dev/null 2>&1 && docker inspect otv-api >/dev/null 2>&1; then
      local imported=""
      imported="$(docker inspect otv-api --format '{{range .Config.Env}}{{println .}}{{end}}' \
        | grep -E '^(BASE_RPC_URL|ETH_RPC_URL|EVM_RPC_URL|RPC_URL)=' \
        | grep -v '=$' \
        | head -n1 || true)"
      if [[ -n "$imported" ]]; then
        echo "Importing RPC URL key from running otv-api into .env (value not printed)."
        # Strip any existing empty key line for the same name, then append.
        local ikey="${imported%%=*}"
        grep -v "^${ikey}=" "$env_file" >"${env_file}.tmp" || true
        mv "${env_file}.tmp" "$env_file"
        printf '%s\n' "$imported" >>"$env_file"
        chmod 600 "$env_file"
      fi
    fi
  fi

  # When API also has no dedicated RPC (EVM_PUBLIC_RPC path), use the same
  # catalog public Base mainnet endpoint as @otv/chain-adapters — not a secret,
  # not Sepolia. Only for default TRIGGER_CHAIN_ID=8453 / Base.
  if ! grep -qE '^(BASE_RPC_URL|ETH_RPC_URL|EVM_RPC_URL|RPC_URL)=.+' "$env_file"; then
    local chain_id="8453"
    chain_id="$(grep -E '^TRIGGER_CHAIN_ID=' "$env_file" | head -n1 | cut -d= -f2- || true)"
    chain_id="${chain_id:-8453}"
    if [[ "$chain_id" == "8453" ]]; then
      echo "No dedicated RPC in .env or otv-api — setting BASE_RPC_URL to catalog public Base mainnet RPC."
      grep -vE '^BASE_RPC_URL=' "$env_file" >"${env_file}.tmp" || true
      mv "${env_file}.tmp" "$env_file"
      printf '%s\n' 'BASE_RPC_URL=https://base.publicnode.com' >>"$env_file"
      chmod 600 "$env_file"
    fi
  fi

  if ! grep -qE '^(BASE_RPC_URL|ETH_RPC_URL|EVM_RPC_URL|RPC_URL)=.+' "$env_file"; then
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
    echo "==> Reloading edge Caddy"
    if ! (cd "$EDGE_CADDY_DIR" && docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile); then
      echo "WARN: caddy reload failed — restarting edge-caddy" >&2
      (cd "$EDGE_CADDY_DIR" && docker compose restart caddy) \
        || echo "WARN: could not reload edge Caddy automatically — reload manually." >&2
    fi
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

  if [[ ! -d "$root/open-trust" ]]; then
    echo "ERROR: missing $root/open-trust — sync open-trust before deploy" >&2
    exit 1
  fi
  if [[ ! -f "$root/infra/docker/Dockerfile.trigger" ]]; then
    echo "ERROR: missing $root/infra/docker/Dockerfile.trigger" >&2
    exit 1
  fi

  ensure_env_keys "$root/.env"
  # Do not `source` .env — VPS files may contain unquoted values (e.g. OIDC scopes).
  # docker compose --env-file loads them safely.

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

sync_remote_tree() {
  local root
  root="$(cd "$(dirname "$0")/../.." && pwd)"
  echo "==> Syncing trigger deploy artifacts to $DEPLOY_HOST:$DEPLOY_PATH"
  echo "    (source: $root, branch hint: $BRANCH)"

  if [[ ! -d "$root/open-trust" ]]; then
    echo "ERROR: local open-trust/ missing at $root/open-trust" >&2
    exit 1
  fi

  # open-trust app (exclude heavy/local-only paths)
  remote_rsync "$root/open-trust/" "$DEPLOY_HOST:$DEPLOY_PATH/open-trust/" \
    --exclude node_modules \
    --exclude .next \
    --exclude .env \
    --exclude .env.local \
    --exclude .git

  # Docker / Caddy / deploy script pieces required for trigger
  remote_cmd "mkdir -p '$DEPLOY_PATH/infra/docker' '$DEPLOY_PATH/infra/caddy' '$DEPLOY_PATH/infra/deployment'"
  remote_rsync "$root/infra/docker/Dockerfile.trigger" "$DEPLOY_HOST:$DEPLOY_PATH/infra/docker/Dockerfile.trigger"
  remote_rsync "$root/infra/docker/docker-compose.vps.yml" "$DEPLOY_HOST:$DEPLOY_PATH/infra/docker/docker-compose.vps.yml"
  remote_rsync "$root/infra/caddy/otv.poptrust.me.caddy" "$DEPLOY_HOST:$DEPLOY_PATH/infra/caddy/otv.poptrust.me.caddy"
  remote_rsync "$root/infra/deployment/deploy-vps-trigger.sh" "$DEPLOY_HOST:$DEPLOY_PATH/infra/deployment/deploy-vps-trigger.sh"
  remote_cmd "chmod +x '$DEPLOY_PATH/infra/deployment/deploy-vps-trigger.sh'"
}

if [[ "$REMOTE" -eq 1 ]]; then
  echo "==> Remote deploy via $DEPLOY_HOST:$DEPLOY_PATH"
  remote_cmd "test -d '$DEPLOY_PATH'"
  remote_cmd "test -f '$DEPLOY_PATH/.env'"

  # Prefer git pull when the VPS tree is a clone; otherwise rsync artifacts.
  if remote_cmd "test -d '$DEPLOY_PATH/.git'"; then
    echo "==> VPS tree is a git repo — fetching $BRANCH"
    remote_cmd "bash -lc 'set -euo pipefail
      cd \"$DEPLOY_PATH\"
      git fetch origin \"$BRANCH\" || true
      git checkout \"$BRANCH\" 2>/dev/null || git checkout -B \"$BRANCH\" \"origin/$BRANCH\"
      git pull --ff-only origin \"$BRANCH\" || true
    '"
  else
    echo "==> VPS tree has no .git — syncing open-trust + compose/caddy via rsync"
    sync_remote_tree
  fi

  remote_cmd "bash -lc \"set -euo pipefail; cd '$DEPLOY_PATH'; bash infra/deployment/deploy-vps-trigger.sh\""
else
  ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
  # Prefer explicit DEPLOY_PATH when already on the VPS layout.
  if [[ -f "$DEPLOY_PATH/.env" && -f "$DEPLOY_PATH/$COMPOSE_FILE" ]]; then
    deploy_local "$DEPLOY_PATH"
  else
    deploy_local "$ROOT"
  fi
fi
