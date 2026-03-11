---
title: RLP Encoding and Decoding
sidebar_label: "RLP Encoding"
sidebar_position: 18
description: Recursive Length Prefix encoding for Ethereum data structures
---

# RLP Encoding and Decoding

Most developers never call RLP directly -- Nethereum handles it internally when sending transactions and encoding blocks. You only need these APIs when building raw transactions offline, verifying block proofs, or working with the state trie.

**Recursive Length Prefix (RLP)** is Ethereum's binary serialization format. Everything on Ethereum -- transactions, blocks, state -- is RLP-encoded before hashing or transmitting. RLP defines two kinds of items: byte arrays and lists of items.

## Installation

```bash
dotnet add package Nethereum.RLP
```

## Encode and Decode a String

RLP operates on raw bytes. Convert your string to bytes, encode it, then decode back to verify the round-trip.

```csharp
using RlpEncoder = Nethereum.RLP.RLP;

string dog = "dog";
byte[] dogBytes = dog.ToBytesForRLPEncoding();
byte[] encoded = RlpEncoder.EncodeElement(dogBytes);

IRLPElement decoded = RlpEncoder.Decode(encoded);
string decodedStr = decoded.RLPData.ToStringFromRLPDecoded();
Console.WriteLine($"Decoded string: {decodedStr}"); // "dog"
```

## Encode and Decode an Integer

Integers are converted to their minimal big-endian byte representation before encoding.

```csharp
int value = 1024;
byte[] valueBytes = value.ToBytesForRLPEncoding();
byte[] encoded = RlpEncoder.EncodeElement(valueBytes);

IRLPElement decoded = RlpEncoder.Decode(encoded);
int decodedValue = decoded.RLPData.ToBigIntegerFromRLPDecoded().ToInt32();
Console.WriteLine($"Decoded integer: {decodedValue}"); // 1024
```

## Encode and Decode a BigInteger

Large numeric values (such as token amounts or wei values) use `BigInteger` and follow the same pattern.

```csharp
var bigInt = BigInteger.Parse("123456789012345678901234567890");
byte[] bigIntBytes = bigInt.ToBytesForRLPEncoding();
byte[] encoded = RlpEncoder.EncodeElement(bigIntBytes);

IRLPElement decoded = RlpEncoder.Decode(encoded);
var decodedBigInt = decoded.RLPData.ToBigIntegerFromRLPDecoded();
Console.WriteLine($"Decoded BigInteger: {decodedBigInt}");
```

## Encode and Decode a List

RLP lists encode ordered collections -- this is how transaction fields and block headers are structured. Each element is encoded individually, then wrapped in `EncodeList`.

```csharp
string[] strings = { "cat", "dog" };
byte[][] stringBytes = strings.ToBytesForRLPEncoding();
byte[][] encodedElements = new byte[stringBytes.Length][];
for (int i = 0; i < stringBytes.Length; i++)
    encodedElements[i] = RlpEncoder.EncodeElement(stringBytes[i]);

byte[] encodedList = RlpEncoder.EncodeList(encodedElements);

RLPCollection decodedList = RlpEncoder.Decode(encodedList) as RLPCollection;
string first = decodedList[0].RLPData.ToStringFromRLPDecoded();
Console.WriteLine($"First item: {first}"); // "cat"
```

## Encode and Decode Raw Bytes

When you already have binary data (such as a hash or address bytes), encode it directly without conversion.

```csharp
byte[] rawBytes = new byte[] { 0x01, 0x02, 0x03 };
byte[] encoded = RlpEncoder.EncodeElement(rawBytes);

IRLPElement decoded = RlpEncoder.Decode(encoded);
bool matches = decoded.RLPData.SequenceEqual(rawBytes);
Console.WriteLine($"Round-trip matches: {matches}"); // True
```

## Next Steps

- [Transaction Models](guide-transaction-models) -- see how RLP encodes legacy and EIP-1559 transactions under the hood
- [Hex Encoding](guide-hex-encoding) -- convert between hex strings and byte arrays

## Further Reading

- [Nethereum.RLP Package](nethereum-rlp)
