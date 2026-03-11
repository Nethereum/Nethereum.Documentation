---
title: HD Wallets
sidebar_label: "HD Wallets"
sidebar_position: 6
description: Derive multiple Ethereum accounts from a single mnemonic phrase using BIP-39/BIP-32/BIP-44
---

# HD Wallets

:::tip The Simple Way
```csharp
var wallet = new Wallet(Wordlist.English, WordCount.Twelve);
var account = wallet.GetAccount(0, chainId: 1);
var web3 = new Web3(account, "https://your-rpc-url");
```
Generate a mnemonic, derive an account, and start using it — all in three lines.
:::

Instead of managing individual private keys (and backing up each one separately), HD wallets derive multiple accounts from a single mnemonic phrase. Back up 12 words and you can recover all your accounts. This is the same approach used by MetaMask, Ledger, and Trezor.

Nethereum offers two implementations:

| Package | Use Case | Dependencies |
|---|---|---|
| `Nethereum.HDWallet` | Full HD wallet — NBitcoin-based, extended keys, multiple derivation paths | NBitcoin |
| `Nethereum.Wallet` | Light HD wallet — zero external crypto deps, modern .NET only | None |

## Full HD Wallet

```bash
dotnet add package Nethereum.HDWallet
```

### Generate a New Wallet

<!-- tag:WalletTests:ShouldGenerateMnemonics -->

```csharp
using Nethereum.HdWallet;
using NBitcoin;

var wallet = new Wallet(Wordlist.English, WordCount.Twelve);
var mnemonic = string.Join(" ", wallet.Words);
Console.WriteLine($"Mnemonic: {mnemonic}");
Console.WriteLine($"Address 0: {wallet.GetAddresses(1)[0]}");
```

### Restore from Mnemonic

<!-- tag:WalletTests:ShouldCreateTheDefaultWalletUsingGivenWords -->

```csharp
var wallet = new Wallet("rapid squeeze excess salute ...", seedPassword: null);
var account0 = wallet.GetAccount(0, chainId: 1);
var account1 = wallet.GetAccount(1, chainId: 1);

var web3 = new Web3(account0, "https://your-rpc-url");
```

### Derivation Paths

```csharp
// Default: m/44'/60'/0'/0/x (MetaMask, TREZOR, MyEtherWallet)
var wallet = new Wallet(words, null, Wallet.DEFAULT_PATH);

// Ledger/Electrum: m/44'/60'/0'/x
var walletLedger = new Wallet(words, null, Wallet.ELECTRUM_LEDGER_PATH);
```

### Get Keys and Addresses

<!-- tag:WalletTests:ShouldFindAddressesUsingGivenWords -->

```csharp
var addresses = wallet.GetAddresses(10);
var privateKey = wallet.GetPrivateKey(0);
var ethKey = wallet.GetEthereumKey(0);
var account = wallet.GetAccount(0, chainId: 1);
```

### Public (Watch-Only) Wallet

Derive addresses from an extended public key without exposing the private key:

<!-- tag:WalletTests:ShouldFindPublicKeysAccountUsingIndex -->

```csharp
using Nethereum.HdWallet;

var wallet = new Wallet(words, null);
var xPub = wallet.GetMasterExtPubKey();

var publicWallet = new PublicWallet(xPub);
var addresses = publicWallet.GetAddresses(10);
```

## Light HD Wallet (Nethereum.Accounts)

Zero external cryptographic dependencies — uses only `System.Security.Cryptography`. Included in `Nethereum.Accounts` (no extra package needed — already a dependency of `Nethereum.Web3`).

<!-- tag:MinimalHDWalletTests:ShouldFindAccountUsingIndex -->

```csharp
using Nethereum.Accounts.Bip32;

// Generate a new mnemonic
var mnemonic = Bip39.GenerateMnemonic(12); // 12, 15, 18, 21, or 24 words

// Create wallet from mnemonic
var wallet = new MinimalHDWallet(mnemonic);

// Derive keys (fixed path: m/44'/60'/0'/0/{index})
var key0 = wallet.GetEthereumKey(0);
var address0 = wallet.GetEthereumAddress(0);

// Or use a custom derivation path
var key = wallet.GetKeyFromPath("m/44'/60'/0'/0/5");
```

### When to Use Which

| Feature | `Nethereum.HDWallet` | `MinimalHDWallet` |
|---|---|---|
| Dependencies | NBitcoin | None |
| Target frameworks | net452+ (legacy support) | net6.0+ (modern only) |
| Extended keys (xPub) | Yes (`PublicWallet`) | No |
| Key caching | Yes (dictionary-based) | No |
| Custom derivation paths | Any BIP-32 path | Any path via `GetKeyFromPath` |
| Watch-only wallet | Yes | No |
| Best for | Full wallet apps, hardware integration | Embedded wallets, mobile, WASM |

## Next Steps

- [Hardware Wallets](./guide-hardware-wallets) — Ledger and Trezor use HD derivation internally, but the key never leaves the device
- [KeyStore Files](./guide-keystore) — encrypt individual derived keys for storage
- [Keys & Accounts](./guide-keys-accounts) — account types and key generation
