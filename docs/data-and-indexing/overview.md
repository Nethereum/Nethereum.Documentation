---
title: Data & Indexing
sidebar_label: Overview
sidebar_position: 1
description: Blockchain data processing, indexing, token services, and explorer
---

# Data & Indexing

Nethereum provides a complete pipeline for crawling blockchain data, persisting it to relational databases, indexing token activity, and exploring the results through a Blazor UI. The stack is modular — use the processing engine alone for custom ETL, add database storage for persistence, layer on token indexing for ERC-20/721/1155 tracking, and embed the explorer for a ready-made UI.

## What Can I Do?

| I want to... | Guide | Packages |
|---|---|---|
| **Crawl blocks and process transactions** | [Blockchain Processing](./guide-blockchain-processing) | `Nethereum.BlockchainProcessing` |
| **Process typed event logs from contracts** | [Blockchain Processing](./guide-blockchain-processing) | `Nethereum.BlockchainProcessing` |
| **Track progress and resume after restart** | [Blockchain Processing](./guide-blockchain-processing) | `Nethereum.BlockchainProcessing` |
| **Handle chain reorganisations** | [Blockchain Processing](./guide-blockchain-processing) | `Nethereum.BlockchainProcessing` |
| **Persist blocks/txs/logs to PostgreSQL** | [Database Storage](./guide-database-storage) | `BlockchainStore.Postgres` + `Processors.Postgres` |
| **Persist to SQL Server or SQLite** | [Database Storage](./guide-database-storage) | `BlockchainStore.SqlServer/Sqlite` + `Processors` |
| **Run indexing as a hosted service** | [Database Storage](./guide-database-storage) | `BlockchainStorage.Processors.*` |
| **Index internal transactions (traces)** | [Database Storage](./guide-database-storage) | `Processors.*` + debug RPC |
| **Index ERC-20 token transfers** | [Token Indexing](./guide-token-indexing) | `BlockchainStorage.Token.Postgres` |
| **Index ERC-721 NFT ownership** | [Token Indexing](./guide-token-indexing) | `BlockchainStorage.Token.Postgres` |
| **Index ERC-1155 multi-token balances** | [Token Indexing](./guide-token-indexing) | `BlockchainStorage.Token.Postgres` |
| **Build a blockchain explorer** | [Explorer](./guide-explorer) | `Nethereum.Explorer` |
| **Interact with contracts via ABI-decoded UI** | [Explorer](./guide-explorer) | `Nethereum.Explorer` + `DataServices` |
| **Debug EVM execution step-by-step** | [Explorer](./guide-explorer) | `Nethereum.Explorer` |
| **Browse MUD World tables in a UI** | [Explorer](./guide-explorer) | `Nethereum.Explorer` + `Mud.Repositories.Postgres` |

## Quick Start — Process Event Logs

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

## Quick Start — Aspire Template (Recommended)

The fastest way to get a running indexer + explorer is the Aspire template:

```bash
dotnet new install Nethereum.Aspire.TemplatePack
dotnet new nethereum-devchain -n MyExplorer
cd MyExplorer
dotnet run --project AppHost
```

This gives you DevChain + Indexer + Explorer + PostgreSQL, all orchestrated by .NET Aspire with service discovery. Open the Aspire dashboard to see all services running. See the [Explorer guide](./guide-explorer) for details.

## Quick Start — Manual Setup (Indexer + Explorer)

```csharp
var builder = WebApplication.CreateBuilder(args);
var conn = "Host=localhost;Database=blockchain;Username=postgres;Password=secret";

// Index blocks, transactions, logs
builder.Services.AddPostgresBlockchainProcessor(builder.Configuration, conn);
builder.Services.AddPostgresInternalTransactionProcessor();

// Index ERC-20/721/1155 tokens
builder.Services.AddTokenLogPostgresProcessing(builder.Configuration, conn);
builder.Services.AddTokenDenormalizerProcessing(builder.Configuration, conn);
builder.Services.AddTokenBalanceAggregationProcessing(builder.Configuration, conn);

// Blazor explorer UI
builder.Services.AddExplorerServices(builder.Configuration);

var app = builder.Build();
app.MapRazorComponents<App>().AddInteractiveServerRenderMode();
app.Run();
```

## Architecture

```
BlockchainProcessing (pipeline engine)
├── BlockCrawlOrchestrator — block-by-block with txs, receipts, logs
├── LogOrchestrator — batch eth_getLogs across large ranges
└── InternalTransactionOrchestrator — debug_traceTransaction

BlockchainStore.EFCore (storage abstraction)
├── BlockchainDbContextBase — entity models, indexes
├── Repository interfaces — IBlockRepository, ITransactionRepository, etc.
└── Provider implementations — Postgres, SqlServer, Sqlite

BlockchainStorage.Processors (hosted services)
├── BlockchainProcessingHostedService — indexes blocks/txs/logs
└── InternalTransactionProcessingHostedService — indexes call traces

BlockchainStorage.Token.Postgres (token pipeline)
├── TokenLogPostgresProcessingService — capture Transfer events
├── TokenDenormalizerService — decode into typed records
└── TokenBalanceRpcAggregationService — aggregate balances via RPC

Nethereum.Explorer (Blazor UI)
├── Block/transaction/account/contract browsing
├── ABI-decoded contract interaction
├── Token balances, NFT inventory, transfers
├── EVM debugger with Solidity source mapping
└── MUD World browser
```

## Database Providers

| Package | Provider |
|---|---|
| `Nethereum.BlockchainStore.Postgres` | PostgreSQL |
| `Nethereum.BlockchainStore.SqlServer` | SQL Server |
| `Nethereum.BlockchainStore.Sqlite` | SQLite |

## Guides

- [Blockchain Processing](./guide-blockchain-processing) — Crawl blocks, transactions, and event logs with progress tracking
- [Database Storage](./guide-database-storage) — Persist to PostgreSQL, SQL Server, or SQLite with hosted services
- [Token Indexing](./guide-token-indexing) — Index ERC-20/721/1155 transfers and aggregate balances
- [Explorer](./guide-explorer) — Embed a full-featured Blazor blockchain explorer
