---
title: Signing & Key Management
sidebar_label: Overview
sidebar_position: 1
description: Ethereum accounts, private keys, HD wallets, hardware wallets, and cloud KMS
---

# Signing & Key Management

Ethereum accounts are derived from cryptographic key pairs. Your identity is a private key, and you prove ownership by signing data with it.

## How Ethereum Accounts Work

```
Private Key (32 bytes)
    → Public Key (64 bytes, via ECDSA)
        → Address (20 bytes, via Keccak-256)
```

### EOA vs Smart Account

- **Externally Owned Account (EOA)** — controlled by a private key
- **Smart Contract Account** — controlled by code (ERC-4337 account abstraction)

## Nethereum Account Types

### Account (Private Key)

The most common type. Signs transactions locally before sending:

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

var privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
var account = new Account(privateKey, chainId: 1);
var web3 = new Web3(account, "https://your-rpc-url");
```

### Creating a New Account

```csharp
var ecKey = EthECKey.GenerateKey();
var privateKey = ecKey.GetPrivateKeyAsBytes().ToHex();
var account = new Account(privateKey, chainId: 1);
```

### HD Wallet Derivation

Derive multiple accounts from a mnemonic phrase:

```csharp
var wallet = new Wallet("rapid squeeze excess salute ...", null);
var account0 = wallet.GetAccount(0, chainId: 1);
var account1 = wallet.GetAccount(1, chainId: 1);
```

### ExternalAccount (Hardware Wallets, KMS, Browser Wallets)

For situations where the private key is not directly available:

```csharp
var externalAccount = new ExternalAccount(myExternalSigner, chainId: 1);
await externalAccount.InitialiseAsync();
var web3 = new Web3(externalAccount, "https://your-rpc-url");
```

## Comparison

| Feature | Account | ExternalAccount |
|---------|---------|----------------|
| Private key location | In-memory | External device/service |
| Signing | Local, immediate | Delegated via IEthExternalSigner |
| Use case | Servers, scripts, automation | Hardware wallets, KMS, browser |
| Security | Key in process memory | Key never exposed |

## Key Storage Methods

| Method | Package | Use Case |
|---|---|---|
| Keystore files | `Nethereum.KeyStore` | Encrypted JSON files, password-protected |
| HD Wallets | `Nethereum.HDWallet` | Derive multiple accounts from a seed phrase |
| Hardware wallets | `Nethereum.Signer.Trezor`, `.Ledger` | Private key never leaves the device |
| Cloud KMS | `Nethereum.Signer.AWSKeyManagement`, `.AzureKeyVault` | Keys managed by cloud HSMs |

## KeyStore Files

```csharp
// Load from keystore
var keyStoreService = new KeyStoreService();
var json = File.ReadAllText("/path/to/keystore-file.json");
var privateKey = keyStoreService.DecryptKeyStoreFromJson("your-password", json);
var account = new Account(privateKey, chainId: 1);

// Create a keystore
var ecKey = EthECKey.GenerateKey();
var json = keyStoreService.EncryptAndGenerateDefaultKeyStoreAsJson(
    "your-password", ecKey.GetPrivateKeyAsBytes(), ecKey.GetPublicAddress());
```
