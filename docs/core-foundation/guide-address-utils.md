---
title: Validate and Format Addresses
sidebar_label: "Address Utilities"
sidebar_position: 8
description: Validate, checksum, compare, and format Ethereum addresses
---

# Validate and Format Addresses

Validate Ethereum addresses, apply EIP-55 checksums, compare addresses case-insensitively, and handle empty/zero addresses.

## Installation

```bash
dotnet add package Nethereum.Util
```

## EIP-55 Checksum

```csharp
var addressUtil = AddressUtil.Current;
var checksummed = addressUtil.ConvertToChecksumAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed");
// "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"
Assert.True(addressUtil.IsChecksumAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"));
```

## Validate Address Format

```csharp
Assert.True(addressUtil.IsValidEthereumAddressHexFormat("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"));
Assert.False(addressUtil.IsValidEthereumAddressHexFormat("not-an-address"));
Assert.True(addressUtil.IsValidAddressLength("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"));
```

## Compare Addresses

```csharp
Assert.True(addressUtil.AreAddressesTheSame(
    "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
    "0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED"));
Assert.True("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"
    .IsTheSameAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed"));
```

## Empty and Zero Addresses

```csharp
Assert.True(addressUtil.IsAnEmptyAddress(null));
Assert.True(addressUtil.IsAnEmptyAddress("0x0"));
Assert.Equal("0x0000000000000000000000000000000000000000", AddressUtil.ZERO_ADDRESS);
```

## UniqueAddressList

```csharp
var uniqueList = new UniqueAddressList();
uniqueList.Add("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed");
uniqueList.Add("0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED");
Assert.Single(uniqueList);
```

## Pad Short Addresses

```csharp
var padded = addressUtil.ConvertToValid20ByteAddress("0x1234");
// "0x0000000000000000000000000000000000001234"
```

## Next Steps

- [Keys and Accounts](guide-keys-accounts) — generate keys and derive addresses

## Further Reading

- [Nethereum.Util Package](nethereum-util)
