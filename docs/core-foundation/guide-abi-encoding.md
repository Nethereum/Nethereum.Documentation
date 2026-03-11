---
title: ABI Encoding and Decoding
sidebar_label: "ABI Encoding"
sidebar_position: 15
description: Encode and decode Ethereum ABI data — the Solidity abi.encode, abi.encodePacked, and keccak256 equivalents in C#
---

# ABI Encoding and Decoding

Every interaction with a smart contract goes through ABI encoding — it's how Ethereum turns function calls, parameters, and return values into the raw bytes that travel over the wire. If you've ever called `abi.encode()`, `abi.encodePacked()`, or `keccak256(abi.encodePacked(...))` in Solidity, this is the C# equivalent.

## When You Need This

Most of the time, Nethereum handles ABI encoding for you — when you use typed contract handlers (`GetContractQueryHandler`, `GetContractTransactionHandler`), encoding happens automatically behind the scenes.

You need direct ABI encoding when you want to:

- **Reproduce Solidity's `abi.encode` / `abi.encodePacked`** — for hashing, signature verification, or off-chain computation
- **Compute CREATE2 addresses** — which require `keccak256(abi.encodePacked(...))`
- **Verify or build EIP-712 typed data signatures** — for gasless approvals (ERC-2612 Permit), off-chain orders, etc.
- **Decode raw transaction data or logs** — parse calldata or event topics manually
- **Build function selectors** — the first 4 bytes of the Keccak-256 hash of the function signature, which tells the EVM which function to call

## Install

```bash
dotnet add package Nethereum.ABI
```

For EIP-712 typed data (covered at the end of this guide):

```bash
dotnet add package Nethereum.Signer.EIP712
```

---

## The ABIEncode Class

`ABIEncode` is the high-level entry point for encoding. It mirrors Solidity's encoding functions directly.

### abi.encode() — Standard Encoding

Standard ABI encoding pads every value to 32 bytes. This is what Solidity's `abi.encode(...)` produces.

```csharp
using Nethereum.ABI;

var abiEncode = new ABIEncode();

// Encode with explicit types (matches Solidity exactly)
byte[] encoded = abiEncode.GetABIEncoded(
    new ABIValue("string", "hello"),
    new ABIValue("int", 69),
    new ABIValue("string", "world"));
```

Each value is padded to 32 bytes with proper offset handling for dynamic types (strings, bytes, arrays). The result is identical to what `abi.encode("hello", 69, "world")` produces in Solidity.

You can also let Nethereum infer the types:

```csharp
// Auto-detect types from .NET values
byte[] encoded = abiEncode.GetABIEncoded("1", "2", "3");
```

### abi.encodePacked() — Packed Encoding

Packed encoding concatenates values without padding — it's not self-describing (you must know the types to decode it). Used in Solidity's `abi.encodePacked()` for hashing and CREATE2 address computation.

```csharp
byte[] packed = abiEncode.GetABIEncodedPacked(
    new ABIValue("string", "Hello!%"),
    new ABIValue("int8", -23),
    new ABIValue("address", "0x85F43D8a49eeB85d32Cf465507DD71d507100C1d"));
```

This is the C# equivalent of `abi.encodePacked("Hello!%", int8(-23), 0x85F4...)` in Solidity. Packed encoding is NOT self-describing — you can't decode it without knowing the types. Its main use is as input to `keccak256`.

### keccak256(abi.encodePacked(...)) — Hash in One Step

The most common pattern in Solidity: pack values and hash them. `ABIEncode` does both in one call:

```csharp
// This is: keccak256(abi.encodePacked("Hello!%", int8(-23), address))
byte[] hash = abiEncode.GetSha3ABIEncodedPacked(
    new ABIValue("string", "Hello!%"),
    new ABIValue("int8", -23),
    new ABIValue("address", "0x85F43D8a49eeB85d32Cf465507DD71d507100C1d"));
```

The `GetSha3ABIEncoded` family hashes standard-encoded data; the `GetSha3ABIEncodedPacked` family hashes packed data. Use the packed variants when matching Solidity's `keccak256(abi.encodePacked(...))`.

### Encoding from Parameter-Attributed Classes

If you have typed DTOs (from code generation or hand-written), encode them directly:

```csharp
[FunctionOutput]
public class MyParams
{
    [Parameter("address", "owner", 1)]
    public string Owner { get; set; }

    [Parameter("uint256", "amount", 2)]
    public BigInteger Amount { get; set; }
}

var input = new MyParams { Owner = "0x1234...", Amount = 5000 };
byte[] encoded = abiEncode.GetABIParamsEncoded(input);
byte[] packed = abiEncode.GetABIParamsEncodedPacked(input);
byte[] hash = abiEncode.GetSha3ABIParamsEncodedPacked(input);
```

### Decoding

Decode ABI-encoded bytes back to typed values:

```csharp
string address = abiEncode.DecodeEncodedAddress(encodedBytes);
BigInteger value = abiEncode.DecodeEncodedBigInteger(encodedBytes);
bool flag = abiEncode.DecodeEncodedBoolean(encodedBytes);
string text = abiEncode.DecodeEncodedString(encodedBytes);

// Decode complex types (tuples/structs)
MyParams result = abiEncode.DecodeEncodedComplexType<MyParams>(encodedBytes);
```

---

## Function Selectors

A function selector is the first 4 bytes of the Keccak-256 hash of the canonical function signature. It identifies which function to call in a contract.

```csharp
var keccak = Sha3Keccack.Current;
var transferSignature = "transfer(address,uint256)";
var fullHash = keccak.CalculateHash(transferSignature);
var selector = fullHash.Substring(0, 8); // "a9059cbb"
```

The selector `a9059cbb` is what appears at the start of every ERC-20 `transfer` call's calldata. Nethereum computes selectors automatically when you use typed function messages, but you need manual computation when parsing raw calldata or building custom encoding.

## Encoding Function Calls

For lower-level control, `FunctionCallEncoder` builds complete calldata (selector + encoded parameters):

```csharp
var functionCallEncoder = new FunctionCallEncoder();
var sha3Signature = "a9059cbb";
var inputsParameters = new[]
{
    new Parameter("address", "to") { DecodedType = typeof(string) },
    new Parameter("uint256", "value") { DecodedType = typeof(BigInteger) }
};

var result = functionCallEncoder.EncodeRequest(sha3Signature, inputsParameters,
    "1234567890abcdef1234567890abcdef12345678", new BigInteger(1000));
```

Or use a typed DTO, which is cleaner and catches errors at compile time:

```csharp
[Function("transfer")]
public class TransferFunction
{
    [Parameter("address", "to", 1)]
    public string To { get; set; }
    [Parameter("uint256", "amount", 2)]
    public BigInteger Amount { get; set; }
}

var input = new TransferFunction
{
    To = "1234567890abcdef1234567890abcdef12345678",
    Amount = new BigInteger(5000)
};

var result = new FunctionCallEncoder().EncodeRequest(input, "a9059cbb");
```

:::tip
In practice, you rarely call `FunctionCallEncoder` directly — `web3.Eth.GetContractTransactionHandler<TransferFunction>()` does this for you. Use the encoder when you need raw calldata without sending a transaction.
:::

## Decoding Function Output

When you call a view/pure function and get raw hex back:

```csharp
var functionCallDecoder = new FunctionCallDecoder();

var outputParameters = new[]
{
    new ParameterOutput
    {
        Parameter = new Parameter("uint256", "balance") { DecodedType = typeof(BigInteger) }
    }
};

var encodedOutput = "0x" +
    "0000000000000000000000000000000000000000000000000000000000000045";

var result = functionCallDecoder.DecodeOutput(encodedOutput, outputParameters);
// result[0].Result == 69 (BigInteger)
```

## Decoding Events and Topics

Events use indexed parameters as log topics. The first topic is always the Keccak-256 hash of the event signature:

```csharp
[Event("Transfer")]
public class TransferEventDTO
{
    [Parameter("address", "_from", 1, true)]
    public string From { get; set; }
    [Parameter("address", "_to", 2, true)]
    public string To { get; set; }
    [Parameter("uint256", "_value", 3, true)]
    public BigInteger Value { get; set; }
}

var topics = new[]
{
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x000000000000000000000000c14934679e71ef4d18b6ae927fe2b953c7fd9b91",
    "0x0000000000000000000000000000000000000000000000400000402000000001"
};

var transferDto = new TransferEventDTO();
new EventTopicDecoder().DecodeTopics(transferDto, topics, "0x");
```

The `true` in the `[Parameter]` attribute marks indexed parameters, which appear as topics rather than in the data field.

## Decoding Custom Errors

Solidity custom errors (since 0.8.4) are encoded identically to function calls — a 4-byte selector followed by ABI-encoded parameters:

```csharp
var error = new ErrorABI("InsufficientBalance");
error.InputParameters = new[]
{
    new Parameter("address", "account", 1),
    new Parameter("uint256", "balance", 2)
};

var errorSelector = error.Sha3Signature;
var encodedData = "0x" + errorSelector +
    "000000000000000000000000c14934679e71ef4d18b6ae927fe2b953c7fd9b91" +
    "0000000000000000000000000000000000000000000000000000000000000064";

var decoder = new FunctionCallDecoder();
var decoded = decoder.DecodeError(error, encodedData);
// decoded[0].Result == "0xc14934679e71ef4d18b6ae927fe2b953c7fd9b91"
// decoded[1].Result == 100 (BigInteger)
```

For a higher-level approach to error handling with automatic revert reason detection, see the [Error Handling guide](../smart-contracts/guide-error-handling).

## Deserializing a Contract ABI

Parse a JSON ABI string into a strongly-typed contract model for inspection or dynamic interaction:

```csharp
var abi = @"[{""constant"":false,""inputs"":[{""name"":""a"",""type"":""uint256""}],
""name"":""multiply"",""outputs"":[{""name"":""d"",""type"":""uint256""}],""type"":""function""},
{""anonymous"":false,""inputs"":[{""indexed"":true,""name"":""from"",""type"":""address""},
{""indexed"":true,""name"":""to"",""type"":""address""},{""indexed"":false,""name"":""value"",
""type"":""uint256""}],""name"":""Transfer"",""type"":""event""}]";

var des = new ABIJsonDeserialiser();
var contract = des.DeserialiseContract(abi);
// contract.Functions.Length == 2, contract.Events.Length == 1
```

---

## EIP-712 Typed Data Encoding

EIP-712 defines a standard for signing structured data — used for gasless token approvals (ERC-2612 Permit), off-chain orders (Seaport, 0x), governance votes, and any use case where you want a user to sign structured data that a contract can verify.

The `Eip712TypedDataEncoder` handles encoding, hashing, and domain separator computation.

### Signing a Simple Typed Message

```csharp
using Nethereum.ABI.EIP712;
using Nethereum.Signer;
using Nethereum.Signer.EIP712;

// Define your domain
var domain = new Domain
{
    Name = "MyDApp",
    Version = "1",
    ChainId = 1,
    VerifyingContract = "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
};

// Define your message type with [Parameter] attributes
[Struct("Mail")]
public class Mail
{
    [Parameter("string", "contents", 1)]
    public string Contents { get; set; }
}

var message = new Mail { Contents = "Hello Bob!" };

// Encode and hash
var encoder = Eip712TypedDataEncoder.Current;
var encoded = encoder.EncodeAndHashTypedData(message,
    new TypedData<Domain> { Domain = domain, PrimaryType = "Mail" });
```

### ERC-2612 Permit (Gasless Token Approval)

This is the most common real-world use of EIP-712 — letting a user approve a token spend without paying gas:

```csharp
[Struct("Permit")]
public class Permit
{
    [Parameter("address", "owner", 1)]
    public string Owner { get; set; }
    [Parameter("address", "spender", 2)]
    public string Spender { get; set; }
    [Parameter("uint256", "value", 3)]
    public BigInteger Value { get; set; }
    [Parameter("uint256", "nonce", 4)]
    public BigInteger Nonce { get; set; }
    [Parameter("uint256", "deadline", 5)]
    public BigInteger Deadline { get; set; }
}

var permit = new Permit
{
    Owner = ownerAddress,
    Spender = spenderAddress,
    Value = BigInteger.Parse("1000000000000000000"),
    Nonce = 0,
    Deadline = BigInteger.Parse("1680000000")
};

var domain = new Domain
{
    Name = "USD Coin",
    Version = "2",
    ChainId = 1,
    VerifyingContract = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
};

// Auto-generate the type schema from the C# classes
var typedData = encoder.GenerateTypedData(permit, domain, "Permit");
var hash = encoder.EncodeAndHashTypedData(permit, typedData);

// Sign with the owner's key
var signer = new EthereumMessageSigner();
var key = new EthECKey(ownerPrivateKey);
var signature = key.SignAndCalculateV(hash);
```

### Encoding from JSON

When you receive EIP-712 typed data as JSON (e.g., from a frontend or wallet):

```csharp
var json = @"{
  ""types"": {
    ""EIP712Domain"": [...],
    ""Mail"": [...]
  },
  ""primaryType"": ""Mail"",
  ""domain"": { ""name"": ""MyDApp"", ""version"": ""1"" },
  ""message"": { ""contents"": ""Hello"" }
}";

var hash = encoder.EncodeAndHashTypedData(json);
```

For full EIP-712 signing workflows including verification and recovery, see the [EIP-712 Signing guide](../signing-and-key-management/guide-eip712-signing).

---

## Quick Reference: Solidity ↔ Nethereum

| Solidity | Nethereum |
|----------|-----------|
| `abi.encode(a, b, c)` | `abiEncode.GetABIEncoded(new ABIValue("type", a), ...)` |
| `abi.encodePacked(a, b, c)` | `abiEncode.GetABIEncodedPacked(new ABIValue("type", a), ...)` |
| `keccak256(abi.encode(...))` | `abiEncode.GetSha3ABIEncoded(...)` |
| `keccak256(abi.encodePacked(...))` | `abiEncode.GetSha3ABIEncodedPacked(...)` |
| `bytes4(keccak256("transfer(address,uint256)"))` | `Sha3Keccack.Current.CalculateHash(sig).Substring(0, 8)` |
| `abi.decode(data, (uint256))` | `abiEncode.DecodeEncodedBigInteger(data)` |

## Next Steps

- [Smart Contract Interaction](../smart-contracts/guide-smart-contract-interaction) — use ABI encoding through typed contract handlers (recommended for most use cases)
- [Decode Transactions](guide-decode-transactions) — inspect and decode raw transaction calldata
- [EIP-712 Signing](../signing-and-key-management/guide-eip712-signing) — full typed data signing workflows
- [Events & Logs](../smart-contracts/guide-events) — decode event data from transaction receipts
- [Error Handling](../smart-contracts/guide-error-handling) — decode revert reasons and custom errors

## Package References

- [Nethereum.ABI](nethereum-abi) — core ABI encoding, decoding, and type system
- [Nethereum.Signer.EIP712](../signing-and-key-management/nethereum-signer-eip712) — EIP-712 typed data signing
