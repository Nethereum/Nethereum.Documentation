---
title: ERC-20 Token Simulation
sidebar_label: ERC-20 Simulation
sidebar_position: 6
description: Simulate ERC-20 operations with the specialized token simulator
---

# ERC-20 Token Simulation

The `ERC20ContractSimulator` provides a specialized environment for simulating ERC-20 token operations — transfers, approvals, and balance queries — without deploying to a real network. It automatically discovers the token's storage layout and manages balance/allowance state internally.

Use this when you need to test token transfer behavior in isolation — for example, detecting fee-on-transfer tokens or validating approval flows. For broader transaction simulation (DEX swaps, router calls, multi-contract interactions), use the [Transaction Simulation](guide-transaction-simulation) pipeline instead.

## Prerequisites

```bash
dotnet add package Nethereum.EVM.Contracts
```

## Basic Usage

The `ERC20ContractSimulator` wraps a real ERC-20 contract's bytecode and simulates operations locally:

```csharp
using Nethereum.EVM.Contracts;
using Nethereum.EVM.BlockchainState;
using Nethereum.Web3;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR_KEY");

// Create state service for fetching real token state
var nodeDataService = new RpcNodeDataService(
    web3.Eth, BlockParameter.CreateLatest());
var stateService = new ExecutionStateService(nodeDataService);

// Create the token simulator
var tokenAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC
var simulator = new ERC20ContractSimulator(tokenAddress, stateService);
```

The simulator fetches the actual contract bytecode and storage from the blockchain, so it behaves identically to the real token.

## Simulating a Transfer

To test whether a transfer would succeed and observe the resulting balances:

```csharp
var sender = "0xSenderAddress";
var recipient = "0xRecipientAddress";
var amount = BigInteger.Parse("1000000"); // 1 USDC (6 decimals)

// Check balance before
var balanceBefore = await simulator.BalanceOfAsync(sender);
Console.WriteLine($"Sender balance before: {balanceBefore}");

// Simulate transfer
var result = await simulator.TransferAsync(sender, recipient, amount);

if (result.Success)
{
    var balanceAfter = await simulator.BalanceOfAsync(sender);
    Console.WriteLine($"Sender balance after: {balanceAfter}");
    Console.WriteLine($"Gas used: {result.GasUsed}");
}
else
{
    Console.WriteLine($"Transfer would fail: {result.Error}");
}
```

The simulation modifies local state only — no transaction is broadcast.

## Detecting Fee-on-Transfer Tokens

Some tokens (like SafeMoon or USDT on certain chains) take a fee on every transfer. The simulator can detect this by comparing the expected transfer amount with the actual balance change:

```csharp
var balanceSenderBefore = await simulator.BalanceOfAsync(sender);
var balanceRecipientBefore = await simulator.BalanceOfAsync(recipient);

var result = await simulator.TransferAsync(sender, recipient, amount);

if (result.Success)
{
    var balanceSenderAfter = await simulator.BalanceOfAsync(sender);
    var balanceRecipientAfter = await simulator.BalanceOfAsync(recipient);

    var senderDiff = balanceSenderBefore - balanceSenderAfter;
    var recipientDiff = balanceRecipientAfter - balanceRecipientBefore;

    if (recipientDiff < senderDiff)
    {
        var fee = senderDiff - recipientDiff;
        Console.WriteLine($"Fee-on-transfer detected: {fee} tokens taken as fee");
    }
}
```

## Simulating Approve and TransferFrom

The approval flow requires two steps, just like on-chain:

```csharp
// 1. Owner approves spender
var owner = "0xOwnerAddress";
var spender = "0xSpenderAddress";
var approveAmount = BigInteger.Parse("5000000"); // 5 USDC

var approveResult = await simulator.ApproveAsync(owner, spender, approveAmount);

// 2. Check allowance
var allowance = await simulator.AllowanceAsync(owner, spender);
Console.WriteLine($"Allowance: {allowance}");

// 3. Spender transfers from owner
var transferResult = await simulator.TransferFromAsync(
    spender, owner, recipient, BigInteger.Parse("1000000"));
```

## Checking Events

The simulation result includes all events emitted, which you can inspect for `Transfer` and `Approval` events:

```csharp
if (result.Logs != null)
{
    foreach (var log in result.Logs)
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
