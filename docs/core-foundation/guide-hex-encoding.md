---
title: Work with Hex Data
sidebar_label: "Hex Encoding"
sidebar_position: 4
description: Convert between bytes, strings, and hex-encoded data
---

Convert between byte arrays, strings, and hex-encoded values -- the lingua franca of Ethereum.

## Install

```bash
dotnet add package Nethereum.Hex
```

## Byte Arrays to Hex

<!-- tag:HexConversionDocExampleTests:ShouldConvertBytesToHex -->
```csharp
var data = new byte[] { 0xDE, 0xAD, 0xBE, 0xEF };
var hexWithPrefix = data.ToHex(prefix: true);   // "0xdeadbeef"
var hexWithoutPrefix = data.ToHex(prefix: false); // "deadbeef"
```

## Hex to Bytes

<!-- tag:HexConversionDocExampleTests:ShouldConvertHexToBytes -->
```csharp
var hex = "0xdeadbeef";
var bytes = hex.HexToByteArray();
// bytes == { 0xDE, 0xAD, 0xBE, 0xEF }
```

## Hex Prefix Handling

<!-- tag:HexConversionDocExampleTests:ShouldEnsureHexPrefix -->
<!-- tag:HexConversionDocExampleTests:ShouldCheckAndRemoveHexPrefix -->
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

<!-- tag:HexConversionDocExampleTests:ShouldCompareHexStrings -->
```csharp
var hex1 = "0xDeAdBeEf";
var hex2 = "0xdeadbeef";
hex1.IsTheSameHex(hex2); // true
```

## HexBigInteger for Gas and Value

`HexBigInteger` wraps a `BigInteger` and serializes as a hex string in JSON-RPC calls.

<!-- tag:HexConversionDocExampleTests:ShouldCreateHexBigIntegerFromBothFormats -->
```csharp
var fromNumber = new HexBigInteger(new BigInteger(1_000_000));
var fromHex = new HexBigInteger("0xf4240");
// Both represent the same value
// fromNumber.HexValue == "0xf4240"
// fromHex.Value == 1_000_000
```

## UTF-8 String Encoding

<!-- tag:HexConversionDocExampleTests:ShouldEncodeDecodeUtf8AsHex -->
```csharp
var text = "Hello Ethereum";
var hex = text.ToHexUTF8();
var decoded = hex.HexToUTF8String(); // "Hello Ethereum"
```

## Next Steps

- [Guide: ABI Encoding](guide-abi-encoding.md) -- encode and decode smart contract data

## Package References

- [Nethereum.Hex](nethereum-hex.md)
