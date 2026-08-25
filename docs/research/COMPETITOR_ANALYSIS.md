# Competitor Analysis — OpenTrust Verify

**Date:** 2026-08-25  
**Method:** Category research + public product positioning. Not a claim of uniqueness without differentiation.

| Company / Product | Problem solved | API? | SDK? | Wallet integrations? | Explorer integrations? | Incoming-value verification? | Signed verdict? | Pricing | Strengths | Weaknesses | OTV differentiation |
|-------------------|----------------|------|------|----------------------|------------------------|------------------------------|-----------------|---------|-----------|------------|---------------------|
| Chainalysis / TRM / Elliptic | Compliance & risk intel | Yes | Limited | Via partners | Limited | Address/tx risk, not spendability UX | No (risk scores) | Enterprise | Deep intel | Not end-user spendability | OTV focuses on recipient spendable value + evidence UX |
| Blockaid / Blowfish / Blowfish-like simulation | Tx simulation / malicious tx | Yes | Yes | Strong wallet | Some | Pre-sign simulation, not post-incoming value | Sometimes attestations | Tiered | Great phishing defense | Different moment (before send) | OTV verifies after observed incoming event |
| Tenderly / Alchemy simulation | Dev simulation & tracing | Yes | Yes | Indirect | Indirect | Dev tooling | No | Usage | Excellent debug | Not consumer trust state | OTV is productized trust states for recipients |
| Etherscan / Blockscout | Explorer truth | Limited | Limited | N/A | Native | Shows events accurately | No | Freemium | Canonical chain view | Users misread “arrival” | OTV additive verification layer |
| Wallet native notifications | Activity alerts | N/A | N/A | Native | N/A | Often raw activity | No | Bundle | Reach | Can amplify confusion | OTV supplies independent verdict |
| Forta / security bots | On-chain monitoring | Yes | Yes | Limited | Limited | Alerts | No | Mixed | Detection | Not spendability schema | OTV standardizes verdict schema |
| MetaMask / Phantom security | In-wallet warnings | N/A | N/A | Native | N/A | Partial | No | Bundle | UX presence | Proprietary | OTV vendor-neutral API/SDK |
| POP Trust (sister) | Human promise / presence | Yes | Partial | N/A | POP explorer | Commitments, not token spendability | Receipts | Tiered | Brand trust | Different domain | Shared brand; distinct product |

## Positioning statement

OTV does **not** claim “no competitors.” It claims a specific gap: **independent, explainable, signed verification that an incoming event represents spendable value for a recipient**, designed for wallet/explorer integration without collapsing chain concepts.

## RESEARCH REQUIRED

- Latest pricing pages and partnership lists before sales materials
- Adoption metrics for simulation wallets (source: vendor blogs / filings)
