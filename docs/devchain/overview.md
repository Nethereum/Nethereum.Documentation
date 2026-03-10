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
await devChain.StartAsync(account);

var web3 = devChain.CreateWeb3(account);
var balance = await web3.Eth.GetBalance.SendRequestAsync(account.Address);
```

## Configuration

```csharp
var config = new DevChainConfig
{
    ChainId = 1337,
    BlockGasLimit = 30_000_000,
    AutoMine = true,
    InitialBalance = BigInteger.Parse("10000000000000000000000")
};

var devChain = new DevChainNode(config);
await devChain.StartAsync(account);
```

## Factory Methods

```csharp
var devChain = await DevChainNode.CreateAndStartAsync(account);
var devChain = DevChainNode.CreateInMemory();
```

## Features

### Snapshots and Revert

```csharp
var snapshot = await devChain.TakeSnapshotAsync();
// ... do transactions ...
await devChain.RevertToSnapshotAsync(snapshot);
```

### Hardhat / Anvil Compatibility

DevChain supports standard development methods:

- `evm_mine`, `evm_snapshot`, `evm_revert`
- `evm_increaseTime`, `evm_setNextBlockTimestamp`
- `hardhat_setBalance`, `hardhat_setCode`, `hardhat_setNonce`, `hardhat_setStorageAt`

### Forking

Fork state from a live Ethereum network for local testing against real data.

### Full EVM

Complete EVM execution up to Prague hardfork, including `debug_traceTransaction` and `debug_traceCall`.

## HTTP Server

Expose DevChain as an HTTP endpoint for MetaMask, Foundry, Hardhat, or any Ethereum tool:

```bash
dotnet add package Nethereum.DevChain.Server
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
| `Nethereum.DevChain.Server` | HTTP server wrapper for external tool access |

## Related

- [Chain Infrastructure](/docs/chain-infrastructure/overview) — the shared blockchain engine underneath
- [AppChains (Preview)](/docs/application-chain/overview) — production satellite chains with sequencer and P2P
