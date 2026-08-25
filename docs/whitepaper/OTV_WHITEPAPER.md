# OpenTrust Verify Whitepaper

**Version:** 0.1.0-draft  
**Brand:** POP Trust · Product: OpenTrust Verify (OTV)  
**Tagline:** Trust the balance, not just the blockchain event.

## 1. Executive Summary

OpenTrust Verify is a vendor-neutral verification layer that evaluates whether an observed incoming digital-asset event represents verified value for a recipient. It produces explainable evidence and a cryptographically signed verdict for wallets, exchanges, explorers, and fintech applications.

## 2. Problem

Blockchain explorers correctly display events. Non-technical users often interpret those events as “the money has arrived.” That gap enables social engineering using transaction hashes, pending transfers, token events, and apparent balances.

## 3. Why Existing UX Fails

Existing tools optimize for chain fidelity, not recipient spendability. They expose RPC-level concepts (calldata, logs, confirmations, decimals) and leave interpretation to the user.

## 4. Threat Model

Attackers present technically true but economically misleading chain data. Additional threats include forged claims, compromised RPC, malicious tokens, replayed verdicts, and API abuse. See `docs/THREAT_MODEL.md`.

## 5. Vision

A global interoperable trust standard that moves complexity off the user: independent evaluation, clear trust states, signed verdicts, and auditable evidence.

## 6. Design Principles

- Never collapse activity / execution / transfer / balance / finality / spendability
- Deterministic verification first; AI only explains
- Evidence required for every verdict
- Chain-specific policies via adapters
- Vendor neutrality

## 7. Verification Model

Pipeline: claim → lookup → execution → asset → recipient → amount → balance delta → finality → spendability → risk → signed verdict.

## 8. Trust States

OBSERVED, PENDING, EXECUTED, ASSET_CONFIRMED, BALANCE_CONFIRMED, FINAL, SPENDABLE, REJECTED, SUSPICIOUS, UNVERIFIED.

## 9. Architecture

API + verification engine + chain adapters + Postgres + Redis + SDKs + dashboard + public verifier. See `docs/ARCHITECTURE.md`.

## 10. Signed Verdicts

`otv.verdict.v1` with canonical serialization, SHA-256, Ed25519, key IDs, rotation, expiry.

## 11. Wallet Integration

SDK `verifyIncomingTransfer` → map status to safe notifications. Demo wallet shows raw vs verified.

## 12. Explorer Integration

Additive badges and panels; raw chain data remains visible.

## 13. API

REST `/v1/*` with OpenAPI. API keys for developers; session/SSO path for enterprises.

## 14. SDK

TypeScript core, React hooks, Flutter stub.

## 15. Security

Hashed keys, rate limits, webhook HMAC, server-side signing, threat-modeled controls.

## 16. Privacy

Minimize PII; store claims/verdicts needed for audit; tenant isolation.

## 17. Governance

RFC process (OTV-0001…). Conformance suite for certifications.

## 18. Licensing

Open protocol candidates vs proprietary hosted service — legal review required.

## 19. Business Model

FREE / DEVELOPER / BUSINESS / ENTERPRISE + optional certification programs without misleading claims.

## 20. Adoption

Wallet and explorer profiles; sandbox; clear docs; African-origin insight, global standard positioning.

## 21. Roadmap

MVP Ethereum + mock → multi-chain adapters → KMS → SSO → certification.

## 22. Research

Competitor landscape in `docs/research/COMPETITOR_ANALYSIS.md`.

## 23. Limitations

MVP uses mock/offline adapter when RPC unset; single-provider confidence capped; billing abstracted.

## 24. Conclusion

OTV does not invent money. It verifies evidence so users can trust the balance—not just the blockchain event.

**RESEARCH REQUIRED** for market sizing statistics before any public claim of TAM/SAM.
