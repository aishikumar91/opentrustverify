#!/bin/sh
set -eu

# Map OTV VPS env names onto Open Trust Admin expectations.
if [ -z "${RPC_URL:-}" ]; then
  if [ -n "${BASE_RPC_URL:-}" ]; then
    export RPC_URL="$BASE_RPC_URL"
  elif [ -n "${ETH_RPC_URL:-}" ]; then
    export RPC_URL="$ETH_RPC_URL"
  elif [ -n "${EVM_RPC_URL:-}" ]; then
    export RPC_URL="$EVM_RPC_URL"
  fi
fi

if [ -z "${ADMIN_SIGNER_PRIVATE_KEY:-}" ] && [ -n "${TRIGGER_ADMIN_SIGNER_PRIVATE_KEY:-}" ]; then
  export ADMIN_SIGNER_PRIVATE_KEY="$TRIGGER_ADMIN_SIGNER_PRIVATE_KEY"
fi

# Reuse OTV web WalletConnect project id when admin-specific id is unset.
if [ -z "${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:-}" ] && [ -n "${VITE_WALLETCONNECT_PROJECT_ID:-}" ]; then
  export NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="$VITE_WALLETCONNECT_PROJECT_ID"
fi
if [ -z "${WALLETCONNECT_PROJECT_ID:-}" ] && [ -n "${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:-}" ]; then
  export WALLETCONNECT_PROJECT_ID="$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"
fi

if [ -z "${DEFAULT_ADMIN_PASSWORD:-}" ] && [ -n "${DEMO_PASSWORD:-}" ]; then
  export DEFAULT_ADMIN_PASSWORD="$DEMO_PASSWORD"
fi

if [ -z "${DEFAULT_ADMIN_USERNAME:-}" ]; then
  export DEFAULT_ADMIN_USERNAME=admin
fi

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Seeding Open Trust admin user…"
  node scripts/seed-admin.mjs || echo "WARN: admin seed failed (will retry on next start)"
fi

exec node server.js
