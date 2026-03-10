---
title: Account Abstraction
sidebar_label: Overview
sidebar_position: 1
description: ERC-4337 UserOperations, bundler, smart accounts, and paymasters
---

# Account Abstraction (ERC-4337 / ERC-7579)

ERC-4337 introduces account abstraction without protocol changes. Users interact through smart contract wallets. Transactions are replaced by **UserOperations** processed by a **Bundler** and verified by an **EntryPoint** contract.

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
        +--> Wallet.validateUserOp()
        |         |
        |         +--> (optional) Paymaster.validatePaymasterUserOp()
        |
        +--> Wallet.execute(callData)
```

## UserOperation Fields

| Field | Description |
|-------|-------------|
| `Sender` | The smart contract wallet address |
| `Nonce` | Anti-replay nonce managed by the EntryPoint |
| `InitCode` | Factory call to deploy the wallet (empty if already deployed) |
| `CallData` | The actual operation to execute |
| `CallGasLimit` | Gas for the main execution |
| `VerificationGasLimit` | Gas for the verification step |
| `PreVerificationGas` | Gas overhead for bundler compensation |
| `MaxFeePerGas` | EIP-1559 max fee |
| `MaxPriorityFeePerGas` | EIP-1559 priority fee |
| `PaymasterAndData` | Optional paymaster for sponsored gas |
| `Signature` | Signature for wallet verification |

## Building a UserOperation

```csharp
using Nethereum.AccountAbstraction;

var userOp = new UserOperation
{
    Sender = "0xYourSmartWalletAddress",
    Nonce = 0,
    CallData = callData.ToHex(),
    CallGasLimit = 100000,
    VerificationGasLimit = 150000,
    PreVerificationGas = 21000,
    MaxFeePerGas = Web3.Convert.ToWei(30, UnitConversion.EthUnit.Gwei),
    MaxPriorityFeePerGas = Web3.Convert.ToWei(1, UnitConversion.EthUnit.Gwei)
};
```

## Paymasters

Paymasters sponsor gas fees for UserOperations, enabling gasless transactions:

- **Verifying Paymaster** — validates an off-chain signature
- **ERC-20 Paymaster** — accepts tokens as gas payment
- **Sponsoring Paymaster** — fully sponsors gas

## Nethereum Bundler

Nethereum includes its own bundler for development and application-specific chains:

```bash
dotnet add package Nethereum.AccountAbstraction.Bundler
```

## Packages

| Package | Description |
|---|---|
| `Nethereum.AccountAbstraction` | UserOperation creation, encoding, gas estimation |
| `Nethereum.AccountAbstraction.Bundler` | Full bundler with mempool and reputation |
| `Nethereum.AccountAbstraction.Bundler.RpcServer` | Bundler JSON-RPC server |
| `Nethereum.AccountAbstraction.SimpleAccount` | SimpleAccount factory interaction |
| `Nethereum.AccountAbstraction.AppChain` | AA integration for AppChain |
