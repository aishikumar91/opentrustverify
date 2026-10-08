# Open Trust

Real-time on-chain fraud interception and verification console. An admin
fires known deception vectors against **wallets they control**; a separate
verification engine scans the resulting live transaction and flags it,
proving detection works against real chain data rather than mocked
fixtures.

## Architecture

```
┌─────────────────────┐        ┌──────────────────────────┐
│   Admin trigger      │  tx    │   Base Sepolia (testnet) │
│   console (frontend) │ ─────► │   real broadcast          │
└──────────┬───────────┘        └─────────────┬─────────────┘
           │ POST /api/admin/execute-attack    │
           ▼                                   │ txHash
┌──────────────────────┐                       │
│  liveEngine.ts        │◄──────allowlist.ts────┘
│  (signer, testnet)     │   target must be admin-owned
└──────────────────────┘
           │ txHash
           ▼
┌──────────────────────┐        ┌──────────────────────────┐
│ verifierService.ts     │ ────► │ Vertex AI Agent / Gemini   │
│ (read-only RPC scan)   │       │ (threat categorization)    │
└──────────┬────────────┘        └─────────────┬─────────────┘
           │ ThreatAssessment                   │
           ▼                                     │
┌──────────────────────────────────────────────────┐
│         Verification ledger (frontend)             │
└──────────────────────────────────────────────────┘
```

## Safety boundary

`liveEngine.ts` can only send transactions to addresses listed in the
`ADMIN_ALLOWLIST` environment variable. `assertAllowlisted()` runs before
every signed transaction and throws `NotAllowlistedError` otherwise — this
check is the reason the trigger console can be pointed at a live network
without risk to anyone but the admin's own test wallets. Do not remove it,
bypass it with a flag, or widen it beyond wallets you personally control.

Defaults to **Base Sepolia** (testnet). Nothing here should be pointed at
mainnet addresses that aren't yours.

## Setup

```bash
npm install
cp .env.example .env.local
# fill in ADMIN_SIGNER_PRIVATE_KEY, ADMIN_ALLOWLIST, and API keys
npm run dev
```

Fund the signer wallet from the [Base Sepolia faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
before firing any vector.

## Project layout

- `src/lib/allowlist.ts` — the admin allowlist chokepoint
- `src/lib/auth.ts` — signed-cookie admin session (HMAC, expiring, HttpOnly)
- `src/lib/webauthn.ts` / `passkeysStore.ts` — WebAuthn passkey wallet linking (credential id + public key; optional linked EVM address)
- `src/pages/api/admin/passkeys/*` — session-gated register / assert / list / unlink
- `src/services/liveEngine.ts` — signs and broadcasts the three demo vectors
- `src/services/verifierService.ts` — read-only RPC scan + threat assessment
- `src/agent/system-prompt.md` — system prompt for the Vertex AI Agent Builder / ADK agent
- `src/pages/index.tsx` — public landing page with the verification explorer
- `src/pages/admin/login.tsx` — admin login
- `src/pages/admin/index.tsx` — trigger console + ledger, session-gated via `getServerSideProps`
- `src/pages/api/auth/login.ts`, `logout.ts` — session issuance/teardown
- `src/pages/api/admin/execute-attack.ts` — trigger API route (session required)
- `src/pages/api/verify/[txHash].ts` — verification API route (public, read-only)
- `src/components/OpenTrustDashboard.tsx` — admin trigger console + ledger
- `src/components/VerificationExplorer.tsx` — public read-only lookup, embedded on the landing page

## Who can do what

- **Public** (`/`, the verification explorer, `/api/verify/[txHash]`): read-only.
  Pulls live chain state and returns a verdict. Cannot sign or broadcast
  anything, so it's safe to expose to anyone who lands on the site.
- **Admin** (`/admin`, `/api/admin/execute-attack`): requires a session from
  `/admin/login`. This is the only surface that can reach `liveEngine.ts`
  and therefore the only one that costs real gas or touches a wallet.

Set `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET` in
`.env.local` before deploying — without them the login route and the
`/admin` redirect both fail closed (no credentials configured → no access),
which is the safe default, not a bug.

## Wiring the Vertex AI agent

Deploy `src/agent/system-prompt.md` as the `system_instruction` for a
Vertex AI Agent Builder app (or an ADK agent) with the four tools described
in that file. Set `VERTEX_AGENT_ENDPOINT` in `.env.local` to its HTTP
endpoint. Until that's set, `verifierService.ts` falls back to an
equivalent local scoring function so the dashboard works end-to-end
immediately.
