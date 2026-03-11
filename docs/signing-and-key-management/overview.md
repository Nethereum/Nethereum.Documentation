---
title: Signing & Key Management
sidebar_label: Overview
sidebar_position: 1
description: Ethereum accounts, private keys, HD wallets, hardware wallets, and cloud KMS
---

# Signing & Key Management

Ethereum accounts are derived from cryptographic key pairs. Your identity is a private key, and you prove ownership by signing data with it. This section covers every way Nethereum can store, manage, and use signing keys — from in-memory keys to cloud HSMs.

## How Ethereum Accounts Work

```
Private Key (32 bytes)
    → Public Key (64 bytes, via ECDSA)
        → Address (20 bytes, via Keccak-256)
```

### EOA vs Smart Account

- **Externally Owned Account (EOA)** — controlled by a private key
- **Smart Contract Account** — controlled by code (ERC-4337 account abstraction)
- **Delegated EOA** — an EOA that temporarily runs a smart contract's code via [EIP-7702](../core-foundation/guide-eip7702)

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

For situations where the private key is not directly available — signing is delegated to an external device or service:

```csharp
var externalAccount = new ExternalAccount(myExternalSigner, chainId: 1);
await externalAccount.InitialiseAsync();
var web3 = new Web3(externalAccount, "https://your-rpc-url");
```

Once initialised, `ExternalAccount` works identically to `Account` with `Web3` — you call the same `web3.Eth` methods, and signing is handled transparently.

## Account Type Comparison

| Feature | Account | ExternalAccount |
|---------|---------|----------------|
| Private key location | In-memory | External device/service |
| Signing | Local, immediate | Delegated via IEthExternalSigner |
| Use case | Servers, scripts, automation | Hardware wallets, KMS, browser |
| Security | Key in process memory | Key never exposed |

## Choosing a Key Storage Method

| Method | Package | Security Level | Best For |
|--------|---------|---------------|----------|
| In-memory key | `Nethereum.Web3` | Low — key in process memory | Scripts, testing, automation |
| [Keystore files](./guide-keystore) | `Nethereum.KeyStore` | Medium — encrypted at rest, password-protected | Desktop apps, CLI wallets |
| [HD Wallets](./guide-hd-wallets) | `Nethereum.HDWallet` | Medium — one seed backs up many accounts | Multi-account wallets, recovery |
| [Hardware wallets](./guide-hardware-wallets) | `Nethereum.Signer.Ledger`, `.Trezor` | High — key never leaves device | End-user wallets, high-value accounts |
| [Cloud KMS](./guide-cloud-kms) | `Nethereum.Signer.AWSKeyManagement`, `.AzureKeyVault` | Very High — FIPS 140-2 HSMs | Production servers, institutional custody |

**Rule of thumb:** Use the simplest option that meets your security requirements. For testing, an in-memory key is fine. For production with real funds, consider hardware wallets or cloud KMS.

## Guides

### Keys & Signing

| Guide | What You'll Learn |
|-------|------------------|
| [Keys & Accounts](./guide-keys-accounts) | Generate EC keys, create accounts, and understand Account vs ExternalAccount |
| [Message Signing](./guide-message-signing) | Sign and verify messages with `personal_sign` (wallet authentication, SIWE) |
| [EIP-712 Typed Data Signing](./guide-eip712-signing) | Sign structured typed data for permits, meta-transactions, and off-chain approvals |

### Key Storage & Derivation

| Guide | What You'll Learn |
|-------|------------------|
| [KeyStore Files](./guide-keystore) | Encrypt private keys to password-protected JSON files (Scrypt/PBKDF2) |
| [HD Wallets](./guide-hd-wallets) | Derive multiple accounts from a single mnemonic phrase (BIP-39/BIP-32) |

### External Signers

| Guide | What You'll Learn |
|-------|------------------|
| [Hardware Wallets](./guide-hardware-wallets) | Sign transactions with Ledger and Trezor — private key never leaves the device |
| [Cloud KMS](./guide-cloud-kms) | Sign with AWS KMS or Azure Key Vault HSMs — enterprise-grade key management |

## Next Steps

**Reading in order:** [Keys & Accounts](./guide-keys-accounts) → [Message Signing](./guide-message-signing) → [EIP-712 Signing](./guide-eip712-signing) → [KeyStore Files](./guide-keystore) → [HD Wallets](./guide-hd-wallets) → [Hardware Wallets](./guide-hardware-wallets) → [Cloud KMS](./guide-cloud-kms).

**Jump to what you need:** Start with [Keys & Accounts](./guide-keys-accounts) if you're new to Ethereum keys. For off-chain signatures, go to [EIP-712](./guide-eip712-signing). For key storage, start with [KeyStore Files](./guide-keystore).
