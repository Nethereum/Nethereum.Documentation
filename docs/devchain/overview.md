---
title: DevChain
sidebar_label: Overview
sidebar_position: 1
description: Local Ethereum dev chain — instant mining, Hardhat/Anvil compatibility, snapshots, forking, Aspire orchestration
---

# DevChain

Nethereum DevChain is a local Ethereum development chain that runs inside your application. No Docker, no external processes — just add the NuGet package and start writing tests or building your app.

Built on [Chain Infrastructure](/docs/chain-infrastructure/overview) (CoreChain), DevChain adds instant mining, SQLite storage, funded accounts, and full compatibility with Hardhat and Anvil development methods.

## Quick Start

```bash
dotnet add package Nethereum.DevChain
```

```csharp
using Nethereum.DevChain;
using Nethereum.Web3.Accounts;

var account = new Account("0xb5b1870957d373ef0eeffecc6e4812c0fd08f554b37b233526acc331bf1544f7");
var devChain = new DevChainNode();
await devChain.StartAsync(account);         // Pre-funds the account with 10,000 ETH
var web3 = devChain.CreateWeb3(account);    // In-process Web3 — no HTTP

// Use web3 as normal
var balance = await web3.Eth.GetBalance.SendRequestAsync(account.Address);
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync("0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae", 1.0m);
```

Transactions are mined instantly by default. `CreateWeb3` wires directly to the in-process node — no HTTP overhead, no port conflicts.

## Key Features

| Feature | Description |
|---------|-------------|
| **Instant Mining** | Auto-mine on each transaction, or configure interval mining |
| **Funded Accounts** | Pre-fund with 10,000 ETH by default, or specify custom balances |
| **Snapshots** | `TakeSnapshotAsync()` / `RevertToSnapshotAsync()` for test isolation |
| **Forking** | Fork mainnet or any EVM chain with `ForkUrl` / `ForkBlockNumber` |
| **State Manipulation** | `SetBalanceAsync`, `SetCodeAsync`, `SetNonceAsync`, `SetStorageAtAsync` |
| **Time Control** | `evm_increaseTime`, `evm_setNextBlockTimestamp` for time-dependent contracts |
| **Debug Tracing** | `debug_traceTransaction` and `debug_traceCall` with opcode-level detail |
| **Hardhat/Anvil Compat** | Same default mnemonic, same RPC methods, same chain ID (31337) |
| **HTTP Server** | Expose as HTTP endpoint for MetaMask, Foundry, ethers.js |
| **Full EVM** | Complete execution up to Prague hardfork via Nethereum.EVM |

## Configuration Presets

```csharp
// Default: ChainId 1337, auto-mine, 10,000 ETH per account
var devChain = new DevChainNode();

// Hardhat compatible: ChainId 31337
var devChain = new DevChainNode(DevChainConfig.Hardhat);

// Anvil compatible: ChainId 31337
var devChain = new DevChainNode(DevChainConfig.Anvil);

// In-memory (no SQLite, fastest)
var devChain = DevChainNode.CreateInMemory();
```

## Aspire Template

Get a complete dev environment with one command:

```bash
dotnet new install Nethereum.Aspire.TemplatePack
dotnet new nethereum-devchain -n MyChain
cd MyChain/AppHost && dotnet run
```

This creates an Aspire-orchestrated environment with:

- **DevChain node** — in-process Ethereum node with prefunded accounts
- **PostgreSQL** — database for blockchain data storage
- **Blockchain indexer** — crawls and stores blocks, transactions, and logs
- **Blazor explorer** — web-based blockchain explorer with ABI-decoded contract interaction
- **Account abstraction bundler** — ERC-4337 UserOperation bundler
- **Load test generator** — automated transaction load testing

## Packages

| Package | Description |
|---|---|
| `Nethereum.DevChain` | Development chain with auto-mine, SQLite storage, and funded accounts |
| `Nethereum.DevChain.Server` | HTTP server wrapper — CLI tool and ASP.NET embedding |

## Guides

| Guide | What You'll Learn |
|---|---|
| [Quick Start](devchain-quickstart) | Create a node, fund accounts, send your first transaction |
| [HTTP Server & CLI](guide-http-server) | Run as standalone server, CLI options, connect from any language, Hardhat/Anvil migration |
| [Testing Patterns](guide-testing-patterns) | xUnit fixtures, snapshot/revert isolation, time manipulation, contract deployment |
| [Forking & State](guide-forking-and-state) | Fork mainnet, manipulate balances/code/storage, account impersonation |
| [Debug & Trace](guide-debug-trace) | Trace transactions at the opcode level, find reverts, track storage changes |

## Related

- [Chain Infrastructure](/docs/chain-infrastructure/overview) — the shared blockchain engine underneath
- [EVM Simulator](/docs/evm-simulator/overview) — the execution engine that powers DevChain
- [AppChains (Preview)](/docs/application-chain/overview) — production satellite chains with sequencer and P2P
