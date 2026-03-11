---
title: Estimate Gas Fees (EIP-1559)
sidebar_label: "Fee Estimation"
sidebar_position: 3
description: Use built-in fee estimation strategies for EIP-1559 transactions
---

# Estimate Gas Fees (EIP-1559)

Fees are automatic. When you send a transaction with `web3.Eth`, Nethereum estimates EIP-1559 fees for you — you don't need to configure anything. This guide explains how the automatic estimation works and how to customize it when you need to.

```bash
dotnet add package Nethereum.Web3
```

## The Default: You Probably Don't Need This Guide

When you send any transaction through `web3.Eth`, fees are calculated automatically:

```csharp
var web3 = new Web3(account, "https://mainnet.infura.io/v3/YOUR-PROJECT-ID");

// Fees are handled automatically — no configuration needed
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync("0xRecipient", 1.11m);
```

Behind the scenes:
- **Default strategy**: `TimePreferenceFeeSuggestionStrategy` (assigned since version 4.3.1)
- **Default transaction type**: EIP-1559 (`UseLegacyAsDefault = false`)
- **Gas, nonce, fees**: all calculated if not explicitly provided

If you're just sending transactions and they're going through fine, **you're done**. The rest of this guide is for when you need more control.

## When You Need More Control

You might want to customize fee estimation when:
- **High-priority transactions** need faster inclusion (higher tip)
- **Gas-sensitive operations** need cost optimization
- **Custom strategies** fit your application's needs better

## Strategy Comparison

| Strategy | Method | Best For |
|---|---|---|
| **TimePreference** | Percentile-based from recent block prices | Default — precise fee targeting with urgency levels |
| **Median** | Median of fee history + base fee multiplier | Next-block inclusion with congestion-aware pricing |
| **Simple** | `baseFee × 2 + 2 Gwei` | Quick estimate when accuracy is less important |

## Time Preference Fee Suggestion Strategy

The default strategy. Based on [Felfodi Zsolt's feehistory example](https://github.com/zsfelfoldi/feehistory), it analyzes recent block prices and suggests fees for different urgency levels — similar to the old "gas price oracle" in Geth but more reliable with EIP-1559's base fee signal.

### Assign to the Transaction Manager

The `TimePreferenceFeeSuggestionStrategy` is assigned by default, but you can set it explicitly:

```csharp
var timePreferenceStrategy = web3.FeeSuggestion
    .GetTimePreferenceFeeSuggestionStrategy();
web3.TransactionManager.Fee1559SuggestionStrategy = timePreferenceStrategy;
```

### Single Fee (Highest Priority)

`SuggestFeeAsync` returns a single fee — the most urgent option:

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

`SuggestFeesAsync` returns all estimated fees, from highest to lowest priority:

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

Suggests a priority fee based on the median of fee history from previous blocks. The base fee is increased by a percentage depending on congestion. This ensures inclusion on the next block but may be more expensive.

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

## Apply Fees to a Contract Call

You can set `MaxFeePerGas` and `MaxPriorityFeePerGas` on a contract `FunctionMessage`. Setting `GasPrice` instead converts the transaction to a [legacy transaction](guide-transaction-models):

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

## Legacy Mode

To use legacy `GasPrice` instead of EIP-1559:

```csharp
web3.TransactionManager.UseLegacyAsDefault = true;
```

To learn more about EIP-1559, see the [EIP-1559 FAQ](https://notes.ethereum.org/@vbuterin/eip-1559-faq).

## Next Steps

- [Transfer Ether](guide-send-eth) — send ETH using fee estimates
- [Send Transactions](guide-send-transaction) — send transactions with the transaction manager
- [Unit Conversion](guide-unit-conversion) — convert between Wei, Gwei, and Ether
