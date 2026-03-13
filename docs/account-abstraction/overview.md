---
title: Account Abstraction
sidebar_label: Overview
sidebar_position: 1
description: ERC-4337 account abstraction with smart accounts, bundlers, paymasters, and modular ERC-7579 modules in .NET
---

# Account Abstraction (ERC-4337 / ERC-7579)

ERC-4337 replaces externally-owned account (EOA) transactions with **UserOperations** — signed intents processed by a **Bundler** and executed through an on-chain **EntryPoint** contract. This enables smart contract wallets with features impossible with EOAs: batched calls, gas sponsorship, social recovery, session keys, and modular validation logic.

Nethereum provides a complete ERC-4337 stack: client libraries for building and sending UserOperations, an in-process bundler with mempool and reputation, typed contract services that route through AA automatically, and ERC-7579 modular account support.

## Architecture

```
User signs UserOperation
        |
        v
   Bundler (JSON-RPC)
        |
        v
   EntryPoint.handleOps()
        |
        +--> SmartAccount.validateUserOp()
        |         |
        |         +--> (optional) Paymaster.validatePaymasterUserOp()
        |
        +--> SmartAccount.execute(callData)
```

The Bundler collects UserOperations from users, validates them, estimates gas, and submits them to the EntryPoint contract in a batch transaction. The EntryPoint verifies each operation's signature via the smart account's validation logic, optionally checks a Paymaster for gas sponsorship, then executes the call.

## The Simple Path

Most developers don't need to build UserOperations manually. Nethereum's `AAContractHandler` lets you switch any existing typed contract service to route through Account Abstraction automatically:

```csharp
using Nethereum.AccountAbstraction;

// Any existing contract service — ERC-20, ERC-721, or your own
var erc20Service = web3.Eth.ERC20.GetContractService(tokenAddress);

// One line: switch to AA. All future calls become UserOperations.
erc20Service.ChangeContractHandlerToAA(
    accountAddress, privateKey, bundlerUrl, entryPointAddress);

// Use the service exactly as before — AA is transparent
var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(
    new TransferFunction { To = recipient, Value = amount });
```

Gas estimation, nonce management, signing, and bundler submission are all handled automatically.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **UserOperation** | A signed intent describing what a smart account should execute. Replaces traditional transactions. |
| **Smart Account** | A contract wallet that validates and executes UserOperations. Supports custom validation logic. |
| **Bundler** | An off-chain service that collects UserOperations and submits them to the EntryPoint. |
| **EntryPoint** | The singleton on-chain contract that coordinates validation and execution of UserOperations. |
| **Paymaster** | An optional contract that sponsors gas for UserOperations, enabling gasless transactions. |
| **Factory** | A contract that deploys new smart accounts via CREATE2 for deterministic addresses. |

## EntryPoint Versions

| Version | Address | Notes |
|---------|---------|-------|
| V06 | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` | Original ERC-4337 |
| V07 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | Packed UserOperations |
| V08 | `0x4337084d9e255ff0702461cf8895ce9e3b5ff108` | — |
| V09 | `0x433709009B8330FDa32311DF1C2AFA402eD8D009` | Latest |

Use `EntryPointAddresses.Latest` (currently V09) unless you need a specific version.

## Packages

| Package | Description |
|---------|-------------|
| `Nethereum.AccountAbstraction` | UserOperation creation, AAContractHandler, SmartAccountBuilder, ERC-7579 modules, gas estimation |
| `Nethereum.AccountAbstraction.Bundler` | Full bundler with mempool, validation, reputation, and automatic bundling |
| `Nethereum.AccountAbstraction.Bundler.RpcServer` | JSON-RPC server handlers for exposing bundler as an HTTP endpoint |
| `Nethereum.AccountAbstraction.SimpleAccount` | SimpleAccount factory for deploying ERC-4337 compatible accounts |

## Guides

### Getting Started

| Guide | What You'll Learn |
|-------|-------------------|
| [Send a UserOperation](guide-send-useroperation) | Build, sign, and submit your first ERC-4337 UserOperation step by step |
| [Smart Contracts with AA](guide-smart-contracts-with-aa) | Route existing typed contract services through AA with `ChangeContractHandlerToAA` — the simplest approach |
| [Account Deployment](guide-smart-account-deployment) | Deploy smart accounts with `SmartAccountBuilder`, predict addresses with CREATE2, manage EntryPoint deposits |

### Advanced

| Guide | What You'll Learn |
|-------|-------------------|
| [Batching & Paymasters](guide-batching-and-paymasters) | Execute multiple calls in one UserOperation and sponsor gas with paymasters |
| [Modular Accounts (ERC-7579)](guide-modular-accounts) | Install validators (multisig, social recovery), executors, and session keys as plug-and-play modules |
| [Run a Bundler](guide-run-bundler) | Set up an in-process or standalone bundler with mempool, validation, and RPC server |
