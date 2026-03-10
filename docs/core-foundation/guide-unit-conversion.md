---
title: Convert Between Wei, Ether, and Gwei
sidebar_label: "Unit Conversion"
sidebar_position: 9
description: Convert Ethereum denominations using UnitConversion
---

# Convert Between Wei, Ether, and Gwei

Convert between Wei, Gwei, Ether, and other denominations with full precision.

## Installation

```bash
dotnet add package Nethereum.Util
```

## Wei to Ether

```csharp
var convert = UnitConversion.Convert;
var etherValue = convert.FromWei(BigInteger.Parse("1500000000000000000"));
// 1.5m
```

## Ether to Wei

```csharp
var oneEtherInWei = convert.ToWei(1, UnitConversion.EthUnit.Ether);
// 1000000000000000000
```

## Gwei Conversion

```csharp
var gweiInWei = convert.ToWei(21, UnitConversion.EthUnit.Gwei);
// 21000000000
var gweiValue = convert.FromWei(BigInteger.Parse("21000000000"), UnitConversion.EthUnit.Gwei);
// 21m
```

## Other Denominations

Nethereum supports the full range of Ethereum denominations:

| Unit    | Wei Value         | Decimals |
|---------|-------------------|----------|
| Wei     | 1                 | 0        |
| Kwei    | 1,000             | 3        |
| Mwei    | 1,000,000         | 6        |
| Gwei    | 1,000,000,000     | 9        |
| Szabo   | 1,000,000,000,000 | 12       |
| Finney  | 10^15             | 15       |
| Ether   | 10^18             | 18       |
| Kether  | 10^21             | 21       |

## Custom Decimal Places (ERC-20 Tokens)

```csharp
var fromCustom = convert.FromWei(BigInteger.Parse("1000000"), 6); // USDC has 6 decimals
// 1m
var toCustom = convert.ToWei(1m, 6);
// 1000000
```

## BigDecimal Precision

```csharp
var largeWei = BigInteger.Parse("123456789012345678901234567890");
var bigDecimal = convert.FromWeiToBigDecimal(largeWei, UnitConversion.EthUnit.Ether);
var backToWei = convert.ToWei(bigDecimal, UnitConversion.EthUnit.Ether);
Assert.Equal(largeWei, backToWei);
```

## Next Steps

- [Hex Encoding](guide-hex-encoding) — encode and decode hex data

## Further Reading

- [Nethereum.Util Package](nethereum-util)
