---
title: KeyStore Files
sidebar_label: "KeyStore Files"
sidebar_position: 4
description: Encrypt and decrypt private keys using Web3 Secret Storage Definition (Scrypt/PBKDF2)
---

# KeyStore Files

Encrypt private keys to JSON files using the [Web3 Secret Storage Definition](https://ethereum.org/en/developers/docs/data-structures-and-encoding/web3-secret-storage/). The encrypted JSON can be safely stored on disk — the private key is only accessible with the correct password.

```bash
dotnet add package Nethereum.KeyStore
```

## Encrypt a Key (Scrypt)

Scrypt is the recommended KDF — it's memory-hard, making brute-force attacks expensive.

<!-- tag:KeyStoreDocExampleTests:ShouldGenerateScryptKeystore -->

```csharp
using Nethereum.KeyStore;
using Nethereum.Signer;

var ecKey = EthECKey.GenerateKey();
var address = ecKey.GetPublicAddress();
var privateKeyBytes = ecKey.GetPrivateKeyAsBytes();

var keyStoreService = new KeyStoreScryptService();
var json = keyStoreService.EncryptAndGenerateKeyStoreAsJson(
    "your-strong-password", privateKeyBytes, address);

File.WriteAllText($"keystore-{address}.json", json);
```

### Custom Scrypt Parameters

Tune the cost parameter for your platform. Lower values are faster but less secure:

<!-- tag:KeyStoreDocExampleTests:ShouldCreateKeystoreWithCustomScryptParams -->

```csharp
// Default: N=262144 (strong, slow — desktop)
var json = keyStoreService.EncryptAndGenerateKeyStoreAsJson(
    "password", privateKeyBytes, address);

// Light: N=32 (fast — WASM, mobile, tests)
var scryptParams = new ScryptParams { N = 32, R = 8, P = 6 };
var json = keyStoreService.EncryptAndGenerateKeyStoreAsJson(
    "password", privateKeyBytes, address, scryptParams);
```

## Encrypt a Key (PBKDF2)

Legacy KDF — use for compatibility with older wallets:

<!-- tag:KeyStoreDocExampleTests:ShouldCreatePbkdf2Keystore -->

```csharp
var keyStoreService = new KeyStorePbkdf2Service();
var json = keyStoreService.EncryptAndGenerateKeyStoreAsJson(
    "password", privateKeyBytes, address);
```

## Decrypt a KeyStore

<!-- tag:KeyStoreDocExampleTests:ShouldRoundtripKeyThroughKeystore -->

```csharp
var json = File.ReadAllText("keystore-file.json");

// Auto-detect KDF type (scrypt or pbkdf2)
var keyStoreService = new KeyStoreService();
var privateKeyBytes = keyStoreService.DecryptKeyStoreFromJson("your-password", json);

var account = new Nethereum.Web3.Accounts.Account(privateKeyBytes, chainId: 1);
```

### Detect KDF Type

<!-- tag:KeyStoreDocExampleTests:ShouldDetectKdfTypeInJson -->

```csharp
var kdfType = KeyStoreKdfChecker.GetKdfType(json);
// Returns "scrypt" or "pbkdf2"
```

## Default KeyStore Service

`KeyStoreService` is a convenience wrapper that defaults to Scrypt for encryption and auto-detects for decryption:

<!-- tag:KeyStoreDocExampleTests:ShouldUseDefaultKeyStoreServiceWithScrypt -->

```csharp
var service = new KeyStoreService();

// Encrypt (uses Scrypt by default)
var json = service.EncryptAndGenerateDefaultKeyStoreAsJson(
    "password", privateKeyBytes, address);

// Decrypt (auto-detects KDF)
var key = service.DecryptKeyStoreFromJson("password", json);
```

:::tip Claude Code
Install the Nethereum skills plugin for AI-assisted development: `/plugin install nethereum-skills`
:::

## Next Steps

- [HD Wallets](./guide-hd-wallets) — derive multiple accounts from a mnemonic
- [Keys & Accounts](../core-foundation/guide-keys-accounts) — account types and key generation
