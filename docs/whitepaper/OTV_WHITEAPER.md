# OpenTrust Verify Whitepaper

**Version:** 0.2.0-draft  
**Date:** 2026-08-25  
**Brand:** POP Trust · Product: OpenTrust Verify (OTV)  
**Tagline:** Trust the balance, not just the blockchain event.  
**Domain:** `verify.poptrust.me`

> This document is an engineering whitepaper for reviewers (wallets, exchanges, auditors, standards bodies). Market sizing claims are marked **RESEARCH REQUIRED**.

## 1. Executive Summary

OpenTrust Verify is a vendor-neutral verification layer that evaluates whether an observed incoming digital-asset event represents **verified, spendable value** for a recipient. It produces explainable evidence and a cryptographically signed verdict (`otv.verdict.v1`) for wallets, exchanges, explorers, and fintech applications.

OTV does not custody keys, replace explorers, or invent balances. It verifies evidence.

## 2. Problem

Blockchain explorers correctly display events. Non-technical users often interpret those events as “the money has arrived.” Attackers exploit that gap using transaction hashes, pending transfers, token events, and apparent balances.

## 3. Why Existing UX Fails

Existing tools optimize for chain fidelity, not recipient spendability. They expose RPC-level concepts (calldata, logs, confirmations, decimals) and leave interpretation to the user. Simulation tools protect *outbound* signing; OTV addresses *inbound* value interpretation.

## 4. Threat Model

Primary social-engineering threat: technically true but economically misleading chain data. Additional threats: forged claims, compromised RPC, malicious tokens, replayed verdicts, API abuse, webhook SSRF/spoofing. See `docs/THREAT_MODEL.md`.

## 5. Vision

A global interoperable trust standard that moves complexity off the user: independent evaluation, clear trust states, signed verdicts, and auditable evidence — born from consumer-protection pressure in emerging markets, designed for global infrastructure.

## 6. Design Principles

1. Never collapse activity / execution / transfer / balance / finality / spendability.
2. Deterministic verification first; AI only explains after a verdict.
3. Evidence required for every verdict.
4. Chain-specific policies via adapters.
5. Vendor neutrality.
6. Explicit confidence and mock/live honesty.

## 7. Verification Model

```
Claim → Lookup → Execution → Asset → Recipient → Amount → Balance Δ → Finality → Spendability → Risk → Signed Verdict
```

Implemented in `@otv/verification-engine` with evidence at each stage.

## 8. Trust States

`OBSERVED | PENDING | EXECUTED | ASSET_CONFIRMED | BALANCE_CONFIRMED | FINAL | SPENDABLE | REJECTED | SUSPICIOUS | UNVERIFIED`

Happy path and failure transitions are enforced in `@otv/verdict-schema`.

## 9. Architecture

TypeScript Fastify API + verification engine + chain adapters + Postgres schema + Redis (coordination target) + SDKs + dashboard + public verifier. See `docs/ARCHITECTURE.md`.

**MVP runtime honesty:** API may use an in-memory store for demos; Postgres migrations are present for durable deployment. Set `ETH_RPC_URL` for live Ethereum JSON-RPC; otherwise mock adapter is used and risk signals disclose `MOCK_ADAPTER`.

## 10. Signed Verdicts

Canonical JSON → SHA-256 → Ed25519 → hex signature + `kid`. Public verification via `POST /v1/verdicts/verify`. Production requires KMS/HSM (interface pending).

## 11. Wallet Integration

SDK `verifyIncomingTransfer` maps status to safe notifications. Demo wallet shows raw vs verified. See `WALLET_INTEGRATION.md`.

## 12. Explorer Integration

Additive components: `VerificationBadge`, `TransactionTrustPanel`, `EvidenceTimeline`, `VerdictCard`, `SignatureVerification` in `@otv/ui`. Raw chain data remains visible.

## 13. API

REST `/v1/*` with OpenAPI (`/docs`). API keys for developers. Session/OIDC path specified; MVP gates enterprise routes with API keys until SSO lands.

## 14. SDK

TypeScript (`@otv/sdk-core`), React hooks (`@otv/sdk-react`), Flutter stub.

## 15. Security

Hashed API keys, Helmet, rate limits, webhook HMAC + SSRF deny-list + retries, Zod validation, server-side signing on API path. Browser demo mode is explicitly labeled and must not be used as production signing.

## 16. Privacy

Minimize PII; store claims/verdicts needed for audit; tenant isolation via org/project FKs when Postgres is wired.

## 17. Governance

RFC process OTV-0001…0010. Conformance suite gates “OTV Compatible” claims. Certification marks require authorization (`TRADEMARK_POLICY.md`).

## 18. Licensing

Pending legal review. Separate open protocol artifacts vs hosted service vs trademarks.

## 19. Business Model

FREE / DEVELOPER / BUSINESS / ENTERPRISE + optional certification programs without misleading claims. Billing provider abstracted.

## 20. Adoption

Wallet and explorer profiles; sandbox; clear docs; African-origin insight, global standard positioning.

## 21. Roadmap

1. Mock MVP (done)  
2. Live Ethereum RPC (adapter live path landed; ops hardening)  
3. Postgres persistence wiring  
4. KMS + Redis queues  
5. SSO/OIDC  
6. Multi-chain adapters  
7. Conformance suite + certification

## 22. Research

See `docs/research/COMPETITOR_ANALYSIS.md`. **RESEARCH REQUIRED** before publishing TAM/SAM or competitor pricing in sales materials.

## 23. Limitations

- Mock adapter when RPC unset (disclosed via risk signal)
- MVP API may use memory store until Postgres wiring
- Browser demo signing is for UI previews only
- Single-provider RPC confidence model in MVP
- Billing abstracted

## 24. Conclusion

OTV does not invent money. It verifies evidence so users can trust the balance—not just the blockchain event.
