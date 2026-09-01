# SDK and embedding

Hosted API: `https://otv.poptrust.me`. Local API: `http://localhost:4080`.

Never ship signing keys in a client. Map `status` with color **and** text. Do not treat a raw explorer event as spendable.

## TypeScript

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

## React

```ts
import { useIncomingVerification } from "@otv/sdk-react";
```

## Wallet copy

| Status | User-facing copy (example) |
|--------|----------------------------|
| SPENDABLE | Funds verified as spendable for this wallet |
| FINAL / BALANCE_CONFIRMED | Confirmed on-chain; spendability checks pending policy |
| PENDING / OBSERVED / EXECUTED | Activity seen — not yet verified as spendable |
| SUSPICIOUS | Do not treat as received — review evidence |
| REJECTED / UNVERIFIED | Not verified — do not rely on explorer screenshots |

Demo surface: `apps/web` `/wallet` (raw chain activity first, then OTV primitives).

## Explorer UI (`@otv/ui`)

OTV is additive. Keep raw blockchain data visible and label it separately from **OTV VERIFICATION**.

| Component | Purpose |
|-----------|---------|
| `VerificationBadge` | Compact status beside a tx hash |
| `TransactionTrustPanel` | Observed / Executed / Asset / Recipient / Balance / Finality |
| `EvidenceTimeline` | Ordered evidence PASS/FAIL list |
| `VerdictCard` | Full verdict summary |
| `SignatureVerification` | Signature validity + kid |

```tsx
import {
  VerificationBadge,
  TransactionTrustPanel,
  EvidenceTimeline,
  VerdictCard,
  SignatureVerification,
} from "@otv/ui";
```

`apps/web` `/verifier` and `/wallet` already render these components.

## Flutter

Dart client in `packages/sdk-flutter`. Not a certified pub.dev package.
