---
title: Estimate Gas Fees (EIP-1559)
sidebar_label: "Fee Estimation"
sidebar_position: 3
description: Use built-in fee estimation strategies for EIP-1559 transactions
---

# Estimate Gas Fees (EIP-1559)

Every Ethereum transaction costs gas — a fee paid to validators for including your transaction in a block. Since EIP-1559 (the London upgrade), fees have two components: a **base fee** (set by the network, burned — permanently removed from circulation) and a **priority tip** (goes to the validator). You set a **max fee** cap so you never overpay.

The good news: **Nethereum handles all of this automatically.** When you send a transaction with `web3.Eth`, fees are estimated and set for you. This guide explains how the automatic estimation works and how to control it when you need to.

To learn more about EIP-1559, see the [EIP-1559 FAQ](https://notes.ethereum.org/@vbuterin/eip-1559-faq).

```bash
dotnet add package Nethereum.Web3
```

## Default Behavior

When you send transactions with `Web3`, Nethereum handles fee estimation automatically:

- **Default strategy**: `TimePreferenceFeeSuggestionStrategy` (assigned from version 4.3.1)
- **Default transaction type**: EIP-1559 (`UseLegacyAsDefault = false`)
- **Auto-calculation**: fees are calculated if not provided

This means you can send transactions without specifying any fee parameters.

## Assign a Strategy to the Transaction Manager

The transaction manager can be assigned a strategy to automate the calculation. By default, the `TimePreferenceFeeSuggestionStrategy` is assigned from 4.3.1:

```csharp
using Nethereum.Web3;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR-PROJECT-ID");

// Using the FeeSuggestion service to select a prebuilt strategy
var timePreferenceStrategy = web3.FeeSuggestion
    .GetTimePreferenceFeeSuggestionStrategy();
web3.TransactionManager.Fee1559SuggestionStrategy = timePreferenceStrategy;
```

## Time Preference Fee Suggestion Strategy

`SuggestFees` returns a series of `MaxFeePerGas` / `MaxPriorityFeePerGas` values suggested for different time preferences. The first element corresponds to the highest time preference (most urgent transaction).

The algorithm is similar to the old "gas price oracle" in Geth — it takes the prices of recent blocks and makes a suggestion based on a low percentile of those prices. With EIP-1559, the base fee of each block provides a less noisy and more reliable price signal. This is a port of [Felfodi Zsolt's feehistory example](https://github.com/zsfelfoldi/feehistory).

### Single Fee (Highest Priority)

`SuggestFeeAsync` returns a single fee — the first element, corresponding to the highest time preference (most urgent transaction):

```csharp
var fee = await timePreferenceStrategy.SuggestFeeAsync();
Console.WriteLine("Max Fee Per Gas: " +
    Web3.Convert.FromWei(fee.MaxFeePerGas.Value, Nethereum.Util.UnitConversion.EthUnit.Gwei)
    + " Gwei");
Console.WriteLine("Max Priority Fee Per Gas: " +
    Web3.Convert.FromWei(fee.MaxPriorityFeePerGas.Value, Nethereum.Util.UnitConversion.EthUnit.Gwei)
    + " Gwei");
```

### All Priority Levels

`SuggestFeesAsync` returns all the estimated fees, starting with the highest priority:

```csharp
var fees = await timePreferenceStrategy.SuggestFeesAsync();
var priority = 1;
foreach (var feeItem in fees)
{
    Console.WriteLine($"Priority level {priority}:");
    Console.WriteLine("  Max Fee Per Gas: " +
        Web3.Convert.FromWei(feeItem.MaxFeePerGas.Value,
            Nethereum.Util.UnitConversion.EthUnit.Gwei) + " Gwei");
    Console.WriteLine("  Max Priority Fee Per Gas: " +
        Web3.Convert.FromWei(feeItem.MaxPriorityFeePerGas.Value,
            Nethereum.Util.UnitConversion.EthUnit.Gwei) + " Gwei");
    priority++;
}
```

Very low `MaxFeePerGas` values or values matching `MaxPriorityFeePerGas` indicate that an estimate could not be made for that priority level.

## Median Priority Fee History Suggestion Strategy

Suggests a priority fee based on the fee history of previous blocks and the median of all its values. The base fee is suggested based on the latest block and increased by a percentage depending on its value. This ensures inclusion on the next block but may be more expensive.

Based on [MyCrypto's implementation](https://github.com/MyCryptoHQ/MyCrypto/blob/master/src/services/ApiService/Gas/eip1559.ts).

```csharp
var medianStrategy = web3.FeeSuggestion
    .GetMedianPriorityFeeHistorySuggestionStrategy();
var fee = await medianStrategy.SuggestFeeAsync();
Console.WriteLine("Max Fee Per Gas: " +
    Web3.Convert.FromWei(fee.MaxFeePerGas.Value,
        Nethereum.Util.UnitConversion.EthUnit.Gwei) + " Gwei");
Console.WriteLine("Max Priority Fee Per Gas: " +
    Web3.Convert.FromWei(fee.MaxPriorityFeePerGas.Value,
        Nethereum.Util.UnitConversion.EthUnit.Gwei) + " Gwei");
```

## Simple Fee Suggestion Strategy

Gets the base fee, multiplies it by 2, and adds a default max priority fee of 2 Gwei:

```csharp
var simpleStrategy = web3.FeeSuggestion
    .GetSimpleFeeSuggestionStrategy();
var fee = await simpleStrategy.SuggestFeeAsync();
Console.WriteLine("Max Fee Per Gas: " +
    Web3.Convert.FromWei(fee.MaxFeePerGas.Value,
        Nethereum.Util.UnitConversion.EthUnit.Gwei) + " Gwei");
Console.WriteLine("Max Priority Fee Per Gas: " +
    Web3.Convert.FromWei(fee.MaxPriorityFeePerGas.Value,
        Nethereum.Util.UnitConversion.EthUnit.Gwei) + " Gwei");
```

## Assign Fees to a Contract FunctionMessage

In a similar way to setting the gas price, you can set `MaxFeePerGas` and `MaxPriorityFeePerGas` on a contract `FunctionMessage`. Setting the `GasPrice` instead converts the transaction to a [legacy transaction](guide-transaction-models):

```csharp
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;
using System.Numerics;

[Function("transfer", "bool")]
public class TransferFunction : FunctionMessage
{
    [Parameter("address", "_to", 1)]
    public string To { get; set; }

    [Parameter("uint256", "_value", 2)]
    public BigInteger TokenAmount { get; set; }
}

var transferFunction = new TransferFunction();
transferFunction.MaxFeePerGas = fee.MaxFeePerGas;
transferFunction.MaxPriorityFeePerGas = fee.MaxPriorityFeePerGas;
```

## Force Legacy Transactions

To use legacy `GasPrice` instead of EIP-1559:

```csharp
web3.TransactionManager.UseLegacyAsDefault = true;
```

## Strategy Comparison

| Strategy | Method | Best For |
|---|---|---|
| **TimePreference** | Percentile-based from recent block prices | Default — precise fee targeting with urgency levels |
| **Median** | Median of fee history + base fee multiplier | Next-block inclusion with congestion-aware pricing |
| **Simple** | `baseFee * 2 + 2 Gwei` | Quick estimate when accuracy is less important |

## Next Steps

- [Transfer Ether](guide-send-eth) — send ETH using fee estimates
- [Send Transactions](guide-send-transaction) — send transactions with the transaction manager
- [Unit Conversion](guide-unit-conversion) — convert between Wei, Gwei, and Ether
