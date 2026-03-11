---
title: Validate and Format Addresses
sidebar_label: "Address Utilities"
sidebar_position: 17
description: Validate, checksum, compare, and format Ethereum addresses
---

# Validate and Format Addresses

Every Ethereum interaction starts with an address. When your application accepts an address from user input, reads one from a contract event, or compares addresses from different sources, you need to answer three questions: is it valid, is it the same address, and is it safely formatted?

Ethereum addresses are 20-byte hex strings, but they arrive in many forms: lowercase from RPC calls, uppercase from older wallets, mixed-case with an EIP-55 checksum, or truncated in sloppy data. `AddressUtil` in Nethereum handles all of these cases so you don't have to write your own comparison and validation logic.

## Installation

```bash
dotnet add package Nethereum.Util
```

## EIP-55 Checksum

EIP-55 is a mixed-case encoding that catches typos. The capitalisation of each hex letter is determined by hashing the address, so if you change any letter's case, the checksum fails. Always checksum addresses before displaying them to users or storing them.

```csharp
var addressUtil = AddressUtil.Current;

var rawAddress = "0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed";
var checksummed = addressUtil.ConvertToChecksumAddress(rawAddress);
Console.WriteLine(checksummed);
// "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"

bool isValid = addressUtil.IsChecksumAddress(checksummed);
Console.WriteLine($"Checksum valid: {isValid}"); // true
```

## Validate Address Format

Before processing any address from user input or external data, check that it is well-formed. This catches obvious mistakes early, before they cause a failed transaction or a confusing error deeper in your code.

```csharp
var userInput = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
bool isValidFormat = addressUtil.IsValidEthereumAddressHexFormat(userInput);
Console.WriteLine($"Valid address: {isValidFormat}"); // true

bool isGarbage = addressUtil.IsValidEthereumAddressHexFormat("not-an-address");
Console.WriteLine($"Garbage input valid: {isGarbage}"); // false

bool correctLength = addressUtil.IsValidAddressLength(userInput);
Console.WriteLine($"Correct length: {correctLength}"); // true
```

## Compare Addresses

Addresses from different sources often have different casing. An RPC node returns lowercase, a block explorer returns checksummed, and a user might paste uppercase. Direct string comparison would treat these as different addresses. Use case-insensitive comparison instead.

```csharp
var fromContract = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
var fromRpc      = "0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED";

bool same = addressUtil.AreAddressesTheSame(fromContract, fromRpc);
Console.WriteLine($"Same address: {same}"); // true

bool alsoSame = fromContract.IsTheSameAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed");
Console.WriteLine($"Extension method match: {alsoSame}"); // true
```

## Empty and Zero Addresses

Smart contracts use the zero address (`0x0000...0000`) as a sentinel value, for example to indicate "no owner" or a burn destination. Null, empty strings, and short zero forms like `"0x0"` all represent the same concept. Detecting these prevents sending funds to an unrecoverable address.

```csharp
bool isNullEmpty = addressUtil.IsAnEmptyAddress(null);
Console.WriteLine($"Null is empty: {isNullEmpty}"); // true

bool isShortZero = addressUtil.IsAnEmptyAddress("0x0");
Console.WriteLine($"0x0 is empty: {isShortZero}"); // true

Console.WriteLine($"Zero address constant: {AddressUtil.ZERO_ADDRESS}");
// "0x0000000000000000000000000000000000000000"
```

## UniqueAddressList

When collecting addresses from events or transaction logs, duplicates with different casing are common. `UniqueAddressList` deduplicates automatically using case-insensitive comparison.

```csharp
var uniqueList = new UniqueAddressList();
uniqueList.Add("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed");
uniqueList.Add("0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED");
Console.WriteLine($"Count after adding same address twice: {uniqueList.Count}"); // 1
```

## Pad Short Addresses

Some data sources return truncated addresses. Padding restores them to the standard 20-byte format so they work with contracts and RPC calls.

```csharp
var padded = addressUtil.ConvertToValid20ByteAddress("0x1234");
Console.WriteLine(padded);
// "0x0000000000000000000000000000000000001234"
```

## Next Steps

- [Keys and Accounts](../signing-and-key-management/guide-keys-accounts) -- generate keys and derive addresses
- [Hex Encoding](guide-hex-encoding) -- hex conversion and byte-array handling

## Further Reading

- [Nethereum.Util Package](nethereum-util)
