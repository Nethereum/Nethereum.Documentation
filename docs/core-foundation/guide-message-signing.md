---
title: Sign and Verify Messages
sidebar_label: "Message Signing"
sidebar_position: 6
description: Sign UTF-8 messages and verify signatures using personal_sign
---

# Sign and Verify Messages

Sign messages with a private key and recover the signer address -- compatible with MetaMask's `personal_sign`.

## Installation

```bash
dotnet add package Nethereum.Signer
```

## Sign a UTF-8 Message

<!-- tag:PersonalSignDocExampleTests:ShouldSignMessageAndRecoverAddress -->

```csharp
var signer = new EthereumMessageSigner();
var message = "Hello from Nethereum";
var signature = signer.EncodeUTF8AndSign(message, new EthECKey(privateKey));

var recoveredAddress = signer.EncodeUTF8AndEcRecover(message, signature);
```

The message is UTF-8 encoded, then prefixed with `"\x19Ethereum Signed Message:\n" + length` before hashing and signing. This is the same format used by MetaMask and other wallets.

## Sign Raw Bytes

<!-- tag:PersonalSignDocExampleTests:ShouldSignBytesAndRecoverAddress -->

```csharp
var signer = new EthereumMessageSigner();
var data = new byte[] { 0x48, 0x65, 0x6c, 0x6c, 0x6f };
var signature = signer.Sign(data, privateKey);
var recoveredAddress = signer.EcRecover(data, signature);
```

Use `Sign`/`EcRecover` when you already have the raw byte payload.

## Verify a Wallet Signature

<!-- tag:PersonalSignDocExampleTests:ShouldVerifyExternalWalletSignature -->

```csharp
var signer = new EthereumMessageSigner();
var recoveredAddress = signer.EncodeUTF8AndEcRecover(message, signature);
Assert.True(expectedAddress.IsTheSameAddress(recoveredAddress));
```

`IsTheSameAddress` performs a case-insensitive comparison, handling mixed-case checksummed addresses.

## Hash and Sign Shortcuts

<!-- tag:PersonalSignDocExampleTests:ShouldUseHashAndSignShortcuts -->

```csharp
var signer = new EthereumMessageSigner();
var signature = signer.HashAndSign(message, privateKey);
var recovered = signer.HashAndEcRecover(message, signature);
```

These methods accept the private key as a hex string directly, without needing to construct an `EthECKey` first.

## Low-S Signature Verification

<!-- tag:SignerDocExampleTests:ShouldVerifySignatureWithLowSConstraint -->

```csharp
var ecKey = new EthECKey(privateKey);
var signer = new EthereumMessageSigner();
var signature = signer.EncodeUTF8AndSign(message, ecKey);

var prefixedHash = signer.HashPrefixedMessage(message);
var ethSignature = MessageSigner.ExtractEcdsaSignature(signature);

Assert.True(ecKey.VerifyAllowingOnlyLowS(prefixedHash, ethSignature));
```

`VerifyAllowingOnlyLowS` rejects signatures with high-S values, enforcing EIP-2 (transaction malleability protection). Ethereum nodes reject high-S signatures since the Homestead fork.

## Next Steps

- [Manage Keys, Accounts, and Keystores](guide-keys-accounts) -- generate and store keys
- [Signing and Key Management Overview](../signing-and-key-management/overview) -- advanced signing topics

## Related Packages

- [Nethereum.Signer](../signing-and-key-management/overview) -- message and transaction signing
