---
title: DeFi & Protocols
sidebar_label: Overview
sidebar_position: 1
description: Uniswap DEX, Permit2, x402 payments, Gnosis Safe, Optimism, GSN, and Circles protocol integrations
---

# DeFi & Protocols

Nethereum provides typed contract services for interacting with DeFi protocols and deeper integrations with specific Ethereum protocols.

## Uniswap (V2/V3/V4)

The `Nethereum.Uniswap` package covers:

- **Universal Router** — main entry point for executing swaps
- **Permit2** — gasless, signature-based token approval mechanism
- **Quoter V2** — on-chain quoting for swap amounts
- **Pool interaction** — direct access to V3 pool state

### Permit2: Gasless Token Approvals

```csharp
// One-time ERC-20 approval granting Permit2 unlimited access
var permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
var erc20 = web3.Eth.ERC20.GetContractService("0xTokenAddress");
var receipt = await erc20.ApproveRequestAndWaitForReceiptAsync(
    permit2Address, BigInteger.Parse("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    System.Globalization.NumberStyles.HexNumber));
```

After the one-time approval, all future authorizations are handled via off-chain signatures.

## x402 Crypto Payments

`Nethereum.X402` implements the HTTP 402 Payment Required protocol for pay-per-request APIs with Ethereum payments, including ASP.NET Core middleware and EIP-3009 signed authorizations.

## Protocol Integrations

| Package | Protocol | Description |
|---|---|---|
| `Nethereum.GnosisSafe` | Gnosis Safe | Multi-signature wallet transaction assembly and execution |
| `Nethereum.GSN` | Gas Station Network | Meta-transactions — users pay no gas |
| `Nethereum.Circles` | Circles UBI | Universal Basic Income protocol |
| `Nethereum.Optimism` | Optimism | L2 bridge deposits, withdrawals, and cross-domain messaging |
