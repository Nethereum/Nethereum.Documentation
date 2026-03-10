---
title: Hardware Wallets
sidebar_label: "Hardware Wallets"
sidebar_position: 5
description: Sign transactions with Ledger and Trezor hardware wallets using Nethereum
---

# Hardware Wallets

Sign Ethereum transactions with Ledger and Trezor devices. The private key never leaves the hardware — Nethereum sends unsigned transactions to the device and receives signatures back.

Both implementations use the `ExternalAccount` pattern — once initialised, they work identically to a regular `Account` with `Web3`.

## Ledger

```bash
dotnet add package Nethereum.Signer.Ledger
```

### Connect and Get Address

```csharp
using Nethereum.Ledger;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

var ledgerManagerFactory = new NethereumLedgerManagerBrokerFactory();
var signer = new LedgerExternalSigner(ledgerManagerFactory, accountIndex: 0);

var externalAccount = new ExternalAccount(signer, chainId: 1);
await externalAccount.InitialiseAsync();

Console.WriteLine($"Address: {externalAccount.Address}");

var web3 = new Web3(externalAccount, "https://your-rpc-url");
```

### Sign and Send Transaction

```csharp
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(toAddress, 0.1m);
```

### EIP-1559 Transaction

```csharp
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(toAddress, 0.1m,
        maxPriorityFeePerGas: 2,
        maxFeePerGas: 30);
```

### Multiple Accounts

```csharp
var signer0 = new LedgerExternalSigner(ledgerManagerFactory, accountIndex: 0);
var signer1 = new LedgerExternalSigner(ledgerManagerFactory, accountIndex: 1);
```

### Legacy Derivation Path

Ledger Live uses `m/44'/60'/0'/0/x` (default). For the older Electrum/Ledger path:

```csharp
var signer = new LedgerExternalSigner(ledgerManagerFactory, accountIndex: 0, legacyPath: true);
// Uses: m/44'/60'/0'/x
```

## Trezor

```bash
dotnet add package Nethereum.Signer.Trezor
```

### Connect with PIN Handler

Trezor requires a PIN prompt handler. The PIN is entered as a numpad position (layout: 7-8-9 / 4-5-6 / 1-2-3 matching the device display):

```csharp
using Nethereum.Trezor;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

public class ConsolePinHandler : ITrezorPromptHandler
{
    public Task<string> PromptPin()
    {
        Console.Write("Enter PIN (numpad positions): ");
        return Task.FromResult(Console.ReadLine());
    }

    public Task<string> PromptPassphrase()
    {
        Console.Write("Enter passphrase (or empty): ");
        return Task.FromResult(Console.ReadLine());
    }
}

var pinHandler = new ConsolePinHandler();
var trezorManagerFactory = new NethereumTrezorManagerBrokerFactory();
var signer = new TrezorExternalSigner(
    trezorManagerFactory, pinHandler, accountIndex: 0);

var externalAccount = new ExternalAccount(signer, chainId: 1);
await externalAccount.InitialiseAsync();

var web3 = new Web3(externalAccount, "https://your-rpc-url");
```

### Sign and Send Transaction

```csharp
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(toAddress, 0.1m);
```

### Sign Personal Message

```csharp
var signature = await signer.SignAsync(
    System.Text.Encoding.UTF8.GetBytes("Hello Ethereum!"));
```

### Sign EIP-712 Typed Data

Trezor supports interactive EIP-712 signing with on-device display:

```csharp
var typedData = new TypedData<Domain>
{
    PrimaryType = "Permit",
    Domain = new Domain { Name = "MyToken", Version = "1", ChainId = 1 },
    // ... type definitions and message
};

var signature = await signer.SignTypedDataV4Async(typedData);
```

### Cross-Platform Setup

```csharp
// Windows — uses Windows.Devices.HumanInterfaceDevice (default)
var factory = new NethereumTrezorManagerBrokerFactory();

// Linux/macOS — requires LibUSB
var factory = new NethereumTrezorManagerBrokerFactory(
    new LibUsbHidDeviceHandler());
```

## Comparison

| Feature | Ledger | Trezor |
|---|---|---|
| Package | `Nethereum.Signer.Ledger` | `Nethereum.Signer.Trezor` |
| PIN entry | On device | Via numpad handler |
| Passphrase (25th word) | Via device | Via prompt handler |
| EIP-712 signing | No | Yes (interactive display) |
| Personal message signing | No | Yes |
| Transaction types | Legacy, EIP-1559 | Legacy, EIP-1559 |

:::tip Claude Code
Install the Nethereum skills plugin for AI-assisted development: `/plugin install nethereum-skills`
:::

## Next Steps

- [Cloud KMS](./guide-cloud-kms) — sign with AWS KMS or Azure Key Vault
- [Keys & Accounts](../core-foundation/guide-keys-accounts) — account types
