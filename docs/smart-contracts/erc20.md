---
title: ERC-20 Tokens
sidebar_label: ERC-20 Tokens
sidebar_position: 4
description: Query and transfer ERC-20 tokens using Nethereum's built-in typed services
---

# ERC-20 Tokens

:::tip The Simple Way
```csharp
var erc20 = web3.Eth.ERC20.GetContractService(contractAddress);
var balance = await erc20.BalanceOfQueryAsync(myAddress);
var receipt = await erc20.TransferRequestAndWaitForReceiptAsync(recipient, amount);
```
No ABI, no code generation — built-in typed service for any ERC-20 token.
:::

Nethereum has built-in typed services for ERC-20 tokens. No ABI needed, no code generation — just call the methods directly. This is the fastest way to interact with any ERC-20 token and covers the vast majority of use cases. For the full list of built-in services (ERC-721, ERC-1155, ENS, and more), see [Built-in Standards](./guide-built-in-standards.md).

## Query Token Info

Every ERC-20 token exposes metadata — the name, symbol, decimals, and total supply. These are read-only calls (no gas, no signing needed):

```csharp
var erc20 = web3.Eth.ERC20.GetContractService(contractAddress);

var name = await erc20.NameQueryAsync();
var symbol = await erc20.SymbolQueryAsync();
var decimals = await erc20.DecimalsQueryAsync();
var totalSupply = await erc20.TotalSupplyQueryAsync();

Console.WriteLine($"{name} ({symbol})");
Console.WriteLine($"Decimals: {decimals}");
Console.WriteLine($"Total supply: {Web3.Convert.FromWei(totalSupply, decimals)}");
```

The `decimals` value is important — ERC-20 tokens store balances as integers in the smallest unit (like Wei for ETH). Most tokens use 18 decimals, but stablecoins like USDC use 6. Always use `Web3.Convert.FromWei(value, decimals)` to display human-readable amounts.

## Check Balance

Balances are returned in the token's smallest unit. Use `FromWei` with the token's decimals to get a readable value:

```csharp
var balance = await erc20.BalanceOfQueryAsync(myAddress);
Console.WriteLine($"Balance: {Web3.Convert.FromWei(balance, decimals)} {symbol}");
```

## Transfer Tokens

To transfer tokens, you need a `Web3` instance connected with a funded account (as shown in the [Contract Interaction guide](./guide-smart-contract-interaction.md)). The amount must be in the smallest unit — use `ToWei` with the token's decimals:

```csharp
var receipt = await erc20.TransferRequestAndWaitForReceiptAsync(
    recipientAddress,
    Web3.Convert.ToWei(100, decimals));

Console.WriteLine($"Transfer TX: {receipt.TransactionHash}");
```

Gas estimation, nonce management, and EIP-1559 fees are handled automatically.

## Approve and TransferFrom

The approve/transferFrom pattern allows another address (like a DEX or smart contract) to spend your tokens. This is a two-step process: first you approve a spending limit, then the spender calls `transferFrom`.

```csharp
// Approve the spender to use 1000 tokens
var approveReceipt = await erc20.ApproveRequestAndWaitForReceiptAsync(
    spenderAddress,
    Web3.Convert.ToWei(1000, decimals));

// Check allowance
var allowance = await erc20.AllowanceQueryAsync(myAddress, spenderAddress);
Console.WriteLine($"Allowance: {Web3.Convert.FromWei(allowance, decimals)}");
```

Be careful with approvals — approving a large amount gives the spender permission to transfer up to that amount at any time. Many DApps request unlimited approval (`BigInteger.MaxValue`) for convenience, but it's safer to approve only what's needed.

## Listen for Transfer Events

ERC-20 transfers emit a `Transfer` event. You can query historical transfers or monitor for new ones. Nethereum ships a built-in `TransferEventDTO` for ERC-20, so you don't need to define your own:

```csharp
var transferEvent = web3.Eth.GetEvent<TransferEventDTO>(contractAddress);
var filter = transferEvent.CreateFilterInput(
    BlockParameter.CreateEarliest(),
    BlockParameter.CreateLatest());

var transfers = await transferEvent.GetAllChangesAsync(filter);
foreach (var t in transfers)
{
    Console.WriteLine($"{t.Event.From} -> {t.Event.To}: {Web3.Convert.FromWei(t.Event.Value, decimals)}");
}
```

For more advanced filtering (by sender, recipient, block range), see the [Events guide](./guide-events.md).

## Historical Queries

All query methods accept an optional `BlockParameter` to read state at a specific block. This is useful for checking what a balance was at a past point in time:

```csharp
var historicalBalance = await erc20.BalanceOfQueryAsync(
    myAddress,
    new BlockParameter(15_000_000));
```

The node must have archive state for this block — most public RPC providers only keep recent state. Use an archive node for deep historical queries.

## Next Steps

- [Code Generation](./code-generation.md) -- generate typed services for custom contracts beyond ERC-20
- [Events & Logs](./guide-events.md) -- filter and decode Transfer/Approval events in detail
- [Built-in Standards](./guide-built-in-standards.md) -- typed services for ERC-721, ERC-1155, ENS, and more
