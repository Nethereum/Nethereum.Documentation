---
title: "Nethereum.BlockchainStorage.Processors.SqlServer"
sidebar_label: "Nethereum.BlockchainStorage.Processors.SqlServer"
sidebar_position: 100
description: "SQL Server-specific DI registration for the Nethereum blockchain indexer hosted services."
custom_edit_url: "https://github.com/Nethereum/Nethereum/edit/master/src/Nethereum.BlockchainStorage.Processors.SqlServer/README.md"
format: md
---

# Nethereum.BlockchainStorage.Processors.SqlServer

> **NuGet**: [`Nethereum.BlockchainStorage.Processors.SqlServer`](https://www.nuget.org/packages/Nethereum.BlockchainStorage.Processors.SqlServer/) | **Source**: [`src/Nethereum.BlockchainStorage.Processors.SqlServer/`](https://github.com/Nethereum/Nethereum/tree/master/src/Nethereum.BlockchainStorage.Processors.SqlServer)
# Nethereum.BlockchainStorage.Processors.SqlServer

SQL Server-specific DI registration for the Nethereum blockchain indexer hosted services.

## Overview

Provides `AddSqlServerBlockchainProcessor()` and `AddSqlServerInternalTransactionProcessor()` extension methods that wire together the database-agnostic processing pipeline from `Nethereum.BlockchainStorage.Processors` with SQL Server storage from `Nethereum.BlockchainStore.SqlServer`.

Supports optional schema isolation for multi-chain storage in a single database.

## Installation

```bash
dotnet add package Nethereum.BlockchainStorage.Processors.SqlServer
```

Targets `net10.0`.

### Dependencies

- **Nethereum.BlockchainStorage.Processors** - Database-agnostic processing services and hosted services
- **Nethereum.BlockchainStore.SqlServer** - SQL Server DbContext and context factory

## Quick Start

```csharp
var builder = Host.CreateApplicationBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("SqlServerConnection");

builder.Services.AddSqlServerBlockchainProcessor(
    builder.Configuration,
    connectionString);

builder.Services.AddSqlServerInternalTransactionProcessor();

var host = builder.Build();
await host.RunAsync();
```

### With Schema Isolation

```csharp
builder.Services.AddSqlServerBlockchainProcessor(
    builder.Configuration,
    connectionString,
    schema: "mainnet");
```

### Connection String Resolution

The extension resolves the connection string in order:
1. Explicit `connectionString` parameter
2. `ConnectionStrings:SqlServerConnection`
3. `ConnectionStrings:BlockchainDbStorage`

## Configuration

See [Nethereum.BlockchainStorage.Processors](nethereum-blockchainstorage-processors) for `BlockchainProcessingOptions` configuration.

## Related Packages

- [Nethereum.BlockchainStorage.Processors](nethereum-blockchainstorage-processors) - Base processing services
- [Nethereum.BlockchainStore.SqlServer](nethereum-blockchainstore-sqlserver) - SQL Server storage layer
