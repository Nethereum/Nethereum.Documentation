---
title: Manage Keys, Accounts, and Keystores
sidebar_label: "Keys & Accounts"
sidebar_position: 5
description: Generate EC keys, create accounts, and encrypt keys with keystores
---

# Manage Keys, Accounts, and Keystores

Generate Ethereum keys, create accounts for different chains, and securely store private keys in keystore files.

## Installation

```bash
dotnet add package Nethereum.Web3
```

## Generate an EC Key

> **Source:** [`SignerDocExampleTests.ShouldGenerateKeyAndDerivePublicKeyAndAddress`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Signer.UnitTests/SignerDocExampleTests.cs)

```csharp
var ecKey = EthECKey.GenerateKey();
var privateKeyHex = ecKey.GetPrivateKey();
var publicKeyBytes = ecKey.GetPubKey();
var address = ecKey.GetPublicAddress();

var reconstructed = new EthECKey(privateKeyHex);
Assert.Equal(address, reconstructed.GetPublicAddress());
```

`EthECKey.GenerateKey()` creates a cryptographically random secp256k1 key pair. The Ethereum address is derived from the last 20 bytes of the Keccak-256 hash of the uncompressed public key.

## Create an Account with Chain ID

> **Source:** [`AccountTypesDocExampleTests.ShouldCreateAccountWithChainId`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Accounts.IntegrationTests/AccountTypesDocExampleTests.cs)

```csharp
var privateKey = "0xb5b1870957d373ef0eeffecc6e4812c0fd08f554b37b233526acc331bf1544f7";
var account = new Account(privateKey, Chain.MainNet);
```

The `Chain` enum provides named constants for common networks. You can also pass a numeric chain ID directly:

```csharp
var mainnet = new Account(privateKey, Chain.MainNet);
var sepolia = new Account(privateKey, 11155111);
var polygon = new Account(privateKey, 137);
```

The address is the same across all chains; only the chain ID differs.

## View-Only Account

> **Source:** [`AccountTypesDocExampleTests.ShouldCreateViewOnlyAccount`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Accounts.IntegrationTests/AccountTypesDocExampleTests.cs)

```csharp
var address = "0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe";
var viewOnly = new ViewOnlyAccount(address);
```

A `ViewOnlyAccount` allows read-only queries (balance, call) without a private key. It cannot sign transactions.

## Encrypt to Keystore (Scrypt)

> **Source:** [`AccountTypesDocExampleTests.ShouldEncryptAndDecryptKeystore`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Accounts.IntegrationTests/AccountTypesDocExampleTests.cs)

```csharp
var ecKey = EthECKey.GenerateKey();
var privateKeyBytes = ecKey.GetPrivateKeyAsBytes();
var address = ecKey.GetPublicAddress();

var keyStoreService = new KeyStoreService();
var keystoreJson = keyStoreService.EncryptAndGenerateDefaultKeyStoreAsJson(
    password, privateKeyBytes, address);
```

The default `KeyStoreService` uses Scrypt as the key derivation function, producing a standard Ethereum V3 keystore JSON file.

## Decrypt from Keystore

> **Source:** [`AccountTypesDocExampleTests.ShouldEncryptAndDecryptKeystore`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Accounts.IntegrationTests/AccountTypesDocExampleTests.cs)

```csharp
var decryptedKey = keyStoreService.DecryptKeyStoreFromJson(password, keystoreJson);
```

Returns the raw private key bytes. You can reconstruct an `EthECKey` from these bytes using `new EthECKey(decryptedKey, true)`.

## Load Account from Keystore

> **Source:** [`AccountTypesDocExampleTests.ShouldLoadAccountFromKeystore`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Accounts.IntegrationTests/AccountTypesDocExampleTests.cs)

```csharp
var account = Account.LoadFromKeyStore(json, password);
```

This is the simplest way to go from a keystore file to a ready-to-use `Account` object.

## Custom Scrypt Parameters

> **Source:** [`KeyStoreDocExampleTests.ShouldCreateKeystoreWithCustomScryptParams`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Signer.UnitTests/KeyStoreDocExampleTests.cs)

```csharp
var customParams = new ScryptParams { Dklen = 32, N = 4096, R = 8, P = 1 };
var scryptService = new KeyStoreScryptService();
var json = scryptService.EncryptAndGenerateKeyStoreAsJson(password, privateKeyBytes, address, customParams);
```

Lower `N` values make encryption/decryption faster but less resistant to brute force. The default `N` is 262144. Use lower values only for testing or low-security scenarios.

## PBKDF2 Keystore (Legacy)

> **Source:** [`KeyStoreDocExampleTests.ShouldCreatePbkdf2Keystore`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Signer.UnitTests/KeyStoreDocExampleTests.cs)

```csharp
var pbkdf2Service = new KeyStorePbkdf2Service();
var pbkdf2Params = new Pbkdf2Params { Dklen = 32, Count = 1024, Prf = "hmac-sha256" };
var json = pbkdf2Service.EncryptAndGenerateKeyStoreAsJson(password, privateKeyBytes, address, pbkdf2Params);

var decryptedBytes = pbkdf2Service.DecryptKeyStoreFromJson(password, json);
```

PBKDF2 is supported for compatibility with older keystores. Scrypt is recommended for new keystores.

## Generate UTC Filename

> **Source:** [`AccountTypesDocExampleTests.ShouldGenerateKeystoreFilename`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Accounts.IntegrationTests/AccountTypesDocExampleTests.cs)

```csharp
var keyStoreService = new KeyStoreService();
var filename = keyStoreService.GenerateUTCFileName(address);
```

Produces a filename in the standard `UTC--<timestamp>--<address>` format used by Geth and other Ethereum clients.

## Next Steps

- [Send ETH Transfers](guide-send-eth) -- transfer Ether between accounts
- [Sign and Verify Messages](guide-message-signing) -- sign data with your keys

## Related Packages

- [Nethereum.Accounts](nethereum-accounts) -- account types and transaction managers
- [Nethereum.Signer](../signing-and-key-management/overview) -- EC key and transaction signing
