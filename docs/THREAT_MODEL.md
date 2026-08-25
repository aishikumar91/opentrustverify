# THREAT_MODEL.md — OpenTrust Verify

## Assets

- Verdict integrity and signatures
- API keys and session credentials
- Signing private keys
- Tenant data (orgs, projects, audit logs)
- Webhook endpoints and secrets

## Actors

| Actor | Intent |
|-------|--------|
| External attacker | Forge verdicts, abuse API, SSRF via webhooks |
| Malicious API client | Replay, scrape, DoS |
| Compromised RPC | Lie about inclusion/balance |
| Compromised indexer | Poison observations |
| Malicious token | Fake metadata / honeypot |
| Fake transaction claim | Social-engineer via hash |
| Insider | Exfiltrate signing keys |

## Threats & mitigations (MVP)

| Threat | Mitigation |
|--------|------------|
| Fake claim | Independent chain lookup via adapter |
| Replay of verdict | `expiresAt`, `verdictId`, nonce optional |
| Forged signature | Public key verify endpoint; key rotation |
| API abuse | Redis rate limits, hashed API keys |
| Webhook spoofing | HMAC signatures, retries with idempotency |
| SQL injection | Parameterized queries |
| XSS | CSP, React escaping, sanitize JSON viewers |
| SSRF | Webhook URL allowlist / block private IPs |
| Compromised RPC | Multi-provider interface (future); confidence ↓ |
| Key theft | Keys never in client; file/KMS boundary |
| Supply chain | Lockfile, CI dependency scan hooks |

## Explicit non-mitigation (documented)

OTV cannot prevent a user from ignoring the verdict. UX must make status unmistakable (color + icon + text).

## Residual risk

Single RPC provider in MVP; mark confidence accordingly when using mock adapter (`confidence` capped).
