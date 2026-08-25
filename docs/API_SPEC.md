# API_SPEC.md — OpenTrust Verify REST API v1

**Base URL (prod):** `https://api.verify.poptrust.me`  
**Base URL (local):** `http://localhost:4080`

## Authentication

- Public read for `GET /v1/health`, public verifier subset
- API key: `Authorization: Bearer otv_live_...` or `X-OTV-Api-Key`
- Dashboard: session cookie (HTTP-only) after login

## Endpoints (MVP)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/verify/incoming` | API key | Submit incoming transfer claim |
| GET | `/v1/verdicts/:id` | API key / public token | Fetch verdict |
| POST | `/v1/verdicts/verify` | none | Verify signature of a verdict body |
| GET | `/v1/chains` | none | List supported chains |
| GET | `/v1/networks` | none | List networks |
| GET | `/v1/assets` | none | Known assets |
| POST | `/v1/webhooks` | API key | Register webhook |
| GET | `/v1/usage` | API key | Usage meters |
| GET | `/v1/health` | none | Health |
| POST | `/v1/organizations` | session | Create org |
| POST | `/v1/projects` | session | Create project |
| POST | `/v1/api-keys` | session | Create API key |
| POST | `/v1/api-keys/rotate` | session | Rotate key |
| GET | `/v1/audit` | session | Audit log |
| GET | `/v1/billing` | session | Billing stub |

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

Returns `otv.verdict.v1` object (see VERDICT_SPEC).

### Errors

| Code | Meaning |
|------|---------|
| 400 | Validation error |
| 401 | Missing/invalid API key |
| 404 | Transaction not found (may also return REJECTED verdict) |
| 429 | Rate limited |
| 500 | Internal |

OpenAPI generated at `/v1/openapi.json`.
