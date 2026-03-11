---
title: Query Blocks and Transactions
sidebar_label: "Query Blocks & Txs"
sidebar_position: 6
description: Get blocks, transactions, and receipts using web3.Eth
---

# Query Blocks and Transactions

After sending transactions (as covered in [Transfer Ether](guide-send-eth) and [Send Transactions](guide-send-transaction)), you'll want to inspect what happened on-chain. All queries in this guide are **read-only** — no gas, signing, or fees needed.

This guide covers querying blocks, looking up transactions by hash, reading receipts to check success/failure, and detecting whether an address is a contract or a regular account.

```bash
dotnet add package Nethereum.Web3
```

## Connect to Ethereum

```csharp
using Nethereum.Web3;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR-PROJECT-ID");
```

## Get the Current Block Number

```csharp
var blockNumber = await web3.Eth.Blocks.GetBlockNumber.SendRequestAsync();
Console.WriteLine("Current block number: " + blockNumber.Value);
```

## Get a Block with Its Transactions

Use `GetBlockWithTransactionsByNumber` to retrieve a block with full transaction objects:

```csharp
using Nethereum.Hex.HexTypes;

var block = await web3.Eth.Blocks.GetBlockWithTransactionsByNumber
    .SendRequestAsync(new HexBigInteger(8257129));

Console.WriteLine("Block number: " + block.Number.Value);
Console.WriteLine("Block hash: " + block.BlockHash);
Console.WriteLine("Number of transactions: " + block.Transactions.Length);

// Access individual transactions
Console.WriteLine("Transaction 0 From: " + block.Transactions[0].From);
Console.WriteLine("Transaction 0 To: " + block.Transactions[0].To);
Console.WriteLine("Transaction 0 Value: " + block.Transactions[0].Value);
Console.WriteLine("Transaction 0 Hash: " + block.Transactions[0].TransactionHash);
```

Use `GetBlockWithTransactionsHashesByNumber` if you only need transaction hashes (lighter response).

## Get a Block by Hash

```csharp
var block = await web3.Eth.Blocks.GetBlockWithTransactionsByHash
    .SendRequestAsync("0xabc123...");
```

## Get a Transaction by Hash

```csharp
var transaction = await web3.Eth.Transactions.GetTransactionByHash
    .SendRequestAsync(
        "0xb4729a0d8dd30e3070d0cb203090f2b792e029f6fa4629e96d2ebc1de13cb5c4");

Console.WriteLine("From: " + transaction.From);
Console.WriteLine("To: " + transaction.To);
Console.WriteLine("Value: " + transaction.Value);
Console.WriteLine("Hash: " + transaction.TransactionHash);
```

For EIP-1559 transactions, `transaction.MaxFeePerGas` and `transaction.MaxPriorityFeePerGas` are populated instead of `transaction.GasPrice`. The `transaction.Type` field indicates the transaction type (`0x0` = legacy, `0x2` = EIP-1559).

## Get a Transaction Receipt

The receipt contains the execution result after a transaction has been mined:

```csharp
var receipt = await web3.Eth.Transactions.GetTransactionReceipt
    .SendRequestAsync(
        "0xb4729a0d8dd30e3070d0cb203090f2b792e029f6fa4629e96d2ebc1de13cb5c4");

Console.WriteLine("Transaction Hash: " + receipt.TransactionHash);
Console.WriteLine("Logs count: " + receipt.Logs.Count);
```

The receipt includes `Status` (1 = success, 0 = revert), `GasUsed`, `EffectiveGasPrice`, `Logs` (raw event logs), `BlockNumber`, and `TransactionIndex`.

`GetTransactionReceipt` returns `null` if the transaction has not been mined yet. Use `receipt.HasErrors()` to check if the transaction reverted.

## Get Transaction Count (Nonce)

The transaction count for an address is its nonce (the transaction sequence number for an address) — the number of transactions sent from that address:

```csharp
var nonce = await web3.Eth.Transactions.GetTransactionCount
    .SendRequestAsync("0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae");
Console.WriteLine("Nonce: " + nonce.Value);
```

## Detect if an Address is a Contract

Use `GetCode` to check whether an address has deployed bytecode. Externally owned accounts (EOAs) return `"0x"`:

```csharp
var code = await web3.Eth.GetCode.SendRequestAsync("0xaddress...");
var isContract = code != null && code != "0x";
Console.WriteLine("Is contract: " + isContract);
```

## Decode Events from a Receipt

Use `DecodeAllEvents<T>()` to decode typed events from a transaction receipt. `TransferEventDTO` is a built-in type from `Nethereum.Contracts.Standards.ERC20`:

```csharp
using Nethereum.Contracts;
using Nethereum.Contracts.Standards.ERC20.ContractDefinition;

var receipt = await web3.Eth.Transactions.GetTransactionReceipt
    .SendRequestAsync("0x654288d8...");

var transferEvents = receipt.DecodeAllEvents<TransferEventDTO>();
foreach (var e in transferEvents)
{
    Console.WriteLine($"From: {e.Event.From}, To: {e.Event.To}, Value: {e.Event.Value}");
}
```

## Next Steps

- [Decode Transactions](guide-decode-transactions) — decode function calls from transaction input data
- [Pending Transactions](guide-pending-transactions) — retrieve pending transactions from the mempool
- [Query Balances](guide-query-balance) — check account and token balances
