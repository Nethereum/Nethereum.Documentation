---
title: Query Blocks and Transactions
sidebar_label: "Query Blocks & Txs"
sidebar_position: 11
description: Get blocks, transactions, receipts, and balances using Web3
---

# Query Blocks and Transactions

Retrieve on-chain data — blocks, transactions, receipts, and account balances — using standard JSON-RPC methods through Web3.

## Installation

```bash
dotnet add package Nethereum.Web3
```

## Connect to a Node

```csharp
using Nethereum.Web3;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR_PROJECT_ID");
```

## Get Latest Block Number

```csharp
var blockNumber = await web3.Eth.Blocks.GetBlockNumber.SendRequestAsync();
// blockNumber.Value is a BigInteger
```

## Get Block by Number

```csharp
using Nethereum.Hex.HexTypes;
using Nethereum.RPC.Eth.DTOs;

// With full transaction objects
var block = await web3.Eth.Blocks.GetBlockWithTransactionsByNumber
    .SendRequestAsync(new HexBigInteger(blockNumber));

// block.Number, block.Timestamp, block.Transactions[]
// block.BaseFee (EIP-1559 blocks)
```

## Get Block by Hash

```csharp
var block = await web3.Eth.Blocks.GetBlockWithTransactionsByHash
    .SendRequestAsync("0xabc123...");
```

## Get Transaction by Hash

```csharp
var tx = await web3.Eth.Transactions.GetTransactionByHash
    .SendRequestAsync("0xtxhash...");

// tx.From, tx.To, tx.Value, tx.GasPrice
// tx.MaxFeePerGas, tx.MaxPriorityFeePerGas (EIP-1559)
// tx.Type (0x0 = legacy, 0x2 = EIP-1559)
```

## Get Transaction Receipt

```csharp
var receipt = await web3.Eth.Transactions.GetTransactionReceipt
    .SendRequestAsync("0xtxhash...");

// receipt.Status (1 = success, 0 = revert)
// receipt.GasUsed, receipt.EffectiveGasPrice
// receipt.Logs — decoded event logs
// receipt.BlockNumber, receipt.TransactionIndex
```

## Get Account Balance

```csharp
var balance = await web3.Eth.GetBalance.SendRequestAsync("0xaddress...");

// Convert from Wei to Ether
var etherAmount = Nethereum.Util.UnitConversion.Convert.FromWei(balance.Value);
```

## Get Balance at a Specific Block

```csharp
using Nethereum.RPC.Eth.DTOs;

var balance = await web3.Eth.GetBalance.SendRequestAsync(
    "0xaddress...",
    new BlockParameter(new HexBigInteger(15000000)));
```

## Get Transaction Count (Nonce)

```csharp
var nonce = await web3.Eth.Transactions.GetTransactionCount
    .SendRequestAsync("0xaddress...");
```

## Get Code at Address

```csharp
var code = await web3.Eth.GetCode.SendRequestAsync("0xcontract...");
// Returns "0x" for EOAs, bytecode for contracts
```

## Decode Events from a Transaction Receipt

After sending a transaction, decode typed events directly from the receipt:

```csharp
using Nethereum.Contracts;
using Nethereum.Contracts.Standards.ERC20.ContractDefinition;

var receipt = await web3.Eth.Transactions.GetTransactionReceipt
    .SendRequestAsync("0x654288d8...");

// Decode all Transfer events from the receipt logs
var events = receipt.DecodeAllEvents<TransferEventDTO>();
Console.WriteLine($"From: {events[0].Event.From}");
Console.WriteLine($"To: {events[0].Event.To}");
Console.WriteLine($"Value: {events[0].Event.Value}");
```


## ERC20 Balance via Typed Contract Service

Query ERC20 token balances using the built-in typed contract service:

```csharp
var tokenBalance = await web3.Eth.ERC20
    .GetContractService("0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2")
    .BalanceOfQueryAsync("0x8ee7d9235e01e6b42345120b5d270bdb763624c7");

// Convert from smallest unit (18 decimal places) to human-readable
Console.WriteLine(Web3.Convert.FromWei(tokenBalance, 18));
```


## Next Steps

- [Send Ether](guide-send-eth) — create and send transactions
- [Fee Estimation](guide-fee-estimation) — estimate gas fees
- [Transaction Types](guide-transaction-models) — understand transaction formats

## Related Packages

- [Nethereum.Web3](nethereum-web3) — main entry point for all queries
- [Nethereum.RPC](nethereum-rpc) — low-level RPC methods
