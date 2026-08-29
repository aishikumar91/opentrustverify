# KMS / signing-key runbook

## Threat

Compromise of the API host must not yield a plaintext Ed25519 private key if an envelope key is configured.

## Providers

| `OTV_KMS_PROVIDER` (implied) | Behavior |
|------------------------------|----------|
| File (default) | Keys in `OTV_KEYS_DIR` as `*.json` (`0600`) |
| Local KMS | `OTV_KMS_MASTER_KEY` (32-byte hex) AES-256-GCM wraps `privateKeyHex` |
| Cloud KMS | Not wired — keep master key in a cloud secret manager and inject as env |

Public keys are also stored in Postgres `signing_keys` for JWKS-style `GET /v1/keys`.

## Rotate

1. Keep traffic on the current `kid`.
2. Call `FileKeyStore.rotate(newKid)` via a maintenance script or restart with a new `OTV_KID` after generating the next key file.
3. Old key status becomes `rotated`; signature verification still succeeds for in-flight verdicts via `GET /v1/keys` + `POST /v1/verdicts/verify`.
4. Revoke only after TTL of issued verdicts (`expiresAt`).

## Production

Set `OTV_KMS_MASTER_KEY` from a secret manager. Never commit `keys/*.json`. HSM/cloud KMS remains the next hardening step (see ADR-006).
