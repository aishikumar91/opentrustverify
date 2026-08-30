# PROJECT_CONTEXT — OpenTrust Verify

## Product

**OpenTrust Verify (OTV)** is digital-asset verification infrastructure under the POP Trust brand family.

**Core proposition:** Trust the balance, not just the blockchain event.

OTV helps wallets, exchanges, explorers, payment apps, and fintech products determine whether an observed incoming digital-asset event represents **verified, spendable value** for a recipient.

## Brand & domain

- **Parent brand:** POP Trust
- **Product:** OpenTrust Verify / OTV
- **Canonical host (same origin):** `https://otv.poptrust.me`
- **API:** `https://otv.poptrust.me/v1`
- **Docs:** `https://otv.poptrust.me/docs`
- **OpenAPI:** `https://otv.poptrust.me/api/docs`
- **Visual:** Shared interlocking-links logo (electric blue on black); OTV wordmark and tagline

## Human problem

Explorers correctly show blockchain events. Non-technical users wrongly interpret them as “money arrived.” Scammers exploit that gap. OTV evaluates evidence and returns a clear trust state so users never need RPC, calldata, decimals, or reorg literacy.

## Non-collapse principle

```
Blockchain activity
  ≠ Executed transaction
  ≠ Asset transfer
  ≠ Recipient balance increase
  ≠ Final transaction
  ≠ Spendable funds
```

## Non-goals

Not a blockchain, wallet, custody service, key store, censorship layer, explorer replacement, or AI that guesses balances.

## MVP scope

One chain ecosystem (Ethereum), deterministic pipeline through signed verdict, REST API, TypeScript + React SDKs, dashboard, public verifier, demo wallet, docs, tests, Docker local stack.

## Repository root

`opentrust-verify/` inside the POP Trust workspace — independent product, shared brand.
