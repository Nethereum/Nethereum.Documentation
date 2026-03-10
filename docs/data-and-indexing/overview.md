---
title: Data & Indexing
sidebar_label: Overview
sidebar_position: 1
description: Blockchain data processing, indexing, token services, and explorer
---

# Data & Indexing

Nethereum provides a framework for crawling blockchain data, detecting chain reorganisations, indexing tokens, and persisting to relational databases.

## Processing Event Logs

```csharp
var processor = web3.Processing.Logs.CreateProcessor<TransferEventDTO>(
    action: log =>
    {
        Console.WriteLine($"Transfer: {log.Event.From} -> {log.Event.To}, Amount: {log.Event.Value}");
        return Task.CompletedTask;
    },
    minimumBlockConfirmations: 12,
    contractAddresses: new[] { contractAddress }
);

await processor.ExecuteAsync(
    startAtBlockNumberIfNotProcessed: 18000000,
    cancellationToken: cancellationToken.Token
);
```

## Progress Tracking

Implement `IBlockProgressRepository` to resume processing after restarts.

## Full Block Processing

```csharp
var processor = web3.Processing.Blocks.CreateBlockProcessor(
    steps =>
    {
        steps.TransactionStep.SetMatchCriteria(tx => tx.Transaction.IsToAnEmptyAddress());
        steps.TransactionReceiptStep.SetMatchCriteria(receipt => receipt.Succeeded());
    },
    minimumBlockConfirmations: 6
);
```

## Database Storage

| Package | Provider |
|---|---|
| `Nethereum.BlockchainStore.Postgres` | PostgreSQL |
| `Nethereum.BlockchainStore.SqlServer` | SQL Server |
| `Nethereum.BlockchainStore.Sqlite` | SQLite |

## Token Processing

`Nethereum.BlockchainStorage.Token.Postgres` provides ERC-20/721/1155 transfer indexing, balance aggregation, and metadata resolution.

## Explorer

`Nethereum.Explorer` is a Blazor Server blockchain explorer with block/transaction/log browsing, ABI-decoded contract interaction, and token pages.

## Token Services

`Nethereum.TokenServices` provides token metadata discovery (logos, chain info, CoinGecko integration) and multicall-based balance scanning.
