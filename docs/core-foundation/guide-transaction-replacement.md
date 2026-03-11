---
title: Transaction Replacement
sidebar_label: "Transaction Replacement"
sidebar_position: 10
description: Replace a pending transaction by resubmitting with the same nonce and a higher gas price
---

# Transaction Replacement

Every Ethereum address has a **nonce** — a sequence number that increments with each transaction. When you send a transaction, it enters the **mempool** (the pool of unconfirmed transactions waiting to be included in a block). If that transaction gets stuck — not enough gas, network congestion, or you changed your mind — you can replace it by sending a new transaction with the **same nonce** and a **higher fee**.

This works because miners and validators always prefer the transaction with the higher fee for a given nonce, so the original is dropped. This is how wallets implement "speed up" and "cancel" features.

```bash
dotnet add package Nethereum.Web3
```

## Send the Original Transaction

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Nethereum.RPC.Eth.DTOs;
using Nethereum.Util;
using Nethereum.Hex.HexTypes;

var privateKey = "0x7580e7fb49df1c861f0050fae31c2224c6aba908e116b8da44ee8cd927b990b0";
var chainId = 444444444500; // Nethereum testchain
var account = new Account(privateKey, chainId);
Console.WriteLine("Our account: " + account.Address);

var web3 = new Web3(account, "http://testchain.nethereum.com:8545");
web3.TransactionManager.UseLegacyAsDefault = true;

var toAddress = "0x1bb31d596c34bd81e1f0be1edf3840a7b43dd9cd";

// Gas price and nonce are calculated by the transaction manager
var txnInput = new TransactionInput()
{
    From = account.Address,
    To = toAddress,
    Data = "0x7b227465737444617465223a2232372f30352f323032302031333a32353a35322e38373120504d227d"
};

// Estimate and set the gas since we have data
var gasEstimate = await web3.Eth.TransactionManager.EstimateGasAsync(txnInput);
txnInput.Gas = gasEstimate;

var txnHash1 = await web3.Eth.TransactionManager.SendTransactionAsync(txnInput);
Console.WriteLine("Original tx: " + txnHash1);
```

## Replace with the Same Nonce and Higher Gas Price

To replace the transaction, reuse the same nonce and increase the gas price. Most nodes require at least a 10% fee increase to accept a replacement.

```csharp
var txnInput2 = new TransactionInput()
{
    From = account.Address,
    To = toAddress,
    Data = "0x7b227465737444617465223a2232372f30352f323032302031333a32353a35322e38373120504d227d",
    Gas = gasEstimate,
    Nonce = txnInput.Nonce
};

var gasPrice = await web3.Eth.GasPrice.SendRequestAsync();
txnInput2.GasPrice = new HexBigInteger(
    gasPrice.Value + Web3.Convert.ToWei(1, UnitConversion.EthUnit.Gwei));

var txnHash2 = await web3.Eth.TransactionManager.SendTransactionAsync(txnInput2);
Console.WriteLine("Replacement tx: " + txnHash2);
```

The key points:
- **Same nonce** as the original (`txnInput.Nonce`) — this is what tells the network to replace, not add, a transaction
- **Higher gas price** — the higher fee makes validators prefer your replacement, causing the original to be dropped from the mempool

## EIP-1559 Replacement

For EIP-1559 transactions, you must increment **both** `MaxPriorityFeePerGas` and `MaxFeePerGas`. The validator selects transactions based on the priority fee (the tip), while the protocol enforces the max fee as an upper bound on total cost. If either value is not higher than the original, the node rejects the replacement.

```csharp
txnInput2.MaxPriorityFeePerGas = new HexBigInteger(
    txnInput.MaxPriorityFeePerGas.Value +
    Web3.Convert.ToWei(1, UnitConversion.EthUnit.Gwei));

txnInput2.MaxFeePerGas = new HexBigInteger(
    txnInput.MaxFeePerGas.Value +
    Web3.Convert.ToWei(1, UnitConversion.EthUnit.Gwei));
```

For details on how these fee fields work together, see the [Fee Estimation guide](guide-fee-estimation).

## Next Steps

- [Pending Transactions](guide-pending-transactions) — retrieve pending transactions
- [Fee Estimation](guide-fee-estimation) — EIP-1559 fee strategies
- [Send Transactions](guide-send-transaction) — send transactions using the transaction manager
