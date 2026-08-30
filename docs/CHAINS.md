# Chain and token verification

You do not need a dedicated Ethereum RPC to run OTV.

## How live vs mock is chosen

- **Bitcoin**: Blockstream/Mempool Esplora by default. Set `BTC_ESPLORA_URL=off` or use network `mock` for offline.
- **EVM chains**: Public RPC by default in production (`EVM_PUBLIC_RPC=1`). Override with `ETH_RPC_URL`, `POLYGON_RPC_URL`, `BASE_RPC_URL`, and the other `*_RPC_URL` vars, or one shared `EVM_RPC_URL`. Set `EVM_PUBLIC_RPC=off` to force mock.
- **Solana / Tron**: Public RPC/API by default in production. Override with `SOLANA_RPC_URL` / `TRON_API_URL`.
- Tests (`VITEST`) stay on the mock path unless you set `EVM_PUBLIC_RPC=1`.

Public endpoints can rate-limit. For production volume, point the matching env var at your own node or provider.

## Tokens

On every EVM network the adapter reads:

- native coin (`tx.value`)
- ERC-20 `Transfer`
- ERC-721 `Transfer` (4 topics)
- ERC-1155 `TransferSingle`

`GET /v1/assets` is a convenience list (USDC, USDT, and similar). Any contract still verifies. Pass `asset.contract` and optional `asset.tokenId` when you want a specific token.

Bitcoin is native BTC only. Solana covers SOL plus SPL mints. Tron covers TRX plus TRC-20 when the transaction encodes a contract.

## Catalog

- `GET /v1/chains`
- `GET /v1/networks?chain=`
- `GET /v1/assets?chain=&network=`
