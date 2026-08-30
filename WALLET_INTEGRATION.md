# Wallet Integration Guide

## Goal

Show users a clear trust state for **incoming** value — never imply spendability from raw explorer activity alone.

## Integrate

```ts
import { OpenTrustVerify } from "@otv/sdk-core";

const otv = new OpenTrustVerify({
  baseUrl: "https://otv.poptrust.me",
  apiKey: process.env.OTV_API_KEY!,
});

const result = await otv.verifyIncomingTransfer({
  chain: "ethereum",
  network: "mainnet",
  transactionHash,
  recipient: userAddress,
  asset: { type: "erc20", contract: usdc, symbol: "USDC" },
  expectedAmount,
});
```

## Map status → UX

| Status | User-facing copy (example) |
|--------|----------------------------|
| SPENDABLE | Funds verified as spendable for this wallet |
| FINAL / BALANCE_CONFIRMED | Confirmed on-chain; spendability checks pending policy |
| PENDING / OBSERVED / EXECUTED | Activity seen — not yet verified as spendable |
| SUSPICIOUS | Do not treat as received — review evidence |
| REJECTED / UNVERIFIED | Not verified — do not rely on explorer screenshots |

Always pair **color + icon + text**. Never color alone.

## React

```ts
import { useIncomingVerification } from "@otv/sdk-react";
```

## Demo

`apps/web` `/demo` and `apps/demo-wallet` show raw activity vs OTV verdict (no custody).
