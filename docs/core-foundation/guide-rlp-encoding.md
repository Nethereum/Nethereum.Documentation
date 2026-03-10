---
title: RLP Encoding and Decoding
sidebar_label: "RLP Encoding"
sidebar_position: 11
description: Recursive Length Prefix encoding for Ethereum data structures
---

# RLP Encoding and Decoding

Encode and decode data using Recursive Length Prefix (RLP) — Ethereum's serialization format for transactions, blocks, and state.

## Installation

```bash
dotnet add package Nethereum.RLP
```

## What is RLP?

RLP encodes nested arrays of binary data. It is used internally for transaction encoding, block headers, and Merkle Patricia Trie nodes. There are two kinds of items: byte arrays and lists of items.

## Encode Strings

```csharp
using RlpEncoder = Nethereum.RLP.RLP;

string dog = "dog";
byte[] dogBytes = dog.ToBytesForRLPEncoding();
byte[] encoded = RlpEncoder.EncodeElement(dogBytes);

IRLPElement decoded = RlpEncoder.Decode(encoded);
string decodedStr = decoded.RLPData.ToStringFromRLPDecoded();
Assert.Equal("dog", decodedStr);
```

## Encode Integers

```csharp
int value = 1024;
byte[] valueBytes = value.ToBytesForRLPEncoding();
byte[] encoded = RlpEncoder.EncodeElement(valueBytes);

IRLPElement decoded = RlpEncoder.Decode(encoded);
int decodedValue = decoded.RLPData.ToBigIntegerFromRLPDecoded().ToInt32();
Assert.Equal(1024, decodedValue);
```

## Encode BigInteger

```csharp
var bigInt = BigInteger.Parse("123456789012345678901234567890");
byte[] bigIntBytes = bigInt.ToBytesForRLPEncoding();
byte[] encoded = RlpEncoder.EncodeElement(bigIntBytes);

IRLPElement decoded = RlpEncoder.Decode(encoded);
var decodedBigInt = decoded.RLPData.ToBigIntegerFromRLPDecoded();
Assert.Equal(bigInt, decodedBigInt);
```

## Encode Lists

```csharp
string[] strings = { "cat", "dog" };
byte[][] stringBytes = strings.ToBytesForRLPEncoding();
byte[][] encodedElements = new byte[stringBytes.Length][];
for (int i = 0; i < stringBytes.Length; i++)
    encodedElements[i] = RlpEncoder.EncodeElement(stringBytes[i]);

byte[] encodedList = RlpEncoder.EncodeList(encodedElements);

RLPCollection decodedList = RlpEncoder.Decode(encodedList) as RLPCollection;
Assert.Equal("cat", decodedList[0].RLPData.ToStringFromRLPDecoded());
```

## Encode Raw Bytes

```csharp
byte[] rawBytes = new byte[] { 0x01, 0x02, 0x03 };
byte[] encoded = RlpEncoder.EncodeElement(rawBytes);

IRLPElement decoded = RlpEncoder.Decode(encoded);
Assert.Equal(rawBytes, decoded.RLPData);
```

## Next Steps

- [Transaction Types](guide-transaction-models) — see how RLP is used to encode transactions

## Further Reading

- [Nethereum.RLP Package](nethereum-rlp)
