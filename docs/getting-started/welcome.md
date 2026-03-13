---
title: Welcome to Nethereum
sidebar_label: Welcome
sidebar_position: 1
description: Nethereum is the .NET integration platform for Ethereum and EVM-compatible blockchains
---

# Welcome to Nethereum

Nethereum is the .NET integration platform for Ethereum and EVM-compatible blockchains. Whether you're building a DeFi application, minting NFTs, indexing blockchain data, running your own Ethereum node, or integrating crypto payments into your API — Nethereum provides the tools to do it in C#.

## What Can You Build?

Nethereum includes **130+ packages** covering the full Ethereum development stack:

- **Smart contract interaction** — deploy, call, and listen to events for ERC-20, ERC-721, ERC-1155, ENS, and any custom contract
- **Code generation** — generate typed C# services from Solidity ABI
- **Local dev chain** — run a Hardhat/Anvil-compatible chain inside your app with instant mining
- **Blockchain engine** — pluggable storage, full EVM, RPC routing, Patricia trie
- **AppChains (Preview)** — production satellite chains with sequencer, P2P sync, and L1 anchoring
- **EVM simulator** — execute and debug EVM bytecode with step-by-step tracing
- **Blockchain data indexing** — crawl and store blocks, transactions, logs, and token transfers
- **Blockchain explorer** — Blazor Server explorer with ABI-decoded contract interaction
- **Token services** — discover tokens, fetch prices, scan balances across wallets
- **DeFi protocols** — Uniswap V2/V3/V4, x402 payments, Gnosis Safe, Permit2
- **Account abstraction** — ERC-4337 UserOperations, bundler, ERC-7579 modular smart accounts
- **MUD autonomous worlds** — table queries, store indexing, system lifecycle management
- **Multi-platform wallet** — MVVM architecture with Blazor and MAUI renderers
- **Unity game integration** — coroutine-based RPC, MetaMask WebGL, EIP-6963 wallet discovery
- **.NET Aspire orchestration** — full dev environment with one command

For the complete package catalog, see the [Component Catalog](/docs/component-catalog).

## Quick Start

Install the main package:

```bash
dotnet add package Nethereum.Web3
```

Connect to Ethereum and check a balance:

```csharp
using Nethereum.Web3;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR_API_KEY");
var balance = await web3.Eth.GetBalance.SendRequestAsync("0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae");
Console.WriteLine($"Balance: {Web3.Convert.FromWei(balance.Value)} ETH");
```

Ready to go deeper? Continue to [Installation](/docs/getting-started/installation).

## Try It in Your Browser

The [Nethereum Playground](http://playground.nethereum.com) lets you write and execute C# code against Ethereum directly in your browser — no setup required. It includes dozens of samples covering transfers, contracts, tokens, wallets, and more.

## How This Documentation Is Organised

| Section | What You'll Find |
|---|---|
| **[Getting Started](/docs/getting-started/installation)** | Install, create a project, send your first transaction |
| **[What Do You Want to Do?](/docs/what-do-you-want-to-do)** | 44 use cases mapped to guides and packages |
| **[Architecture Map](/docs/architecture)** | How 130+ packages are layered and relate to each other |
| **[Component Catalog](/docs/component-catalog)** | Every package with descriptions, READMEs, and links |

### Documentation Sections

| Section | What You'll Find |
|---|---|
| **[Core Foundation](/docs/core-foundation/overview)** | Transactions, blocks, gas, events, ABI encoding, JSON-RPC transport |
| **[Signing & Key Management](/docs/signing-and-key-management/overview)** | Private keys, HD wallets, hardware and cloud signers |
| **[Smart Contracts & Code Gen](/docs/smart-contracts/overview)** | Contract interaction, typed services, code generation, ENS, SIWE |
| **[DeFi & Protocols](/docs/defi/overview)** | Uniswap, x402 payments, Gnosis Safe, Optimism, Permit2 |
| **[EVM Simulator](/docs/evm-simulator/overview)** | Execute and debug EVM bytecode with step-by-step tracing |
| **[Chain Infrastructure](/docs/chain-infrastructure/overview)** | Shared blockchain engine — storage, block production, EVM execution, RPC routing |
| **[DevChain](/docs/devchain/overview)** | Local dev chain — instant mining, Hardhat/Anvil compatibility, Aspire orchestration |
| **[AppChains (Preview)](/docs/application-chain/overview)** | Production satellite chains — sequencer, P2P networking, L1 anchoring |
| **[Account Abstraction](/docs/account-abstraction/overview)** | ERC-4337 UserOps, bundler, ERC-7579 smart accounts |
| **[Data & Indexing](/docs/data-and-indexing/overview)** | Blockchain crawling, storage, explorer, token services |
| **[MUD Framework](/docs/mud-framework/overview)** | Autonomous worlds, table indexing, store queries |
| **[Wallet SDK](/docs/wallet-sdk/overview)** | Multi-platform wallet: MVVM ViewModels, Blazor/MAUI renderers, hardware wallets |
| **[Blazor dApp Integration](/docs/blazor-dapp-integration/overview)** | Browser wallets, EIP-6963, MetaMask, WalletConnect, SIWE authentication |
| **[Unity](/docs/unity/overview)** | Unity game engine, WebGL wallets, EIP-6963 |

## Community

- **Discord**: [Join the community](https://discord.gg/u3Ej2BReNn) — technical support, chat, and collaboration
- **GitHub**: [Nethereum/Nethereum](https://github.com/Nethereum/Nethereum) — source code, issues, and PRs
- **Playground**: [playground.nethereum.com](http://playground.nethereum.com) — executable samples in your browser
