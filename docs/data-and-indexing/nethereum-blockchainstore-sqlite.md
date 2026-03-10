---
title: "Nethereum.BlockchainStore.Sqlite"
sidebar_label: "Nethereum.BlockchainStore.Sqlite"
sidebar_position: 100
description: "SQLite implementation of the Nethereum blockchain storage layer using Entity Framework Core."
custom_edit_url: "https://github.com/Nethereum/Nethereum/edit/master/src/Nethereum.BlockchainStore.Sqlite/README.md"
format: md
---

# Nethereum.BlockchainStore.Sqlite

> **NuGet**: [`Nethereum.BlockchainStore.Sqlite`](https://www.nuget.org/packages/Nethereum.BlockchainStore.Sqlite/) | **Source**: [`src/Nethereum.BlockchainStore.Sqlite/`](https://github.com/Nethereum/Nethereum/tree/master/src/Nethereum.BlockchainStore.Sqlite)
# Nethereum.BlockchainStore.Sqlite

SQLite implementation of the Nethereum blockchain storage layer using Entity Framework Core.

## Overview

Nethereum.BlockchainStore.Sqlite provides the SQLite-specific `DbContext`, context factory, and DI registration for storing indexed Ethereum blockchain data. It inherits from `Nethereum.BlockchainStore.EFCore.BlockchainDbContextBase` and uses `Microsoft.EntityFrameworkCore.Sqlite`.

SQLite is ideal for local development, testing, single-node DevChain scenarios, and embedded applications where a full database server is not needed.

### Key Features

- `SqliteBlockchainDbContext` configured with `UseSqlite()`
- `SqliteBlockchainDbContextFactory` implementing `IBlockchainDbContextFactory` with automatic `EnsureCreated()` on first use
- `AddSqliteBlockchainStorage()` DI extension that registers the factory and all EFCore repositories
- Design-time factory for `dotnet ef migrations` tooling

## Installation

```bash
dotnet add package Nethereum.BlockchainStore.Sqlite
```

Targets `net8.0` and `net10.0`.

### Dependencies

- **Nethereum.BlockchainStore.EFCore** - Base `BlockchainDbContextBase`, entity builders, and repository implementations
- **Nethereum.Microsoft.Configuration.Utils** - `ConfigurationUtils.Build()` for appsettings-based connection string resolution
- **Microsoft.EntityFrameworkCore.Sqlite** - SQLite EF Core provider
- **Microsoft.EntityFrameworkCore.Design** - Design-time migration support (private asset)

## Quick Start

```csharp
using Nethereum.BlockchainStore.Sqlite;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSqliteBlockchainStorage("Data Source=blockchain.db");
```

This registers `IBlockchainDbContextFactory` and all repository implementations via `AddBlockchainRepositories()`.

## Usage Examples

### Direct Context Usage

```csharp
var factory = new SqliteBlockchainDbContextFactory("Data Source=blockchain.db");
using var context = factory.CreateContext();

var latestBlock = await context.Blocks
    .Where(b => b.IsCanonical)
    .OrderByDescending(b => b.BlockNumber)
    .FirstOrDefaultAsync();
```

### With Block Storage Processor

```csharp
var factory = new SqliteBlockchainDbContextFactory("Data Source=blockchain.db");
var repoFactory = new BlockchainStoreRepositoryFactory(factory);

var steps = new BlockStorageProcessingSteps(repoFactory);
var orchestrator = new BlockCrawlOrchestrator(web3.Eth, steps);

var processor = new BlockchainProcessor(
    orchestrator,
    repoFactory.CreateBlockProgressRepository(),
    lastConfirmedBlockService);

await processor.ExecuteAsync(cancellationToken);
```

### Connection String Resolution

`SqliteBlockchainDbContext` resolves the connection string in this order:
1. Constructor parameter (explicit string)
2. `ConnectionStrings:SqliteConnection` from `appsettings.json`
3. `ConnectionStrings:BlockchainDbStorage` from `appsettings.json`

## Database Schema

All tables use the same schema as `Nethereum.BlockchainStore.EFCore` with `TEXT` column type for unlimited text fields. Numeric indexing fields (`BlockNumber`, `Timestamp`, `TransactionIndex`, `LogIndex`, `Nonce`, `TransactionType`) are stored as `INTEGER` (SQLite's native 64-bit integer type).

## Related Packages

### Dependencies

- **Nethereum.BlockchainStore.EFCore** - Base DbContext, entity builders, repositories

### See Also

- [Nethereum.BlockchainStore.EFCore](nethereum-blockchainstore-efcore) - Database-agnostic EF Core base
- [Nethereum.BlockchainStore.Postgres](nethereum-blockchainstore-postgres) - PostgreSQL implementation
- [Nethereum.BlockchainProcessing](nethereum-blockchainprocessing) - Processing framework and entity definitions
