---
title: ERC-20 Token Simulation
sidebar_label: ERC-20 Simulation
sidebar_position: 6
description: Simulate ERC-20 operations with the specialized token simulator
---

# ERC-20 Token Simulation

The `ERC20ContractSimulator` provides a specialized environment for simulating ERC-20 token operations without deploying to a real network. It can discover the slot of a mapping(address => uint256) balance layout (`CalculateMappingBalanceSlotAsync`) and simulate transfer and balanceOf.

Use this when you need to test token transfer behavior in isolation — for example, detecting fee-on-transfer tokens. For broader transaction simulation (DEX swaps, router calls, multi-contract interactions), use the [Transaction Simulation](guide-transaction-simulation) pipeline instead.

## Prerequisites

```bash
dotnet add package Nethereum.EVM.Contracts
```

## Basic Usage

The `ERC20ContractSimulator` wraps a real ERC-20 contract's bytecode and simulates operations locally:

```csharp
using Nethereum.EVM.Contracts.ERC20;
using Nethereum.Web3;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR_KEY");

// Create the token simulator
var tokenAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC
var simulator = new ERC20ContractSimulator(web3, 1, tokenAddress);
```

The simulator fetches the actual contract bytecode and storage from the blockchain, so it behaves identically to the real token.

## Simulating a Transfer

To test whether a transfer would succeed and observe the resulting balances:

```csharp
var sender = "0xSenderAddress";
var recipient = "0xRecipientAddress";
var amount = BigInteger.Parse("1000000"); // 1 USDC (6 decimals)

var result = await simulator.SimulateTransferAndBalanceStateAsync(sender, recipient, amount);

Console.WriteLine($"Sender balance before: {result.BalanceSenderBefore}");
Console.WriteLine($"Sender balance after: {result.BalanceSenderAfter}");
Console.WriteLine($"Recipient balance before: {result.BalanceReceiverBefore}");
Console.WriteLine($"Recipient balance after: {result.BalanceReceiverAfter}");
```

The simulation modifies local state only — no transaction is broadcast.

## Detecting Fee-on-Transfer Tokens

Some tokens (like SafeMoon or USDT on certain chains) take a fee on every transfer. The simulator can detect this by comparing the expected transfer amount with the actual balance change:

```csharp
var result = await simulator.SimulateTransferAndBalanceStateAsync(sender, recipient, amount);

var feeTaken = amount - (result.BalanceReceiverAfter - result.BalanceReceiverBefore);

if (feeTaken > 0)
{
    Console.WriteLine($"Fee-on-transfer detected: {feeTaken} tokens taken as fee");
}
```

## Checking Events

The simulation result includes the `Transfer` logs emitted, in `TransferLogs`:

```csharp
if (result.TransferLogs != null)
{
    foreach (var log in result.TransferLogs)
    {
        // Transfer event topic: keccak256("Transfer(address,address,uint256)")
        var transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
        if (log.Topics[0].ToString() == transferTopic)
        {
            Console.WriteLine($"Transfer event from contract {log.Address}");
        }
    }
}
```

For full event decoding with parameter names and values, use the `ProgramResultDecoder` as described in [Log Extraction](guide-log-extraction).

## Next Steps

- [Transaction Simulation](guide-transaction-simulation) — simulate any transaction, not just ERC-20 operations
- [Log Extraction](guide-log-extraction) — decode all events from simulation results
- For the full ERC-20 contract service API (on-chain, not simulated), see the [Nethereum.EVM.Contracts package reference](nethereum-evm-contracts)
