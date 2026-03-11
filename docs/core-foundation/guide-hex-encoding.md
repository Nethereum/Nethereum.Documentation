---
title: Work with Hex Data
sidebar_label: "Hex Encoding"
sidebar_position: 16
description: Convert between bytes, strings, and hex-encoded data
---

Ethereum transmits all data as hex-encoded strings over JSON-RPC — addresses, transaction data, balances, and block numbers are all hex. Nethereum handles most conversions automatically, but you'll need these utilities when working with raw RPC responses, building custom tooling, or debugging on-chain data.

## Install

```bash
dotnet add package Nethereum.Hex
```

## Byte Arrays to Hex

```csharp
var data = new byte[] { 0xDE, 0xAD, 0xBE, 0xEF };
var hexWithPrefix = data.ToHex(prefix: true);   // "0xdeadbeef"
var hexWithoutPrefix = data.ToHex(prefix: false); // "deadbeef"
```

## Hex to Bytes

```csharp
var hex = "0xdeadbeef";
var bytes = hex.HexToByteArray();
// bytes == { 0xDE, 0xAD, 0xBE, 0xEF }
```

## Hex Prefix Handling

```csharp
var withoutPrefix = "deadbeef";
var withPrefix = "0xdeadbeef";

withoutPrefix.EnsureHexPrefix(); // "0xdeadbeef"
withPrefix.EnsureHexPrefix();    // "0xdeadbeef"

withPrefix.HasHexPrefix();    // true
withPrefix.RemoveHexPrefix(); // "deadbeef"
```

## Compare Hex Strings

Case-insensitive comparison that ignores prefix differences.

```csharp
var hex1 = "0xDeAdBeEf";
var hex2 = "0xdeadbeef";
hex1.IsTheSameHex(hex2); // true
```

## HexBigInteger for Gas and Value

`HexBigInteger` wraps a `BigInteger` and serializes as a hex string in JSON-RPC calls.

```csharp
var fromNumber = new HexBigInteger(new BigInteger(1_000_000));
var fromHex = new HexBigInteger("0xf4240");
// Both represent the same value
// fromNumber.HexValue == "0xf4240"
// fromHex.Value == 1_000_000
```

## UTF-8 String Encoding

```csharp
var text = "Hello Ethereum";
var hex = text.ToHexUTF8();
var decoded = hex.HexToUTF8String(); // "Hello Ethereum"
```

## Next Steps

- [ABI Encoding](guide-abi-encoding.md) -- encode and decode smart contract data
- [RLP Encoding](guide-rlp-encoding.md) -- the low-level serialization format used for transactions and trie nodes

## Package References

- [Nethereum.Hex](nethereum-hex.md)
