---
title: DevChain Quick Start
sidebar_label: DevChain Quick Start
sidebar_position: 2
description: Run a local Ethereum dev chain in-process with no external dependencies
---

# DevChain Quick Start

Nethereum includes a full in-process Ethereum node. No Docker, no Geth binary, no external dependencies — just add the NuGet package and start coding.

## Install

```bash
dotnet add package Nethereum.DevChain
```

## Basic Usage

```csharp
using Nethereum.DevChain;
using Nethereum.Web3.Accounts;

// Create an account and start a dev chain
var account = new Account("0xb5b1870957d373ef0eeffecc6e4812c0fd08f554b37b233526acc331bf1544f7");
var devChain = new DevChainNode();
await devChain.StartAsync(account);  // Pre-funds the account with 10,000 ETH

// Create a Web3 instance connected to the in-process node
var web3 = devChain.CreateWeb3(account);

// Use web3 as normal
var balance = await web3.Eth.GetBalance.SendRequestAsync(account.Address);
Console.WriteLine($"Balance: {Web3.Convert.FromWei(balance.Value)} ETH");

// Transfer ETH
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync("0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae", 1.0m);
```

## Configuration

```csharp
var config = new DevChainConfig
{
    ChainId = 1337,
    BlockGasLimit = 30_000_000,
    AutoMine = true,                    // Mine instantly on each transaction
    InitialBalance = BigInteger.Parse("10000000000000000000000")  // 10,000 ETH
};

var devChain = new DevChainNode(config);
await devChain.StartAsync(account);
```

## Multiple Accounts

```csharp
// Generate and fund multiple accounts
var accounts = await devChain.GenerateAndFundAccountsAsync(5);

// Or pass specific accounts
var alice = new Account("0x...");
var bob = new Account("0x...");
await devChain.StartAsync(alice, bob);
```

## Factory Methods

```csharp
// One-liner: create, configure, and start
var devChain = await DevChainNode.CreateAndStartAsync(account);
var web3 = devChain.CreateWeb3(account);
```

## In-Memory (No SQLite)

```csharp
var devChain = DevChainNode.CreateInMemory();
await devChain.StartAsync(account);
```

## Persistent Storage

```csharp
// Data survives restarts
var devChain = new DevChainNode(config, "./mychain/chain.db", persistDb: true);
await devChain.StartAsync(account);
```

## Snapshots and Reverts

```csharp
var snapshot = await devChain.TakeSnapshotAsync();

// ... do transactions ...

await devChain.RevertToSnapshotAsync(snapshot);  // Undo everything since snapshot
```

## Time Manipulation

DevChain supports Hardhat/Anvil-compatible time manipulation via RPC:

- `evm_increaseTime` — advance the clock
- `evm_setNextBlockTimestamp` — set exact timestamp for next block
- `evm_mine` — mine a block manually
- `evm_snapshot` / `evm_revert` — state snapshots
- `hardhat_setBalance` / `hardhat_setCode` / `hardhat_setNonce` — state overrides

## HTTP Server

To expose DevChain as an HTTP endpoint (for MetaMask, Foundry, Hardhat, or any Ethereum tool):

```bash
dotnet add package Nethereum.DevChain.Server
```

## Aspire Template

For a complete dev environment with DevChain + PostgreSQL + Indexer + Explorer:

```bash
dotnet new install Nethereum.Aspire.TemplatePack
dotnet new nethereum-devchain -n MyChain
cd MyChain/AppHost && dotnet run
```
