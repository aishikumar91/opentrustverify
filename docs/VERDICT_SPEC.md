# VERDICT_SPEC.md — otv.verdict.v1

## Schema identity

`schema`: `otv.verdict.v1`

## Status enum

```
OBSERVED | PENDING | EXECUTED | ASSET_CONFIRMED | BALANCE_CONFIRMED
| FINAL | SPENDABLE | REJECTED | SUSPICIOUS | UNVERIFIED
```

## Canonical object

```json
{
  "schema": "otv.verdict.v1",
  "verdictId": "vr_...",
  "status": "SPENDABLE",
  "confidence": 0.99,
  "chain": "ethereum",
  "network": "sepolia",
  "transactionHash": "0x...",
  "recipient": "0x...",
  "asset": {
    "type": "erc20",
    "contract": "0x...",
    "symbol": "USDC",
    "decimals": 6
  },
  "amount": "1000000",
  "balanceDelta": "1000000",
  "finality": { "state": "FINAL", "confirmations": 12, "required": 12 },
  "risk": { "level": "LOW", "signals": [] },
  "evidence": [
    { "type": "TRANSACTION_INCLUDED", "result": true },
    { "type": "EXECUTION_SUCCESS", "result": true },
    { "type": "ASSET_MATCH", "result": true },
    { "type": "RECIPIENT_MATCH", "result": true },
    { "type": "AMOUNT_MATCH", "result": true },
    { "type": "BALANCE_DELTA", "result": true },
    { "type": "FINALITY", "result": true },
    { "type": "SPENDABILITY", "result": true }
  ],
  "policyVersion": "otv-policy-1",
  "checkedAt": "2026-08-25T00:00:00.000Z",
  "expiresAt": "2026-08-25T00:15:00.000Z",
  "verifier": "otv",
  "kid": "otv-dev-1",
  "signature": "..."
}
```

## Transitions (happy path)

```
OBSERVED → PENDING → EXECUTED → ASSET_CONFIRMED → BALANCE_CONFIRMED → FINAL → SPENDABLE
```

## Failure paths

- `PENDING → REJECTED` (tx not found / reverted / timed out)
- `EXECUTED → UNVERIFIED` (cannot confirm asset/recipient/amount)
- `ASSET_CONFIRMED → SUSPICIOUS` (risk signals elevated)

Chain policies may skip balance confirmation when not technically available; status must not claim SPENDABLE without documented policy allowance.

## Signing

1. Strip `signature`
2. Canonical JSON (sorted keys, no whitespace variance)
3. SHA-256 digest
4. Ed25519 sign with active key `kid`
5. Attach base64url signature

## Evidence rule

Every verdict MUST include evidence array. No unexplained trust scores.
