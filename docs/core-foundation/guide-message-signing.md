---
title: Sign and Verify Messages
sidebar_label: "Message Signing"
sidebar_position: 14
description: Sign UTF-8 messages and verify signatures using personal_sign
---

# Sign and Verify Messages

Message signing lets you prove you own an address without sending a transaction. Common uses: wallet authentication (Sign-In with Ethereum), off-chain approvals, and proving ownership of an address to a dApp.

## Installation

```bash
dotnet add package Nethereum.Signer
```

## Sign a UTF-8 Message

```csharp
var signer = new EthereumMessageSigner();
var message = "Hello from Nethereum";
var signature = signer.EncodeUTF8AndSign(message, new EthECKey(privateKey));

Console.WriteLine("Signature: " + signature);
```

The message is UTF-8 encoded, then prefixed with `"\x19Ethereum Signed Message:\n" + length` before hashing and signing. The prefix prevents a signed message from being replayed as a transaction -- it makes the signed data unambiguously a message, not a transaction. This is the same format used by MetaMask and other wallets (`personal_sign`).

## Verify a Signature

Recover the signer address from a message and its signature, then compare it to the expected address:

```csharp
var signer = new EthereumMessageSigner();
var recoveredAddress = signer.EncodeUTF8AndEcRecover(message, signature);

if (expectedAddress.IsTheSameAddress(recoveredAddress))
{
    Console.WriteLine("Signature is valid -- the message was signed by " + recoveredAddress);
}
else
{
    Console.WriteLine("Signature mismatch -- expected " + expectedAddress + " but recovered " + recoveredAddress);
}
```

`IsTheSameAddress` performs a case-insensitive comparison, handling mixed-case checksummed addresses.

## Sign Raw Bytes

When you already have the raw byte payload rather than a string:

```csharp
var signer = new EthereumMessageSigner();
var data = new byte[] { 0x48, 0x65, 0x6c, 0x6c, 0x6f };
var signature = signer.Sign(data, privateKey);
var recoveredAddress = signer.EcRecover(data, signature);

Console.WriteLine("Recovered: " + recoveredAddress);
```

## Hash and Sign Shortcuts

These methods accept the private key as a hex string directly, without needing to construct an `EthECKey` first:

```csharp
var signer = new EthereumMessageSigner();
var signature = signer.HashAndSign(message, privateKey);
var recovered = signer.HashAndEcRecover(message, signature);

Console.WriteLine("Recovered: " + recovered);
```

## Next Steps

- [EIP-712 Typed Data Signing](../signing-and-key-management/guide-eip712-signing) -- sign structured data (permits, orders, typed approvals)
- [Manage Keys, Accounts, and Keystores](guide-keys-accounts) -- generate and store keys
- [Signing and Key Management Overview](../signing-and-key-management/overview) -- advanced signing topics

:::note
Ethereum enforces low-S signatures (EIP-2) to prevent transaction malleability. Nethereum handles this automatically -- you only need to be aware of it if you are implementing custom signature verification. Use `EthECKey.VerifyAllowingOnlyLowS` if you need to explicitly reject high-S signatures.
:::

## Related Packages

- [Nethereum.Signer](../signing-and-key-management/overview) -- message and transaction signing
