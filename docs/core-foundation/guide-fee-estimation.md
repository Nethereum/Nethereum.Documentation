---
title: Estimate Gas Fees (EIP-1559)
sidebar_label: "Fee Estimation"
sidebar_position: 7
description: Use fee estimation strategies for EIP-1559 transactions
---

# Estimate Gas Fees (EIP-1559)

Choose the right EIP-1559 fee strategy for your use case -- from simple defaults to advanced median-based estimation.

## Installation

```bash
dotnet add package Nethereum.RPC
```

## Fee Components

Every EIP-1559 transaction specifies two fee parameters:

- **`maxPriorityFeePerGas`** -- the tip paid directly to the validator
- **`maxFeePerGas`** -- the absolute maximum you will pay per gas unit (base fee + priority fee)

The **base fee** is set by the protocol and adjusts each block based on network congestion. You only pay `baseFee + priorityFee`, and any excess under `maxFeePerGas` is refunded.

## Simple Fee Strategy

> **Source:** [`Fee1559SuggestionDocExampleTests.SimpleStrategy_ShouldCalculateMaxFeeAs2xBasePlusPriority`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.RPC.UnitTests/Fee1559SuggestionDocExampleTests.cs)

```csharp
var defaultPriority = SimpleFeeSuggestionStrategy.DEFAULT_MAX_PRIORITY_FEE_PER_GAS;
```

The default priority fee is 2 Gwei (2,000,000,000 wei). The simple strategy calculates `maxFeePerGas` as `2 * baseFee + priorityFee`, giving a buffer for base fee increases across two blocks.

## Median Priority Fee Strategy

> **Source:** [`Fee1559SuggestionDocExampleTests.MedianStrategy_ShouldApplyCorrectBaseFeeMultipliers`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.RPC.UnitTests/Fee1559SuggestionDocExampleTests.cs)

```csharp
var strategy = new MedianPriorityFeeHistorySuggestionStrategy();

strategy.GetBaseFeeMultiplier(30_000_000_000);   // 2.0 (low congestion)
strategy.GetBaseFeeMultiplier(50_000_000_000);   // 1.6
strategy.GetBaseFeeMultiplier(150_000_000_000);  // 1.4 (high congestion)
strategy.GetBaseFeeMultiplier(300_000_000_000);  // 1.2 (very high)
```

The multiplier decreases as the base fee rises. When gas is cheap, a 2x buffer is acceptable. When gas is expensive, a smaller buffer avoids overpaying.

## Estimate from Fee History

> **Source:** [`Fee1559SuggestionDocExampleTests.MedianStrategy_ShouldEstimatePriorityFeeFromRewards`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.RPC.UnitTests/Fee1559SuggestionDocExampleTests.cs)

```csharp
var strategy = new MedianPriorityFeeHistorySuggestionStrategy();
var feeHistory = new FeeHistoryResult
{
    OldestBlock = new HexBigInteger(100),
    BaseFeePerGas = new[]
    {
        new HexBigInteger(20_000_000_000),
        new HexBigInteger(21_000_000_000)
    },
    GasUsedRatio = new decimal[] { 0.5m },
    Reward = new[]
    {
        new[] { new HexBigInteger(1_000_000_000) },
        new[] { new HexBigInteger(1_500_000_000) },
        new[] { new HexBigInteger(2_000_000_000) },
        new[] { new HexBigInteger(2_500_000_000) },
        new[] { new HexBigInteger(3_000_000_000) }
    }
};

var estimate = strategy.EstimatePriorityFee(feeHistory);
```

`FeeHistoryResult` comes from the `eth_feeHistory` RPC call. The strategy takes the median of the reward percentiles to suggest a priority fee.

> **Source:** [`Fee1559SuggestionDocExampleTests.MedianStrategy_ShouldSuggestMaxFeeWithMultiplier`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.RPC.UnitTests/Fee1559SuggestionDocExampleTests.cs)

```csharp
var maxPriorityFee = new BigInteger(2_000_000_000);
var baseFee = new HexBigInteger(30_000_000_000);

var result = strategy.SuggestMaxFeeUsingMultiplier(maxPriorityFee, baseFee);
```

`SuggestMaxFeeUsingMultiplier` combines the estimated priority fee with the congestion-adjusted base fee multiplier.

## Time Preference Strategy

> **Source:** [`Fee1559SuggestionDocExampleTests.TimePreferenceStrategy_ShouldSuggestFeesFromHistory`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.RPC.UnitTests/Fee1559SuggestionDocExampleTests.cs)

```csharp
var strategy = new TimePreferenceFeeSuggestionStrategy();
var fees = strategy.SuggestFees(feeHistory, tip);
foreach (var fee in fees)
{
    // fee.MaxFeePerGas, fee.MaxPriorityFeePerGas
}
```

This strategy returns an array of fee suggestions, one per block in the history window, allowing you to pick based on your urgency preference.

## Fee1559 Model

> **Source:** [`Fee1559SuggestionDocExampleTests.Fee1559_ShouldHoldAllFeeComponents`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.RPC.UnitTests/Fee1559SuggestionDocExampleTests.cs)

```csharp
var fee = new Fee1559
{
    BaseFee = 20_000_000_000,
    MaxPriorityFeePerGas = 2_000_000_000,
    MaxFeePerGas = 42_000_000_000
};
```

The `Fee1559` model holds all three components. You can pass `MaxPriorityFeePerGas` and `MaxFeePerGas` directly to transaction input objects.

## Default Behavior in Web3

When you use `Web3` to send transactions, Nethereum automatically handles fee estimation:

- **Default strategy**: `TimePreferenceFeeSuggestionStrategy` (NOT Simple)
- **Default transaction type**: EIP-1559 (`UseLegacyAsDefault = false`)
- **Auto-calculation**: fees are calculated if not provided (`CalculateOrSetDefaultGasPriceFeesIfNotSet = true`)

This means you can send transactions without specifying any fee parameters — Web3 will estimate them automatically using the TimePreference strategy.

### Override the Default Strategy

```csharp
// Switch to Simple strategy
web3.TransactionManager.Fee1559SuggestionStrategy =
    new SimpleFeeSuggestionStrategy(web3.Client);
```

### Force Legacy Transactions

```csharp
// Use legacy gasPrice instead of EIP-1559
web3.TransactionManager.UseLegacyAsDefault = true;
```

Legacy mode is also triggered automatically if you provide `GasPrice` in your `TransactionInput`.

> **Source:** [`Fee1559SuggestionDocExampleTests.DefaultStrategy_IsTimePreference`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.RPC.UnitTests/Fee1559SuggestionDocExampleTests.cs)

## Strategy Comparison

| Strategy | Speed | Accuracy | Requirements |
|---|---|---|---|
| **Simple** | Instant | Rough estimate | None (uses current base fee only) |
| **Median** | Fast | Balanced | `eth_feeHistory` with reward percentiles |
| **TimePreference** | Fast | Precise | `eth_feeHistory` with 100-block window |

- Use **Simple** for quick transactions where overpaying slightly is acceptable.
- Use **Median** when you want congestion-aware pricing with minimal RPC calls.
- Use **TimePreference** for precise fee targeting when you have full fee history data.

## Next Steps

- [Send ETH Transfers](guide-send-eth) -- use fee estimates in real transactions

## Related Packages

- [Nethereum.RPC](nethereum-rpc) -- RPC methods and fee suggestion strategies
