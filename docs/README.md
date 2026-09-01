# OpenTrust Verify documentation

Canonical product docs live here. Root `README.md` and `AGENTS.md` are the only entry points above this folder.

## Architecture (Archify)

Interactive maps — open the HTML in a browser:

| Map | Type | File |
|-----|------|------|
| Runtime | architecture | [otv-runtime.html](architecture/otv-runtime.html) |
| `POST /v1/verify/incoming` | sequence | [otv-verify.html](architecture/otv-verify.html) |
| Verdict statuses | lifecycle | [otv-verdict.html](architecture/otv-verdict.html) |
| Evidence pipeline | dataflow | [otv-evidence.html](architecture/otv-evidence.html) |

Sources are the `docs/architecture/*.json` files. Do not edit a JSON after its HTML has been delivered; author a new map instead.

Narrative: [ARCHITECTURE.md](ARCHITECTURE.md). Decisions: [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md).

## Product and protocol

| Doc | What it is |
|-----|------------|
| [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) | PRD |
| [MVP_BOUNDARIES.md](MVP_BOUNDARIES.md) | What shipped vs later |
| [VERDICT_SPEC.md](VERDICT_SPEC.md) | `otv.verdict.v1` |
| [API_SPEC.md](API_SPEC.md) | HTTP contract |
| [api/API_REFERENCE.md](api/API_REFERENCE.md) | Route list and auth |
| [CHAINS.md](CHAINS.md) | Adapters, RPC env, tokens |
| [THREAT_MODEL.md](THREAT_MODEL.md) | Threats and mitigations |
| [whitepaper/OTV_WHITEPAPER.md](whitepaper/OTV_WHITEPAPER.md) | Public paper |

## Integrate

| Doc | Audience |
|-----|----------|
| [sdk/SDK_GUIDE.md](sdk/SDK_GUIDE.md) | TypeScript, React, Flutter, wallet + explorer UI |
| [webhooks/DELIVERY.md](webhooks/DELIVERY.md) | HMAC webhooks |

## Operate

| Doc | What it is |
|-----|------------|
| [DEPLOYMENT.md](DEPLOYMENT.md) | Boot order, env, frontend |
| [OPERATIONS.md](OPERATIONS.md) | Health, SLOs, incidents |
| [PENDING.md](PENDING.md) | Tracker |
| [PHASE_LOG.md](PHASE_LOG.md) | What each phase shipped |
| [security/KMS.md](security/KMS.md) | Key wrap |
| [security/OIDC.md](security/OIDC.md) | SSO |
| [database/POSTGRES.md](database/POSTGRES.md) | Schema notes |
| ../infra/deployment/README.md | Production topology |

## Governance

[GOVERNANCE.md](governance/GOVERNANCE.md) · [LICENSING.md](governance/LICENSING.md) · RFCs in [rfc/](rfc/) · Conformance [OTV-0010](conformance/OTV-0010-CONFORMANCE.md)

## Historical

[GAP_ANALYSIS.md](GAP_ANALYSIS.md) is a 2026-08-25 snapshot. Postgres, Redis, live adapters, OIDC, and webhooks landed after it. Prefer this index, `PENDING.md`, and the code.

Context dumps for agents: [handoffs/project-context/README.md](handoffs/project-context/README.md).
