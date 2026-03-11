---
title: Send Transactions Using the Transaction Manager
sidebar_label: "Send Transactions"
sidebar_position: 5
description: Send transactions with data using the Nethereum transaction manager
---

# Send Transactions Using the Transaction Manager

The `TransactionManager` handles gas estimation, nonce management, and EIP-1559 fees automatically — you just provide the recipient, data, and optionally a value. This guide covers sending transactions with data (calling a smart contract, storing a message on-chain). For simple ETH transfers, see [Transfer Ether](guide-send-eth). Data is encoded as hex using `.ToHexUTF8()` and similar extension methods (see [Hex Encoding](guide-hex-encoding)).

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

## More Control: Explicit Fee Parameters

By default, Nethereum sends EIP-1559 transactions and calculates fees automatically. The sections below are optional — use them only when you need to override the automatic behavior.

### EIP-1559 Fee Parameters

To set fees explicitly, use `MaxFeePerGas` and `MaxPriorityFeePerGas` on the `TransactionInput` (see [Fee Estimation](guide-fee-estimation) for strategies):

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

### Legacy Transactions

To use legacy transactions by default:

```csharp
web3.TransactionManager.UseLegacyAsDefault = true;
```

## EIP-7702: Inline Authorization

You can attach an EIP-7702 authorization directly to a transaction, delegating an EOA and executing a contract call in one step. The transaction manager signs unsigned authorizations automatically and calculates the extra gas overhead:

```csharp
var executeFunction = new ExecuteFunction
{
    Calls = batchCalls,
    Gas = 1000000,
    AuthorisationList = new List<Authorisation>
    {
        new Authorisation { Address = "0xDelegateContractAddress" }
    }
};

var receipt = await contractService.ExecuteRequestAndWaitForReceiptAsync(executeFunction);
```

For dedicated delegation workflows (self-delegation, sponsored delegation, batch delegation), see the [EIP-7702 guide](guide-eip7702).

## Next Steps

- [Query Blocks](guide-query-blocks) — inspect blocks, transactions, and receipts
- [EIP-7702 Delegation](guide-eip7702) — delegate EOA to smart contract code
- [Calculate Transaction Hash](guide-transaction-hash) — sign and predict the hash before sending
- [Fee Estimation](guide-fee-estimation) — EIP-1559 fee strategies
