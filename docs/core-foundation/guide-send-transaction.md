---
title: Send Transactions Using the Transaction Manager
sidebar_label: "Send Transactions"
sidebar_position: 5
description: Send transactions with data using the Nethereum transaction manager
---

# Send Transactions Using the Transaction Manager

While [Transfer Ether](guide-send-eth) covers simple ETH transfers, many Ethereum operations require sending data with the transaction — calling a smart contract, storing a message on-chain, or triggering a state change. You encode as hex (see [Hex Encoding](guide-hex-encoding)) using `.ToHexUTF8()` and similar extension methods. The `TransactionManager` gives you full control over transaction construction while still handling gas estimation, nonce management, and EIP-1559 fees automatically.

```bash
dotnet add package Nethereum.Web3
```

## Send a Transaction with Data

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Nethereum.Hex.HexConvertors.Extensions;
using Nethereum.Hex.HexTypes;
using Nethereum.RPC.Eth.DTOs;

var privateKey = "0x7580e7fb49df1c861f0050fae31c2224c6aba908e116b8da44ee8cd927b990b0";
var chainId = 444444444500; // Nethereum testchain
var account = new Account(privateKey, chainId);
Console.WriteLine("Our account: " + account.Address);

var web3 = new Web3(account, "http://testchain.nethereum.com:8545");

var txnInput = new TransactionInput();
txnInput.From = account.Address;
txnInput.To = "0x12890d2cce102216644c59daE5baed380d84830c";
txnInput.Data = "Hello".ToHexUTF8();
txnInput.Gas = new HexBigInteger(900000);

var receipt = await web3.Eth.TransactionManager
    .SendTransactionAndWaitForReceiptAsync(txnInput);
Console.WriteLine("Has errors: " + receipt.HasErrors().Value);
```

`HasErrors()` returns `true` if the receipt status indicates a revert.

## Estimate Gas Before Sending

```csharp
var txnInput = new TransactionInput()
{
    From = account.Address,
    To = "0x1bb31d596c34bd81e1f0be1edf3840a7b43dd9cd",
    Data = "0x7b2274657374..."
};

var gasEstimate = await web3.Eth.TransactionManager.EstimateGasAsync(txnInput);
Console.WriteLine("Estimated gas: " + gasEstimate.Value);
txnInput.Gas = gasEstimate;

var txnHash = await web3.Eth.TransactionManager.SendTransactionAsync(txnInput);
Console.WriteLine("Transaction hash: " + txnHash);
```

## Send Without Waiting for Receipt

Use `SendTransactionAsync` to get the transaction hash immediately without waiting for it to be mined:

```csharp
var txnHash = await web3.Eth.TransactionManager.SendTransactionAsync(txnInput);
```

## EIP-1559 Fee Parameters

By default, Nethereum sends EIP-1559 transactions and calculates fees automatically. To set fees explicitly, use `MaxFeePerGas` and `MaxPriorityFeePerGas` on the `TransactionInput` (see [Fee Estimation](guide-fee-estimation) for strategies):

```csharp
using Nethereum.Util;

var txnInput = new TransactionInput()
{
    From = account.Address,
    To = "0x12890d2cce102216644c59daE5baed380d84830c",
    Data = "Hello".ToHexUTF8(),
    Gas = new HexBigInteger(900000),
    MaxFeePerGas = new HexBigInteger(Web3.Convert.ToWei(50, UnitConversion.EthUnit.Gwei)),
    MaxPriorityFeePerGas = new HexBigInteger(Web3.Convert.ToWei(2, UnitConversion.EthUnit.Gwei))
};

var receipt = await web3.Eth.TransactionManager
    .SendTransactionAndWaitForReceiptAsync(txnInput);
```

Setting `GasPrice` instead triggers a legacy transaction automatically.

## Legacy Transactions

To use legacy transactions by default:

```csharp
web3.TransactionManager.UseLegacyAsDefault = true;
```

## Next Steps

- [Query Blocks](guide-query-blocks) — inspect blocks, transactions, and receipts
- [Calculate Transaction Hash](guide-transaction-hash) — sign and predict the hash before sending
- [Fee Estimation](guide-fee-estimation) — EIP-1559 fee strategies
