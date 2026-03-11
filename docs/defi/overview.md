---
title: DeFi & Protocols
sidebar_label: Overview
sidebar_position: 1
description: Uniswap DEX trading, Gnosis Safe multi-sig, x402 payments, and Circles UBI protocol integrations with Nethereum
---

# DeFi & Protocols

Nethereum provides typed, high-level services for interacting with major DeFi protocols and Ethereum ecosystem tools. Each integration wraps the protocol's smart contracts in a C# API — you get compile-time safety, automatic gas/nonce handling, and the same `web3.Eth` patterns used throughout Nethereum.

## The Simple Path

| Task | Simple Path |
|------|-------------|
| Access Uniswap V4 | `web3.UniswapV4()` |
| Quote a swap price | `uniswap.Pricing.Quoter.QuoteExactInputQueryAsync(params)` |
| Execute a swap | `uniswap.UniversalRouter.ExecuteRequestAndWaitForReceiptAsync(fn)` |
| Manage liquidity | `uniswap.Positions.Manager.ModifyLiquiditiesRequestAndWaitForReceiptAsync(fn)` |
| Execute through Safe | `new SafeAccount(safe, chainId, key)` → any contract service auto-routes through Safe |
| Protect API with payments | `[X402PaymentRequired(amount: 1_000000)]` on any ASP.NET endpoint |
| Pay for API access | `new X402Client(http, web3, key).GetAsync(url)` |
| Query Circles balance | `new GetTotalBalanceV2(client).SendRequestAsync(address)` |

For every row above, Nethereum handles gas estimation, nonce management, EIP-1559 fee calculation, and transaction signing automatically. You only override when you need to.

## Protocol Packages

| Package | Protocol | What It Does |
|---------|----------|-------------|
| `Nethereum.Uniswap` | Uniswap V2/V3/V4 | Token swaps, liquidity positions, price quoting, Permit2, Universal Router |
| `Nethereum.GnosisSafe` | Safe (Gnosis Safe) | Multi-signature transaction assembly, EIP-712 signing, SafeAccount, MultiSend |
| `Nethereum.X402` | x402 Protocol | HTTP 402 payments with EIP-3009 USDC transfers, ASP.NET middleware, client library |
| `Nethereum.Circles` | Circles UBI | Balance queries, personal minting, trust management, transaction history |

## Guides

| Guide | What You'll Learn |
|-------|-------------------|
| [Uniswap: Swap Tokens](guide-uniswap-swap) | Quote prices, execute swaps via Universal Router, handle slippage and price impact |
| [Uniswap: Manage Liquidity](guide-uniswap-liquidity) | Create/increase/decrease positions, collect fees, atomic rebalancing |
| [Gnosis Safe](guide-gnosis-safe) | Build multi-sig transactions, collect signatures, SafeAccount, MultiSend |
| [x402 Payments](guide-x402-payments) | Protect API endpoints, accept USDC payments, EIP-3009 authorization flow |
| [Circles UBI](guide-circles) | Query balances, mint CRC, manage trust relationships on Gnosis Chain |
