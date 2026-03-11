---
title: Convert Between Wei, Ether, and Gwei
sidebar_label: "Unit Conversion"
sidebar_position: 2
description: Convert Ethereum denominations using Web3.Convert and UnitConversion
---

# Convert Between Wei, Ether, and Gwei

Balances and gas prices on Ethereum are stored in Wei — a unit so small that 1 ETH equals 10^18 Wei. As you saw in [Query Balance](guide-query-balance), raw balance queries return Wei values. This guide covers all the conversion utilities you'll need to display human-readable amounts and work with gas prices in Gwei.

```bash
dotnet add package Nethereum.Web3
```

## Wei to Ether

By default, balance queries return values in Wei — not easy to read unless you're talented at maths. Convert to Ether using the `FromWei` method:

```csharp
using Nethereum.Web3;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR-PROJECT-ID");

var balance = await web3.Eth.GetBalance.SendRequestAsync(
    "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae");
Console.WriteLine("Balance in Wei: " + balance.Value);

// Convert from Wei to Ether
var balanceInEther = Web3.Convert.FromWei(balance.Value);
Console.WriteLine("Balance in Ether: " + balanceInEther);
```

## Ether to Wei

Convert back to Wei using `ToWei`:

```csharp
var backToWei = Web3.Convert.ToWei(balanceInEther);
Console.WriteLine("Balance back in Wei: " + backToWei);
```

## Gwei Conversion

Gas prices are typically expressed in Gwei (1 Gwei = 1,000,000,000 Wei):

```csharp
using Nethereum.Util;

var convert = UnitConversion.Convert;

// Wei to Gwei
var gweiValue = convert.FromWei(BigInteger.Parse("21000000000"), UnitConversion.EthUnit.Gwei);
// 21

// Gwei to Wei
var gweiInWei = convert.ToWei(21, UnitConversion.EthUnit.Gwei);
// 21000000000
```

## Ether to Wei (Static)

```csharp
var oneEtherInWei = UnitConversion.Convert.ToWei(1, UnitConversion.EthUnit.Ether);
// 1000000000000000000
```

## Custom Decimal Places (ERC20 Tokens)

ERC20 tokens have varying decimal places. USDC and USDT use 6 decimals, not 18:

```csharp
// USDC has 6 decimals
var usdcAmount = UnitConversion.Convert.FromWei(BigInteger.Parse("1000000"), 6);
// 1

var usdcInSmallestUnit = UnitConversion.Convert.ToWei(1m, 6);
// 1000000
```

## All Ethereum Denominations

| Unit    | Wei Value         | Decimals |
|---------|-------------------|----------|
| Wei     | 1                 | 0        |
| Kwei    | 1,000             | 3        |
| Mwei    | 1,000,000         | 6        |
| Gwei    | 1,000,000,000     | 9        |
| Szabo   | 10^12             | 12       |
| Finney  | 10^15             | 15       |
| Ether   | 10^18             | 18       |
| Kether  | 10^21             | 21       |

## BigDecimal Precision

For very large values where `decimal` may lose precision:

```csharp
var largeWei = BigInteger.Parse("123456789012345678901234567890");
var bigDecimal = UnitConversion.Convert.FromWeiToBigDecimal(
    largeWei, UnitConversion.EthUnit.Ether);
var backToWei = UnitConversion.Convert.ToWei(bigDecimal, UnitConversion.EthUnit.Ether);
// largeWei == backToWei
```

## Next Steps

- [Fee Estimation](guide-fee-estimation) — EIP-1559 fee strategies (fees are in Gwei)
- [Query Balances](guide-query-balance) — check Ether and token balances
- [Transfer Ether](guide-send-eth) — send ETH to an address
