---
title: Manage Keys, Accounts, and Keystores
sidebar_label: "Keys & Accounts"
sidebar_position: 2
description: Generate EC keys, create accounts, and encrypt keys with keystores
---

# Manage Keys, Accounts, and Keystores

:::tip The Simple Way
```csharp
var ecKey = EthECKey.GenerateKey();
var account = new Account(ecKey.GetPrivateKey(), chainId: 1);
var web3 = new Web3(account, "https://your-rpc-url");
```
Generate a key, create an account, and connect — ready to sign transactions.
:::

Every Ethereum interaction starts with an account. This guide covers the three account types Nethereum provides and when to use each one.

## Installation

```bash
dotnet add package Nethereum.Web3
```

## Generate an EC Key

A private key is a 256-bit random number that controls an Ethereum address. Keep it secret.

```csharp
var ecKey = EthECKey.GenerateKey();
var privateKeyHex = ecKey.GetPrivateKey();
var publicKeyBytes = ecKey.GetPubKey();
var address = ecKey.GetPublicAddress();

Console.WriteLine($"Address: {address}");
Console.WriteLine($"Public key length: {publicKeyBytes.Length} bytes");

// Reconstruct the same key from the private key hex
var reconstructed = new EthECKey(privateKeyHex);
Console.WriteLine($"Same address: {reconstructed.GetPublicAddress()}");
```

`EthECKey.GenerateKey()` creates a cryptographically random key pair on Ethereum's elliptic curve (secp256k1). The Ethereum address is derived from the last 20 bytes of the Keccak-256 hash of the uncompressed public key.

## Create an Account with Chain ID

A chain ID identifies which blockchain network you're on (1 = mainnet, 11155111 = Sepolia). It prevents transactions from being replayed on other networks.

```csharp
var privateKey = "0xb5b1870957d373ef0eeffecc6e4812c0fd08f554b37b233526acc331bf1544f7";
var account = new Account(privateKey, Chain.MainNet);
Console.WriteLine($"Account address: {account.Address}");
```

The `Chain` enum provides named constants for common networks. You can also pass a numeric chain ID directly:

```csharp
var mainnet = new Account(privateKey, Chain.MainNet);
var sepolia = new Account(privateKey, 11155111);
var polygon = new Account(privateKey, 137);
```

The address is the same across all chains; only the chain ID differs.

## View-Only Account

```csharp
var address = "0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe";
var viewOnly = new ViewOnlyAccount(address);
Console.WriteLine($"View-only address: {viewOnly.Address}");
```

A `ViewOnlyAccount` allows read-only queries (balance, call) without a private key. It cannot sign transactions.

## Encrypt to Keystore (Scrypt)

Keystores encrypt your private key with a password so you can store it safely on disk.

```csharp
var ecKey = EthECKey.GenerateKey();
var privateKeyBytes = ecKey.GetPrivateKeyAsBytes();
var address = ecKey.GetPublicAddress();

var keyStoreService = new KeyStoreService();
var keystoreJson = keyStoreService.EncryptAndGenerateDefaultKeyStoreAsJson(
    password, privateKeyBytes, address);

Console.WriteLine($"Keystore created for {address}");
```

The default `KeyStoreService` uses Scrypt as the key derivation function, producing a standard Ethereum V3 keystore JSON file.

## Decrypt from Keystore

```csharp
var decryptedKey = keyStoreService.DecryptKeyStoreFromJson(password, keystoreJson);
var restoredKey = new EthECKey(decryptedKey, true);
Console.WriteLine($"Recovered address: {restoredKey.GetPublicAddress()}");
```

Returns the raw private key bytes. You can reconstruct an `EthECKey` from these bytes using `new EthECKey(decryptedKey, true)`.

## Load Account from Keystore

```csharp
var account = Account.LoadFromKeyStore(json, password);
Console.WriteLine($"Loaded account: {account.Address}");
```

This is the simplest way to go from a keystore file to a ready-to-use `Account` object.

## Custom Scrypt Parameters

```csharp
var customParams = new ScryptParams { Dklen = 32, N = 4096, R = 8, P = 1 };
var scryptService = new KeyStoreScryptService();
var json = scryptService.EncryptAndGenerateKeyStoreAsJson(password, privateKeyBytes, address, customParams);
```

Lower `N` values make encryption/decryption faster but less resistant to brute force. The default `N` is 262144. Use lower values only for testing or low-security scenarios.

## PBKDF2 Keystore (Legacy)

```csharp
var pbkdf2Service = new KeyStorePbkdf2Service();
var pbkdf2Params = new Pbkdf2Params { Dklen = 32, Count = 1024, Prf = "hmac-sha256" };
var json = pbkdf2Service.EncryptAndGenerateKeyStoreAsJson(password, privateKeyBytes, address, pbkdf2Params);

var decryptedBytes = pbkdf2Service.DecryptKeyStoreFromJson(password, json);
```

PBKDF2 is supported for compatibility with older keystores. Scrypt is recommended for new keystores.

## Generate UTC Filename

```csharp
var keyStoreService = new KeyStoreService();
var filename = keyStoreService.GenerateUTCFileName(address);
Console.WriteLine($"Keystore filename: {filename}");
```

Produces a filename in the standard `UTC--<timestamp>--<address>` format used by Geth and other Ethereum clients.

## Next Steps

- [Sign and Verify Messages](./guide-message-signing) — sign data with your keys using `personal_sign`
- [Send ETH Transfers](../core-foundation/guide-send-eth) — transfer Ether between accounts
- [HD Wallets](./guide-hd-wallets) — derive multiple accounts from a single mnemonic
- [Hardware Wallets](./guide-hardware-wallets) — sign with Ledger and Trezor devices

## Related Packages

- [Nethereum.Accounts](../core-foundation/nethereum-accounts) — account types and transaction managers
- [Nethereum.Signer](./nethereum-signer) — EC key and transaction signing
