---
title: Transfer Ether
sidebar_label: "Transfer Ether"
sidebar_position: 4
description: Transfer Ether between addresses using EtherTransferService
---

# Transfer Ether

Sending ETH from one address to another is the most fundamental write operation on Ethereum. The `EtherTransferService` handles gas estimation, nonce management, and EIP-1559 fees automatically — you just specify the recipient and amount.

:::tip The Simple Way
```csharp
var web3 = new Web3(account, "http://testchain.nethereum.com:8545");

var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync("0xRecipient", 1.11m);
```
That's it. Fees, gas, nonce — all automatic.
:::

```bash
dotnet add package Nethereum.Web3
```

## Create an Account and Connect

First, create an account with a private key and connect to an Ethereum node:

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

var privateKey = "0x7580e7fb49df1c861f0050fae31c2224c6aba908e116b8da44ee8cd927b990b0";
var chainId = 444444444500; // Nethereum testchain
var account = new Account(privateKey, chainId);
Console.WriteLine("Our account: " + account.Address);

var web3 = new Web3(account, "http://testchain.nethereum.com:8545");
```

## Transfer Ether

By default, Nethereum sends EIP-1559 transactions. Fees are calculated automatically using the `TimePreferenceFeeSuggestionStrategy`:

```csharp
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(
        "0x13f022d72158410433cbd66f5dd8bf6d2d129924", 1.11m);
```

The amount is in Ether — `1.11m` sends 1.11 ETH. Gas is estimated and fees are calculated automatically.

## Check Balance Before and After

Use `Web3.Convert.FromWei` to convert the raw wei value to Ether (see [Unit Conversion](guide-unit-conversion)):

```csharp
var balance = await web3.Eth.GetBalance.SendRequestAsync(
    "0x13f022d72158410433cbd66f5dd8bf6d2d129924");
Console.WriteLine("Balance before: " + Web3.Convert.FromWei(balance.Value) + " Ether");

var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(
        "0x13f022d72158410433cbd66f5dd8bf6d2d129924", 1.11m);

balance = await web3.Eth.GetBalance.SendRequestAsync(
    "0x13f022d72158410433cbd66f5dd8bf6d2d129924");
Console.WriteLine("Balance after: " + Web3.Convert.FromWei(balance.Value) + " Ether");
```

## More Control: Explicit Fees and Legacy Mode

The sections below are optional — use them only when you need to override the automatic behavior.

### EIP-1559 Transfer with Explicit Fees

If you want to control the fee parameters, pass `maxPriorityFeePerGas` and `maxFeePerGas` explicitly (see [Fee Estimation](guide-fee-estimation) for strategies):

```csharp
var transferService = web3.Eth.GetEtherTransferService();
var fee = await transferService.SuggestFeeToTransferWholeBalanceInEtherAsync();

var receipt = await transferService
    .TransferEtherAndWaitForReceiptAsync(
        "0x13f022d72158410433cbd66f5dd8bf6d2d129924", 0.1m,
        fee.MaxPriorityFeePerGas.Value,
        fee.MaxFeePerGas.Value);
```

### Legacy Transfer with Gas Price

To use legacy (pre-EIP-1559) transactions, set `UseLegacyAsDefault = true`:

```csharp
web3.TransactionManager.UseLegacyAsDefault = true;

var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(
        "0x13f022d72158410433cbd66f5dd8bf6d2d129924", 1.11m,
        gasPriceGwei: 2);
```

### Estimate Gas

```csharp
var transferService = web3.Eth.GetEtherTransferService();
var estimatedGas = await transferService.EstimateGasAsync(
    "0x13f022d72158410433cbd66f5dd8bf6d2d129924", 1.11m);

var receipt = await transferService
    .TransferEtherAndWaitForReceiptAsync(
        "0x13f022d72158410433cbd66f5dd8bf6d2d129924", 1.11m,
        gasPriceGwei: 2, gas: estimatedGas);
```

## Advanced: Transfer Entire Balance

### EIP-1559

```csharp
var transferService = web3.Eth.GetEtherTransferService();
var fee = await transferService.SuggestFeeToTransferWholeBalanceInEtherAsync();

var amount = await transferService
    .CalculateTotalAmountToTransferWholeBalanceInEtherAsync(
        account.Address, maxFeePerGas: fee.MaxFeePerGas.Value);

var receipt = await transferService
    .TransferEtherAndWaitForReceiptAsync(
        "0x13f022d72158410433cbd66f5dd8bf6d2d129924", amount,
        fee.MaxPriorityFeePerGas.Value, fee.MaxFeePerGas.Value);
```

### Legacy

```csharp
web3.TransactionManager.UseLegacyAsDefault = true;

var transferService = web3.Eth.GetEtherTransferService();
var totalAmount = await transferService
    .CalculateTotalAmountToTransferWholeBalanceInEtherAsync(
        account.Address, gasPriceGwei: 2m);

var receipt = await transferService
    .TransferEtherAndWaitForReceiptAsync(
        "0x13f022d72158410433cbd66f5dd8bf6d2d129924", totalAmount,
        gasPriceGwei: 2);
```

`CalculateTotalAmountToTransferWholeBalanceInEtherAsync` subtracts the gas cost from the current balance, so the entire remaining balance is sent.

## Next Steps

- [Send Transactions](guide-send-transaction) — send transactions with data using the transaction manager
- [Fee Estimation](guide-fee-estimation) — EIP-1559 fee strategies
- [Query Balances](guide-query-balance) — check account and token balances
