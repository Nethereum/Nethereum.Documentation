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
| Verify a contract via Sourcify V2 | [ABI Retrieval](guide-abi-retrieval) | `Nethereum.DataServices` |
| Decode unknown calldata with 4Byte Directory | [ABI Retrieval](guide-abi-retrieval) | `Nethereum.DataServices` |
| Store Sourcify data in PostgreSQL | [ABI Retrieval](guide-abi-retrieval#local-sourcify-database) | `Nethereum.Sourcify.Database` |
| Get ERC-20 token balances for a wallet | [Token Portfolio](guide-token-portfolio) | `Nethereum.TokenServices` |
| Discover tokens and refresh prices (CoinGecko) | [Token Portfolio](guide-token-portfolio) | `Nethereum.TokenServices` |
| Manage a persistent token catalog | [Token Portfolio](guide-token-portfolio#token-catalog-for-persistent-registries) | `Nethereum.TokenServices` |
| Query gas prices from Etherscan | [Chain Metadata](guide-chain-metadata) | `Nethereum.DataServices` |
| Discover RPC endpoints from Chainlist | [Chain Metadata](guide-chain-metadata) | `Nethereum.DataServices` |

## Packages

| Package | Description |
|---------|-------------|
| [`Nethereum.DataServices`](nethereum-dataservices) | Etherscan, Sourcify V2, CoinGecko, 4Byte Directory, Chainlist API clients + composite ABI retrieval |
| [`Nethereum.Sourcify.Database`](nethereum-sourcify-database) | EF Core (PostgreSQL) implementation for local Sourcify data storage |
| [`Nethereum.TokenServices`](nethereum-tokenservices) | ERC-20 token discovery, multicall balances, pricing, multi-account scanning, and token catalog |

## Learning Path

1. **[ABI Retrieval](guide-abi-retrieval)** — Start here to fetch contract ABIs from multiple sources with automatic fallback
2. **[Token Portfolio](guide-token-portfolio)** — Build wallet portfolio displays with token balances and prices
3. **[Chain Metadata](guide-chain-metadata)** — Query gas prices, discover RPC endpoints, and fetch chain information
