---
title: EIP-712 Typed Data Signing
sidebar_label: "EIP-712 Signing"
sidebar_position: 12
description: Sign and verify structured typed data using EIP-712 with Nethereum
---

# EIP-712 Typed Data Signing

[EIP-712](https://eips.ethereum.org/EIPS/eip-712) defines a standard for signing structured, typed data instead of raw byte strings. Wallets can display the data fields to users before signing, preventing blind-signing attacks. Nethereum provides full support for EIP-712 through the `Nethereum.Signer.EIP712` package.

## Installation

```bash
dotnet add package Nethereum.Signer.EIP712
```

## Required Namespaces

```csharp
using System.Numerics;
using Nethereum.ABI.EIP712;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Signer;
using Nethereum.Signer.EIP712;
```

## Define Typed Structs

EIP-712 types map to C# classes decorated with `[Struct]` and `[Parameter]` attributes. Each class represents a struct in the EIP-712 type schema.

```csharp
[Struct("Person")]
public class Person
{
    [Parameter("string", "name", 1)]
    public string Name { get; set; }

    [Parameter("address", "wallet", 2)]
    public string Wallet { get; set; }
}

[Struct("Mail")]
public class Mail
{
    [Parameter("tuple", "from", 1, "Person")]
    public Person From { get; set; }

    [Parameter("tuple", "to", 2, "Person")]
    public Person To { get; set; }

    [Parameter("string", "contents", 3)]
    public string Contents { get; set; }
}
```

Nested structs use the `tuple` Solidity type with the struct name as the fourth `[Parameter]` argument.

## Create TypedData with Domain

The `TypedData<Domain>` object combines the EIP-712 domain separator, type definitions, and the primary type name. `MemberDescriptionFactory.GetTypesMemberDescription` auto-generates the type schema from the C# classes.

```csharp
var typedData = new TypedData<Domain>
{
    Domain = new Domain
    {
        Name = "Ether Mail",
        Version = "1",
        ChainId = 1,
        VerifyingContract = "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
    },
    Types = MemberDescriptionFactory.GetTypesMemberDescription(
        typeof(Domain), typeof(Mail), typeof(Person)),
    PrimaryType = nameof(Mail),
};
```

The `Domain` class is built into `Nethereum.ABI.EIP712` and supports the standard EIP-712 domain fields: `Name`, `Version`, `ChainId`, `VerifyingContract`, and `Salt`.

## Sign and Recover

Use `Eip712TypedDataSigner` to produce an EIP-712 signature and recover the signer address from it.

```csharp
var signer = new Eip712TypedDataSigner();
var key = new EthECKey("your-private-key-hex");

var mail = new Mail
{
    From = new Person
    {
        Name = "Cow",
        Wallet = "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
    },
    To = new Person
    {
        Name = "Bob",
        Wallet = "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"
    },
    Contents = "Hello, Bob!"
};

// Sign
var signature = signer.SignTypedDataV4(mail, typedData, key);

// Recover the signer address
var recoveredAddress = signer.RecoverFromSignatureV4(mail, typedData, signature);
```

The signature is a hex string starting with `0x` (132 characters: 65 bytes encoded as hex plus the `0x` prefix).

## Verify a Signature

EIP-712 verification works by recovering the address from the signature and comparing it to the expected signer.

```csharp
var signerAddress = key.GetPublicAddress();
var recoveredAddress = signer.RecoverFromSignatureV4(mail, typedData, signature);

bool isValid = signerAddress.IsTheSameAddress(recoveredAddress);
```

`IsTheSameAddress` (from `Nethereum.Util`) performs a case-insensitive address comparison.

## Sign from JSON

When you receive EIP-712 typed data as a JSON string (for example from a dapp or wallet-connect request), you can sign and recover without defining C# types.

```csharp
var typedDataJson = @"{
    'domain': {
        'chainId': 1,
        'name': 'Ether Mail',
        'verifyingContract': '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
        'version': '1'
    },
    'message': {
        'contents': 'Hello, Bob!',
        'from': { 'name': 'Cow', 'wallet': '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826' },
        'to': { 'name': 'Bob', 'wallet': '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' }
    },
    'primaryType': 'Mail',
    'types': {
        'EIP712Domain': [
            { 'name': 'name', 'type': 'string' },
            { 'name': 'version', 'type': 'string' },
            { 'name': 'chainId', 'type': 'uint256' },
            { 'name': 'verifyingContract', 'type': 'address' }
        ],
        'Mail': [
            { 'name': 'from', 'type': 'Person' },
            { 'name': 'to', 'type': 'Person' },
            { 'name': 'contents', 'type': 'string' }
        ],
        'Person': [
            { 'name': 'name', 'type': 'string' },
            { 'name': 'wallet', 'type': 'address' }
        ]
    }
}";

var key = new EthECKey("your-private-key-hex");
var signer = new Eip712TypedDataSigner();

var signature = signer.SignTypedDataV4(typedDataJson, key);
var recoveredAddress = signer.RecoverFromSignatureV4(typedDataJson, signature);
```

## ERC-2612 Permit Example

[ERC-2612](https://eips.ethereum.org/EIPS/eip-2612) uses EIP-712 to allow token approvals via off-chain signatures, eliminating the need for a separate `approve` transaction.

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
```

Build the typed data and sign:

```csharp
var typedData = new TypedData<Domain>
{
    Domain = new Domain
    {
        Name = "MyToken",
        Version = "1",
        ChainId = 1,
        VerifyingContract = "0x1234567890abcdef1234567890abcdef12345678"
    },
    Types = MemberDescriptionFactory.GetTypesMemberDescription(
        typeof(Domain), typeof(Permit)),
    PrimaryType = nameof(Permit),
};

var permit = new Permit
{
    Owner = "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
    Spender = "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
    Value = BigInteger.Parse("1000000000000000000"), // 1 token (18 decimals)
    Nonce = 0,
    Deadline = BigInteger.Parse("1000000000000")
};

var key = new EthECKey("your-private-key-hex");
var signer = new Eip712TypedDataSigner();

var signature = signer.SignTypedDataV4(permit, typedData, key);
```

## Auto-Generated Schema Shortcut

For simpler cases where all types can be inferred from a single struct, use the generic `SignTypedData` overload. This skips manual `TypedData` construction by auto-generating the type schema from the C# class attributes.

```csharp
var signer = new Eip712TypedDataSigner();
var key = new EthECKey("your-private-key-hex");

var domain = new Domain
{
    Name = "Ether Mail",
    Version = "1",
    ChainId = 1,
    VerifyingContract = "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
};

var signature = signer.SignTypedData<Permit, Domain>(permit, domain, "Permit", key);
```

To verify the auto-generated signature manually:

```csharp
var encodedData = Eip712TypedDataEncoder.Current
    .EncodeTypedData(permit, domain, "Permit");

var recoveredAddress = new MessageSigner().EcRecover(
    Sha3Keccack.Current.CalculateHash(encodedData), signature);
```

## Domain Separator Properties

The domain separator uniquely identifies your contract and chain. Typical fields:

| Property | Description | Example |
|---|---|---|
| `Name` | Human-readable dapp or protocol name | `"Ether Mail"` |
| `Version` | Schema version | `"1"` |
| `ChainId` | EIP-155 chain ID | `1` (mainnet), `137` (Polygon) |
| `VerifyingContract` | Address of the contract that verifies the signature | `"0xCcCC..."` |
| `Salt` | Optional disambiguation value | (rarely used) |

## Playground

Try EIP-712 signing interactively in the [Nethereum Playground](http://playground.nethereum.com) (sample 1073).

:::tip Claude Code
Install the Nethereum skills plugin for AI-assisted development: `/plugin install nethereum-skills`
:::

## Next Steps

- [Signing and Key Management Overview](./overview.md) -- full list of signing capabilities
- [Nethereum.Signer.EIP712 package reference](./nethereum-signer-eip712.md) -- API details
- [Personal Message Signing](./nethereum-signer.md) -- sign raw messages and personal_sign
