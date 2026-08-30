# OpenTrust Verify

Version 0.3.1. POP Trust. Product host: otv.poptrust.me.

Trust the balance, not just the blockchain event.

This paper is for wallet, exchange, explorer, and audit readers. It describes the problem, the check we run, and what we will not claim.

## Summary

OpenTrust Verify decides whether an observed incoming digital-asset event is spendable value for a named recipient. The API returns evidence and a signed verdict. We do not custody keys, replace explorers, or invent balances.

## The problem

Explorers show chain fidelity. Recipients hear "paid." A pending transfer, a lookalike token, or an event that never moved a balance can all look like a deposit. Attackers use technically true data.

Wallets already simulate outbound signatures. That answers "what happens if I sign." It does not answer "can the person who thinks they were paid actually spend it."

## What we refuse to mix

A chain event is not a successful execution. A successful execution is not a transfer. A transfer is not a balance increase. A balance increase is not finality. Finality is not spendable funds.

Indexers already know this. Current balances come from a state read (`balanceOf` or `eth_getBalance`) at a pinned block. Transfer logs tell you when to refresh. Summing logs is wrong on fee-on-transfer and rebasing tokens. We treat the state read as the source of truth for the amount that arrived.

## How a check runs

Claim, then lookup, then execution, then asset, then recipient, then amount, then balance change, then finality, then spendability, then risk, then a signed verdict.

Statuses: observed, pending, executed, asset confirmed, balance confirmed, final, spendable, rejected, suspicious, unverified. Happy-path and failure transitions are enforced in the verdict schema.

## Signatures

The API hashes a stable JSON form of the verdict and signs it with Ed25519. Anyone can POST the payload to `POST /v1/verdicts/verify`. Signing keys stay on the API. The product UI never signs.

## Runtime

The hosted product is a Fastify API with Postgres as the source of truth, Redis for rate limits and webhook delivery, and a single web app at otv.poptrust.me. Interactive API: `https://otv.poptrust.me/api/docs`.

When a live Ethereum RPC is configured, evidence comes from that node. When it is not, a mock adapter still returns a verdict and marks the result so a demo cannot be treated as chain proof.

## What we do not claim

Single sign-on is specified and returns 501 until an identity provider is configured. Card capture is not taken in the product UI. We do not publish market-size figures as facts. Certification marks require a written grant. HSM-backed keys are a next step, not a current claim.

## Limits you should know

A single RPC provider is a single point of view. Mock results are labeled. Verdicts expire. A spendable verdict is evidence at check time, not a promise the funds cannot later be frozen by a token issuer or a court.
