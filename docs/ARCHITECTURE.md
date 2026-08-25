# Architecture — OpenTrust Verify

## System context

```mermaid
flowchart LR
  Wallet[Wallet / App] --> SDK[OTV SDK]
  Explorer[Explorer] --> SDK
  SDK --> API[OTV API]
  VerifierUI[Public Verifier] --> API
  Dashboard[Enterprise Dashboard] --> API
  API --> Engine[Verification Engine]
  Engine --> Adapters[Chain Adapters]
  Adapters --> RPC[Blockchain RPC]
  Engine --> Sign[Signing Service]
  API --> PG[(PostgreSQL)]
  API --> Redis[(Redis)]
  API --> WH[Webhook Service]
```

## Verification pipeline

```mermaid
flowchart TD
  A[Incoming Claim] --> B[Transaction Lookup]
  B --> C[Execution Verification]
  C --> D[Asset Verification]
  D --> E[Recipient Verification]
  E --> F[Amount Verification]
  F --> G[Balance Delta]
  G --> H[Finality]
  H --> I[Spendability]
  I --> J[Risk Intelligence]
  J --> K[Verdict]
  K --> L[Cryptographic Signature]
```

## Monorepo layout

See root `README.md`. Apps consume packages; services own runtime; database owns schema.

## Trust boundary

Clients never receive signing keys. Verdicts are signed server-side. Signature verification is public.

## Tenancy

`organizations` → `projects` → `api_keys` / `webhooks` / usage. Row-level tenant filters in queries.
