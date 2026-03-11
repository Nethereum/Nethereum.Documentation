---
title: Pending Transactions
sidebar_label: "Pending Transactions"
sidebar_position: 11
description: Retrieve pending transactions using block parameters and filters
---

# Pending Transactions

**Pending** transactions are transactions that have been submitted but not yet included in a block. They sit in the node's **mempool** (transaction pool) waiting for a validator to pick them up. Monitoring them is useful for transaction tracking dashboards, detecting when your own transactions are waiting, and MEV analysis. MEV (Maximal Extractable Value) bots monitor pending transactions to find profitable opportunities like arbitrage.

Ethereum provides two ways to access pending transactions: querying the pending block, or creating a filter that returns new pending transaction hashes.

```bash
dotnet add package Nethereum.Web3
```

## Get Pending Transactions from the Pending Block

Use `BlockParameter.CreatePending()` to query the pending block and retrieve all its transactions:

```csharp
using Nethereum.Web3;
using Nethereum.RPC.Eth.DTOs;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR-PROJECT-ID");

var block = await web3.Eth.Blocks.GetBlockWithTransactionsByNumber
    .SendRequestAsync(BlockParameter.CreatePending());

Console.WriteLine("Pending transactions:");
foreach (var txn in block.Transactions)
{
    Console.WriteLine(
        $"Hash:{txn.TransactionHash}, From: {txn.From}, To: {txn.To}, " +
        $"Value: {txn.Value}, Nonce: {txn.Nonce}, Data: {txn.Input}");
}
```

The `Input` field contains ABI-encoded function call data — see [Decode Transactions](guide-decode-transactions) to parse it.

## Get Pending Transaction Hashes Using Filters

Filters let you poll for new pending transactions since your last check, rather than fetching all pending state each time. Create a pending transaction filter and poll for new entries:

```csharp
var web3 = new Web3("http://localhost:8545");

var pendingFilter = await web3.Eth.Filters.NewPendingTransactionFilter
    .SendRequestAsync();

var filterChanges = await web3.Eth.Filters.GetFilterChangesForBlockOrTransaction
    .SendRequestAsync(pendingFilter);

foreach (var txnHash in filterChanges)
{
    Console.WriteLine(txnHash);
}
```

:::note
Pending transaction filters are not available on all public nodes. Infura, for example, does not support them. Use a local node or a dedicated node provider for filter-based pending transaction retrieval.
:::

## Next Steps

- [Decode Transactions](guide-decode-transactions) — decode function calls from transaction input
- [Transaction Replacement](guide-transaction-replacement) — replace a pending transaction
- [Query Blocks](guide-query-blocks) — get block and transaction data
