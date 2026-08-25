# API Reference — OpenTrust Verify v1

**Base (local):** `http://localhost:4080`  
**OpenAPI UI:** `GET /docs` · Spec: `GET /v1/openapi.json`

## Authentication

| Mode | Header | Used for |
|------|--------|----------|
| API key | `Authorization: Bearer otv_…` or `X-OTV-Api-Key` | verify, webhooks, usage, orgs/projects/keys (MVP), audit, billing |
| None | — | health, chains, networks, assets, verdicts/verify (signature check), GET verdict by id (share links) |

Keys are stored as SHA-256 hashes. Demo key (local only): `otv_test_demo_key_change_me`.

## Endpoints

### GET /v1/health
Returns product identity and clock.

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

### GET /v1/chains · /v1/networks · /v1/assets
Catalog endpoints.

### POST /v1/webhooks
Register HTTPS webhook. SSRF deny-list applied. Returns signing secret once.

### GET /v1/usage · /v1/audit · /v1/billing
API-key gated operational endpoints.

### POST /v1/organizations · /v1/projects · /v1/api-keys · /v1/api-keys/rotate
MVP gated by API key (session/OIDC pending).

## Errors

| Code | Meaning |
|------|---------|
| 400 | Validation / unsafe webhook URL |
| 401 | Missing/invalid API key |
| 404 | Verdict not found |
| 429 | Rate limited |
| 500 | Internal |

## TypeScript

```ts
import { OpenTrustVerify } from "@otv/sdk-core";
const otv = new OpenTrustVerify({ baseUrl, apiKey });
const result = await otv.verifyIncomingTransfer(claim);
```
