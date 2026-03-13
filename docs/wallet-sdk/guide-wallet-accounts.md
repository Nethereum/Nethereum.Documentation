---
title: "Account Management"
sidebar_label: "Accounts & Vault"
sidebar_position: 20
description: "Account types, vault encryption, mnemonic derivation, and key import"
---

# Account Management

The wallet manages accounts through `WalletVault` (encrypted storage) and `CoreWalletAccountService` (account creation). All account types implement `IWalletAccount`:

```csharp
public interface IWalletAccount
{
    string Address { get; }
    string Type { get; }
    string Label { get; set; }
    string Name { get; }
    bool IsSelected { get; set; }
    string? GroupId { get; }

    Task<IAccount> GetAccountAsync();
    Task<IWeb3> CreateWeb3Async(IClient client);
    JsonObject ToJson();
}
```

## Account Types

| Type | Class | Signs Transactions | Use Case |
|---|---|---|---|
| **Mnemonic** | `MnemonicWalletAccount` | Yes | BIP39/BIP44 HD wallet with derivation paths |
| **Private Key** | `PrivateKeyWalletAccount` | Yes | Direct ECDSA key import |
| **View-Only** | `ViewOnlyWalletAccount` | No | Address monitoring, balance tracking |
| **Smart Contract** | `SmartContractWalletAccount` | No | Multisig or AA contract wallets |
| **Hardware** | via Trezor/Ledger packages | Yes (device) | USB-connected signing |

## WalletVault

`WalletVault` holds all accounts, mnemonics, and hardware device references. It serialises to JSON and encrypts with AES-256 via `IEncryptionStrategy`.

### Create and Populate a Vault

```csharp
var encryption = new BouncyCastleAes256EncryptionStrategy();
var vault = new WalletVault(encryption);

var hdWallet = new MinimalHDWallet(Bip39.GenerateMnemonic(12));
var mnemonicInfo = new MnemonicInfo("My Wallet", hdWallet.Mnemonic, passphrase: null);
vault.AddMnemonic(mnemonicInfo);

var account = new MnemonicWalletAccount(
    address: hdWallet.GetEthereumAddress(0),
    label: "Account 0",
    index: 0,
    mnemonicId: mnemonicInfo.Id,
    wallet: hdWallet);

vault.AddAccount(account, setAsSelected: true);
```

### Encrypt and Decrypt

```csharp
string encrypted = vault.Encrypt("my-password");

var vault2 = new WalletVault(encryption);
vault2.Decrypt(encrypted, "my-password");
var restoredAccounts = vault2.Accounts;
```

The encrypted payload is a base64 string suitable for `localStorage`, file storage, or any persistence backend.

### Vault Service

In a DI context, use `IWalletVaultService` instead of working with `WalletVault` directly:

```csharp
@inject IWalletVaultService VaultService

await VaultService.CreateNewAsync("password");
await VaultService.UnlockAsync("password");

var accounts = await VaultService.GetAccountsAsync();
var groups = await VaultService.GetAccountGroupsAsync();

await VaultService.SaveAsync();
await VaultService.LockAsync();
```

## Mnemonic Accounts (BIP39/BIP44)

`MinimalHDWallet` in `Nethereum.Accounts.Bip32` implements BIP32 key derivation and BIP39 seed generation.

### Generate a Seed Phrase

```csharp
using Nethereum.Accounts.Bip32;

string mnemonic = Bip39.GenerateMnemonic(12);
var wallet = new MinimalHDWallet(mnemonic);
```

### Derive Addresses

The default Ethereum derivation path is `m/44'/60'/0'/0/{index}`:

```csharp
string address0 = wallet.GetEthereumAddress(0);
string address1 = wallet.GetEthereumAddress(1);

EthECKey key = wallet.GetEthereumKey(0);
```

For custom derivation paths:

```csharp
EthECKey key = wallet.GetKeyFromPath("m/44'/60'/0'/0/5");
```

### Create via CoreWalletAccountService

`CoreWalletAccountService` wraps the derivation and automatically registers the mnemonic in the vault:

```csharp
var accountService = new CoreWalletAccountService(vault);

IWalletAccount account = await accountService.CreateMnemonicAccountAsync(
    mnemonic: mnemonic,
    passphrase: null,
    label: "Primary");

vault.AddAccount(account, setAsSelected: true);
```

## Private Key Import

```csharp
IWalletAccount account = await accountService.CreatePrivateKeyAccountAsync(
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    label: "Imported Key");

vault.AddAccount(account);
```

## View-Only Accounts

View-only accounts track balances and transactions without holding any private key material:

```csharp
IWalletAccount account = await accountService.CreateViewOnlyAccountAsync(
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    label: "vitalik.eth");

vault.AddAccount(account);
```

Calling `GetAccountAsync()` on a view-only account throws -- these accounts cannot sign.

## Account Groups

Mnemonic accounts that share the same seed phrase are grouped by `MnemonicId`. Retrieve groups via:

```csharp
var groups = await VaultService.GetAccountGroupsAsync();
foreach (var group in groups)
{
    Console.WriteLine($"Group: {group.Label} ({group.Accounts.Count} accounts)");
}
```

## Factory System

`WalletVault` uses `IWalletAccountJsonFactory` implementations to serialise and deserialise accounts. The built-in factories are registered automatically:

- `MnemonicWalletAccountFactory`
- `PrivateKeyWalletAccountFactory`
- `ViewOnlyWalletAccountFactory`
- `SmartContractWalletAccountFactory`

To support a custom account type, implement `IWalletAccountJsonFactory` and register it:

```csharp
vault.RegisterFactory(new MyCustomAccountFactory());
```
