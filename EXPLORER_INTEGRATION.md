# Explorer Integration Guide

OTV is an **additive** layer. Raw blockchain data must remain visible.

## Components (`@otv/ui`)

| Component | Purpose |
|-----------|---------|
| `VerificationBadge` | Compact status beside a tx hash |
| `TransactionTrustPanel` | Observed/Executed/Asset/Recipient/Balance/Finality panel |
| `EvidenceTimeline` | Ordered evidence PASS/FAIL list |
| `VerdictCard` | Full verdict summary |
| `SignatureVerification` | Signature validity + kid |

## Example

```tsx
import {
  VerificationBadge,
  TransactionTrustPanel,
  EvidenceTimeline,
  VerdictCard,
  SignatureVerification,
} from "@otv/ui";

<>
  <VerificationBadge status={verdict.status} />
  <TransactionTrustPanel verdict={verdict} />
  <EvidenceTimeline evidence={verdict.evidence} />
  <VerdictCard verdict={verdict} />
  <SignatureVerification valid={sigValid} kid={verdict.kid} />
</>
```

Label clearly: **Blockchain Explorer Data** vs **OTV VERIFICATION**.
