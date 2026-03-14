---
title: Data Services
sidebar_label: Overview
sidebar_position: 0
description: Access external blockchain data APIs — Etherscan, Sourcify, CoinGecko, 4Byte, ChainList, and token portfolio services
---

# Data Services

Independent API clients for external blockchain data sources — Etherscan, Sourcify, CoinGecko, 4Byte Directory, and Chainlist. These services are already used internally by Nethereum.Wallet (portfolio, chain selection, gas pricing), Nethereum.Explorer (ABI decoding, transaction input simulation), and the EVM simulator (trace decoding), but they are fully standalone and can be used independently in any application.

## What Can I Do?

| I want to... | Guide | Key Package |
|--------------|-------|-------------|
| Look up a contract's ABI from Sourcify or Etherscan | [ABI Retrieval](guide-abi-retrieval) | `Nethereum.DataServices` |
| Verify a contract via Sourcify V2 | [Sourcify API](guide-sourcify-api) | `Nethereum.DataServices` |
| Decode unknown calldata with 4Byte Directory | [Sourcify API](guide-sourcify-api#4byte-signature-service) | `Nethereum.DataServices` |
| Store Sourcify data in PostgreSQL | [Sourcify API](guide-sourcify-api#local-postgresql-database) | `Nethereum.Sourcify.Database` |
| Scan thousands of known tokens against a wallet via multicall (no indexer needed) | [Token Portfolio](guide-token-portfolio) | `Nethereum.TokenServices` |
| Get token balances with CoinGecko prices | [Token Portfolio](guide-token-portfolio) | `Nethereum.TokenServices` |
| Manage a persistent token catalog | [Token Portfolio](guide-token-portfolio#token-catalog-for-persistent-registries) | `Nethereum.TokenServices` |
| Discover RPC endpoints and chain metadata | [Chainlist RPC](guide-chainlist-rpc) | `Nethereum.DataServices` |
| Get native currency info and block explorers | [Chainlist RPC](guide-chainlist-rpc) | `Nethereum.DataServices` |
| Query gas prices from Etherscan | [Etherscan API](guide-etherscan-api) | `Nethereum.DataServices` |
| Query account transactions and token transfers | [Etherscan API](guide-etherscan-api) | `Nethereum.DataServices` |
| Download bulk Sourcify data (Parquet exports) | [Sourcify API](guide-sourcify-api#parquet-bulk-exports) | `Nethereum.DataServices` |
| Get token prices and metadata from CoinGecko | [CoinGecko API](guide-coingecko-api) | `Nethereum.DataServices` |
| Map chain IDs to CoinGecko platform identifiers | [CoinGecko API](guide-coingecko-api) | `Nethereum.DataServices` |

## Packages

| Package | Description |
|---------|-------------|
| [`Nethereum.DataServices`](nethereum-dataservices) | Etherscan, Sourcify V2, CoinGecko, 4Byte Directory, Chainlist API clients + composite ABI retrieval |
| [`Nethereum.Sourcify.Database`](nethereum-sourcify-database) | EF Core (PostgreSQL) implementation for local Sourcify data storage |
| [`Nethereum.TokenServices`](nethereum-tokenservices) | ERC-20 token discovery, multicall balances, pricing, multi-account scanning, and token catalog |

## Learning Path

1. **[ABI Retrieval](guide-abi-retrieval)** — Start here to fetch contract ABIs from multiple sources with automatic fallback
2. **[Token Portfolio](guide-token-portfolio)** — Build wallet portfolio displays with token balances and prices
3. **[Chainlist RPC](guide-chainlist-rpc)** — Discover EVM chains, RPC endpoints, and native currencies
4. **[Etherscan API](guide-etherscan-api)** — Query gas prices, account transactions, balances, and contract data
5. **[Sourcify API](guide-sourcify-api)** — Verify contracts, decode selectors, and sync bulk Parquet exports
6. **[CoinGecko API](guide-coingecko-api)** — Fetch token metadata and prices directly from CoinGecko
