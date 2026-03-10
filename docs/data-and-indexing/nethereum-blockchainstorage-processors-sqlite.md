---
title: "Nethereum.BlockchainStorage.Processors.Sqlite"
sidebar_label: "Nethereum.BlockchainStorage.Processors.Sqlite"
sidebar_position: 100
description: "SQLite-specific DI registration for the Nethereum blockchain indexer hosted services."
custom_edit_url: "https://github.com/Nethereum/Nethereum/edit/master/src/Nethereum.BlockchainStorage.Processors.Sqlite/README.md"
format: md
---

# Nethereum.BlockchainStorage.Processors.Sqlite

> **NuGet**: [`Nethereum.BlockchainStorage.Processors.Sqlite`](https://www.nuget.org/packages/Nethereum.BlockchainStorage.Processors.Sqlite/) | **Source**: [`src/Nethereum.BlockchainStorage.Processors.Sqlite/`](https://github.com/Nethereum/Nethereum/tree/master/src/Nethereum.BlockchainStorage.Processors.Sqlite)
# Nethereum.BlockchainStorage.Processors.Sqlite

SQLite-specific DI registration for the Nethereum blockchain indexer hosted services.

## Overview

Provides `AddSqliteBlockchainProcessor()` and `AddSqliteInternalTransactionProcessor()` extension methods that wire together the database-agnostic processing pipeline from `Nethereum.BlockchainStorage.Processors` with SQLite storage from `Nethereum.BlockchainStore.Sqlite`.

## Installation

```bash
dotnet add package Nethereum.BlockchainStorage.Processors.Sqlite
```

Targets `net10.0`.

### Dependencies

- **Nethereum.BlockchainStorage.Processors** - Database-agnostic processing services and hosted services
- **Nethereum.BlockchainStore.Sqlite** - SQLite DbContext and context factory

## Quick Start

```csharp
var builder = Host.CreateApplicationBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("SqliteConnection")
    ?? "Data Source=blockchain.db";

builder.Services.AddSqliteBlockchainProcessor(
    builder.Configuration,
    connectionString);

builder.Services.AddSqliteInternalTransactionProcessor();

var host = builder.Build();
await host.RunAsync();
```

### Connection String Resolution

The extension resolves the connection string in order:
1. Explicit `connectionString` parameter
2. `ConnectionStrings:SqliteConnection`
3. `ConnectionStrings:BlockchainDbStorage`

## Configuration

See [Nethereum.BlockchainStorage.Processors](nethereum-blockchainstorage-processors) for `BlockchainProcessingOptions` configuration.

## Related Packages

- [Nethereum.BlockchainStorage.Processors](nethereum-blockchainstorage-processors) - Base processing services
- [Nethereum.BlockchainStore.Sqlite](nethereum-blockchainstore-sqlite) - SQLite storage layer
