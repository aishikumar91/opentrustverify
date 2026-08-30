# KMS / signing-key runbook

## Threat

Compromise of the API host must not yield a plaintext Ed25519 private key if an envelope key is configured.

## Providers

| `OTV_KMS_PROVIDER` | Behavior |
|--------------------|----------|
| unset / file | Keys in `OTV_KEYS_DIR` as `*.json` (`0600`). No wrap unless a master key is also set. |
| `local` | `OTV_KMS_MASTER_KEY` (32-byte hex) AES-256-GCM wraps `privateKeyHex` as `otv-kms-v1:…` |
| `aws` | AWS KMS generates a DEK (`GenerateDataKey`). The DEK ciphertext is stored in `keys/.otv-kms-dek`. Wrap/unwrap stay local AES-GCM with that DEK. Needs `AWS_KMS_KEY_ID` and AWS credentials in the environment. |

`OTV_KMS_MASTER_KEY` alone still selects the local provider. `AWS_KMS_KEY_ID` alone selects AWS.

Public keys are also stored in Postgres `signing_keys` for `GET /v1/keys`.

## Rotate

1. Keep traffic on the current `kid`.
2. Call `FileKeyStore.rotate(newKid)` or restart with a new `OTV_KID` after generating the next key file.
3. Old key status becomes `rotated`; signature verification still succeeds via `GET /v1/keys` + `POST /v1/verdicts/verify`.
4. Revoke only after TTL of issued verdicts (`expiresAt`).

## Production

Set `OTV_KMS_MASTER_KEY` or AWS KMS from a secret manager. Never commit `keys/*.json`. A hardware HSM in front of the process is still a later hardening step.
