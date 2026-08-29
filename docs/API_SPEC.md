# API_SPEC.md — OpenTrust Verify REST API v1

**Base URL (prod):** `https://otv.poptrust.me`  
**Base URL (local):** `http://localhost:4080`

## Authentication

- Public: `GET /v1/health`, `/v1/ready`, `/v1/metrics`, `/v1/keys`, chains/networks/assets, `POST /v1/verdicts/verify`, `GET /v1/verdicts/:id`
- API key: `Authorization: Bearer otv_live_...` or `X-OTV-Api-Key` for verify, webhooks, usage
- Session cookie `otv_session` **or** API key for orgs/projects/keys/audit/billing
- OIDC: specified, `GET /v1/auth/oidc/login` returns 501 until configured

## Endpoints (MVP)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/verify/incoming` | API key | Submit incoming transfer claim |
| GET | `/v1/verdicts/:id` | public (share link) | Fetch verdict |
| POST | `/v1/verdicts/verify` | none | Verify signature of a verdict body |
| GET | `/v1/keys` | none | Public signing keys |
| GET | `/v1/chains` | none | List supported chains |
| GET | `/v1/networks` | none | List networks |
| GET | `/v1/assets` | none | Known assets |
| POST | `/v1/webhooks` | API key | Register webhook |
| GET | `/v1/usage` | API key | Usage meters |
| GET | `/v1/health` | none | Liveness |
| GET | `/v1/ready` | none | Readiness (Postgres/Redis/kid) |
| GET | `/v1/metrics` | none | Prometheus |
| POST | `/v1/auth/login` | none | Session cookie |
| POST | `/v1/auth/logout` | session | Clear cookie |
| GET | `/v1/auth/me` | session | Current user |
| POST | `/v1/organizations` | session or API key | Create org |
| POST | `/v1/projects` | session or API key | Create project |
| POST | `/v1/api-keys` | session or API key | Create API key |
| POST | `/v1/api-keys/rotate` | session or API key | Rotate key |
| GET | `/v1/audit` | session or API key | Audit log |
| GET | `/v1/billing` | session or API key | Billing stub |

## POST /v1/verify/incoming

### Request

```json
{
  "chain": "ethereum",
  "network": "sepolia",
  "transactionHash": "0x...",
  "recipient": "0x...",
  "asset": { "type": "erc20", "contract": "0xA0b8...", "symbol": "USDC" },
  "expectedAmount": "1000000"
}
```

### Response 200

Returns `otv.verdict.v1` (see VERDICT_SPEC). Persisted in Postgres when `DATABASE_URL` is set.

### Errors

| Code | Meaning |
|------|---------|
| 400 | Validation error |
| 401 | Missing/invalid API key |
| 404 | Transaction not found (may also return REJECTED verdict) |
| 429 | Rate limited |
| 500 | Internal |
| 503 | Not ready |

OpenAPI generated at `/v1/openapi.json`.
