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

Nethereum has built-in typed services for ERC-20 tokens. No ABI needed, no code generation — just call the methods directly. This is the fastest way to interact with any ERC-20 token and covers the vast majority of use cases.

## Query Token Info

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

## Check Balance

```csharp
var balance = await erc20.BalanceOfQueryAsync(myAddress);
Console.WriteLine($"Balance: {Web3.Convert.FromWei(balance, decimals)} {symbol}");
```

## Transfer Tokens

```csharp
var receipt = await erc20.TransferRequestAndWaitForReceiptAsync(
    recipientAddress,
    Web3.Convert.ToWei(100, decimals));

Console.WriteLine($"Transfer TX: {receipt.TransactionHash}");
```

## Approve and TransferFrom

The approve/transferFrom pattern allows another address (like a DEX) to spend your tokens:

```csharp
// Approve the spender to use 1000 tokens
var approveReceipt = await erc20.ApproveRequestAndWaitForReceiptAsync(
    spenderAddress,
    Web3.Convert.ToWei(1000, decimals));

// Check allowance
var allowance = await erc20.AllowanceQueryAsync(myAddress, spenderAddress);
Console.WriteLine($"Allowance: {Web3.Convert.FromWei(allowance, decimals)}");
```

## Listen for Transfer Events

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

## Historical Queries

All query methods accept an optional `BlockParameter` for historical state:

```csharp
var historicalBalance = await erc20.BalanceOfQueryAsync(
    myAddress,
    new BlockParameter(15_000_000));
```

## Next Steps

- [Code Generation](./code-generation.md) -- generate typed services for custom contracts beyond ERC-20
- [Events & Logs](./guide-events.md) -- filter and decode Transfer/Approval events in detail
- [Built-in Standards](./guide-built-in-standards.md) -- typed services for ERC-721, ERC-1155, ENS, and more
