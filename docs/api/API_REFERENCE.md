# API reference, OpenTrust Verify v1

**Local:** `http://localhost:4080`  
**Live:** `https://otv.poptrust.me`  
**Interactive API:** `GET /api/docs`  
**Spec:** `GET /v1/openapi.json`

## Authentication

| Mode | Header / cookie | Used for |
|------|-----------------|----------|
| API key | `Authorization: Bearer otv_…` or `X-OTV-Api-Key` | verify, webhooks, usage |
| Session | Cookie `otv_session` | login-gated dashboard routes |
| None | (none) | health, ready, metrics, keys, catalogs, GET verdict, signature check |

Keys are stored as SHA-256 hashes. Demo key (local only): `otv_test_demo_key_change_me`.  
Demo user: `demo@poptrust.me` / `otv-demo-change-me`.

## Persistence

When `DATABASE_URL` is set, verdicts, keys, webhooks, sessions, and audit rows live in PostgreSQL. Without it (development only) the process uses `MemoryStore`. Production boot requires Postgres.

## Endpoints

### GET /v1/health
Liveness + `store` backend (`postgres` | `memory`) + redis flag.

### GET /v1/ready
Fails 503 unless Postgres, optional Redis, and the active signing kid are usable.

### GET /v1/metrics
Prometheus metrics (`otv_verifications_total`, webhook queue depth, …).

### POST /v1/verify/incoming
Submit an incoming transfer claim. Returns `otv.verdict.v1`.

```bash
curl -s http://localhost:4080/v1/verify/incoming \
  -H "Authorization: Bearer otv_test_demo_key_change_me" \
  -H "Content-Type: application/json" \
  -d '{
    "chain":"ethereum","network":"sepolia",
    "transactionHash":"0xdemo000000000000000000000000000000000000000000000000000000000001",
    "recipient":"0x2222222222222222222222222222222222222222",
    "asset":{"type":"erc20","contract":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48","symbol":"USDC"},
    "expectedAmount":"1000000"
  }'
```

When `ETH_RPC_URL` is unset (or `chain=mock`), risk includes `MOCK_ADAPTER`.

### GET /v1/verdicts/:id
Fetch a stored verdict (public by ID for share links; rate-limited).

### POST /v1/verdicts/verify
Verify Ed25519 signature of a verdict body (hex signature).

### GET /v1/keys
Public key list (`kid`, `publicKeyHex`, `status`).

### POST /v1/auth/login
Sets `otv_session`. See `docs/security/OIDC.md`.

### POST /v1/webhooks
Register HTTPS webhook. SSRF deny-list. Secret returned once. Delivery: `docs/webhooks/DELIVERY.md`.

### GET /v1/usage · /v1/audit · /v1/billing
Operational endpoints (API key or session).

### POST /v1/organizations · /v1/projects · /v1/api-keys · /v1/api-keys/rotate
Session or API key.

### GET /v1/auth/me
Returns `user.role`: `owner`, `admin`, or `member`. The org creator and the demo user are owners. A new account is an owner of the organization it creates.

### GET /v1/wallet/balance
Authenticated. Query `chain`, `network`, `address`, and `asset` (`native` or a token contract). Balance comes from `ChainAdapter`. If the read fails, `verification` is `unavailable` and `balanceBaseUnits` is null.

### POST /v1/wallet/audit
Authenticated. Body `{ action }` is one of `wallet_created`, `wallet_imported`, `address_watched`, `broadcast_submitted`, `balance_read_failed`. The route stores the action and actor only.

### POST /v1/demo/verification/run
Public. Body `{ scenario }` is `phantom_event`, `balance_mismatch`, `valid_payment`, or `pending_payment`. The result is a simulation. It does not broadcast a transaction.

### GET /v1/admin/settings · PUT /v1/admin/settings
Owner or admin, or an API key whose scopes include `admin`. GET returns `{ publicUrl, role }`. PUT body is `{ publicUrl }` and rejects any other field, including an API key. The URL is the process value, starting from `OTV_PUBLIC_URL`, and resets when the API restarts. The dashboard stores a browser override and an optional API key in local storage. That key is never posted to this route.

### PUT /v1/admin/members
Owner session. Body `{ email, role }` with role `owner`, `admin`, or `member`. Returns 403 for admin and member sessions, 404 when the email is outside the organization, and 409 when the change would remove the last owner.

## Errors

| Code | Meaning |
|------|---------|
| 400 | Validation / unsafe webhook URL |
| 401 | Missing/invalid credentials |
| 403 | Role cannot use the route |
| 404 | Verdict not found |
| 429 | Rate limited |
| 501 | OIDC not configured |
| 503 | Not ready |
| 500 | Internal |

## TypeScript

```ts
import { OpenTrustVerify } from "@otv/sdk-core";
const otv = new OpenTrustVerify({ baseUrl, apiKey });
const result = await otv.verifyIncomingTransfer(claim);
```
