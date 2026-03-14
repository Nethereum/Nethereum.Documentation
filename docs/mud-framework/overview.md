---
title: MUD Framework
sidebar_label: Overview
sidebar_position: 1
description: Build complex on-chain applications with MUD — an enhanced diamond pattern with typed tables, systems, namespaces, store event indexing, and PostgreSQL normalisation
---

# MUD Framework

[MUD](https://mud.dev) is an enhanced [EIP-2535 Diamond](https://eips.ethereum.org/EIPS/eip-2535) pattern for building complex smart contract applications. Instead of managing storage slots and facet routing manually, MUD gives you a **World** contract that acts as a proxy — routing calls to **systems** (smart contracts) via delegatecall, with all state stored in typed **tables**. Every table mutation emits a Store event, making the entire application state indexable and reproducible.

The key insight is the **namespace** — it groups related systems and tables into a single, unified context. Just as `web3.Eth` gives you organised access to all Ethereum operations, a MUD namespace like `app.Systems.Crafting` and `app.Tables.Inventory` gives you typed, discoverable access to your entire on-chain application through one entry point.

MUD is **not just for games**. Any application with complex, structured on-chain state benefits — supply chain tracking, on-chain registries, DAOs with governance state, DeFi protocols with configuration tables. The table/system/namespace pattern is a general-purpose architecture for applications that outgrow simple contract storage.

## How It Works

```
World Contract (Diamond Proxy)
    │
    ├── call(systemId, callData) ──→ delegatecall → System contract
    │                                                  ├── reads/writes Tables
    │                                                  └── calls other Systems
    │
    ├── Namespace: "app"
    │   ├── Systems: CraftingSystem, TradeSystem, ConfigSystem
    │   └── Tables: Player, Inventory, GameConfig
    │
    └── Store Events ──→ Indexer ──→ PostgreSQL (normalised) ──→ REST API / Query
```

**Systems** are smart contracts — generated from Solidity like any Nethereum contract service, but extended with MUD configuration so the World can route to them. They execute via delegatecall within the World's context, which means they share access to all tables in their namespace.

**Tables** are typed on-chain storage with defined schemas (keys + values). Unlike raw Solidity mappings, every table mutation emits a Store event, and schemas are registered on-chain — so any indexer can decode and reproduce the full state.

**Namespaces** are the organising unit. A namespace owns a set of systems and tables with shared access control. In Nethereum, the `NamespaceBase<TResource, TSystems, TTables>` class composes all generated services into a single object — your application's entry point.

## The Namespace Pattern

This is the core of MUD in Nethereum. A namespace gives you unified access to all systems and tables, just like `web3.Eth`:

```csharp
// One namespace = full access to your application
var app = new AppNamespace(web3, worldAddress);

// Call systems (smart contracts routed through World)
await app.Systems.Crafting.CraftItemRequestAndWaitForReceiptAsync(recipeId);
await app.Systems.Trade.ListItemRequestAndWaitForReceiptAsync(itemId, price);

// Read tables (typed on-chain data)
var player = await app.Tables.Player.GetTableRecordAsync(playerKey);
var inventory = await app.Tables.Inventory.GetTableRecordAsync(inventoryKey);

// Business logic methods that combine system calls and table reads
var items = await app.GetPlayerInventoryAsync(playerId);
```

The namespace composes three layers — each generated from your Solidity contracts:

```csharp
// Generated systems — smart contracts with MUD routing
public class AppSystems : SystemsServices
{
    public CraftingSystemService Crafting { get; private set; }
    public TradeSystemService Trade { get; private set; }
    // Systems handle Create2 deployment, batch registration, delegation
}

// Generated tables — typed on-chain storage
public class AppTables : TablesServices
{
    public PlayerTableService Player { get; private set; }
    public InventoryTableService Inventory { get; private set; }
    // Tables handle schema registration, batch operations
}

// Namespace — the unified entry point with business logic
public class AppNamespace : NamespaceBase<AppResource, AppSystems, AppTables>
{
    // Combines systems + tables + custom business methods
}
```

For a production example with 35+ tables and 17+ systems under typed namespace classes, see [CafeCosmos](https://github.com/CafeCosmosHQ/CafeCosmosDotNet).

## The Simple Path

| Task | Simple Path |
|------|-------------|
| Define tables & systems | `mud.config.ts` + Solidity at [mud.dev](https://mud.dev) |
| Generate C# services | `Nethereum.Generator.Console generate from-config` with `.nethereum-gen.multisettings` |
| Call a system | `namespace.Systems.MySystem.MyFunctionRequestAndWaitForReceiptAsync(...)` |
| Read a table record | `namespace.Tables.MyTable.GetTableRecordAsync(key)` |
| Deploy systems (CREATE2) | `namespace.Systems.DeployAllCreate2ContractSystemsRequestAndWaitForReceiptAsync(deployer, salt)` |
| Register all tables | `namespace.Tables.BatchRegisterAllTablesRequestAndWaitForReceiptAsync()` |
| Register all systems | `namespace.Systems.BatchRegisterAllSystemsRequestAndWaitForReceiptAsync(deployer, salt)` |
| Index store events | `storeEventsService.ProcessAllStoreChangesAsync(repository)` |
| Continuous sync | `storeEventsService.CreateProcessor(repository, progressRepo)` |
| Normalise to PostgreSQL | `MudPostgresStoreRecordsNormaliser.UpsertAsync(repository)` |
| Query normalised data | `NormalisedTableQueryService.QueryAsync(tableName, predicate)` |
| Query via REST API | `StoredRecordRestApiClient.GetTableRecordsAsync<T>(predicate)` |
| Predicate queries | `builder.Equals(x => x.Field, value).AndEqual(x => x.Other, v).Expand()` |

For every write operation, Nethereum handles gas estimation, nonce management, EIP-1559 fee calculation, and transaction signing automatically.

## Data Pipeline

MUD's Store events create a complete data pipeline from on-chain state to queryable off-chain storage:

```
On-Chain                         Off-Chain
────────                         ─────────
Table mutations                  StoreEventsLogProcessingService
    │                                │
    └── Store events ──────────→ ProcessAllStoreChangesAsync()
                                     │
                              ┌──────┴──────┐
                              │             │
                    InMemoryRepository   EF Core Repository
                              │             │
                    MudPostgresStoreRecordsNormaliser
                              │
                    Typed PostgreSQL tables
                              │
                    ┌─────────┴─────────┐
                    │                   │
          NormalisedTableQueryService   StoredRecordRestApiClient
          (direct SQL queries)          (HTTP REST API)
```

- **Processor** — `StoreEventsLogProcessingService` reads Store events and applies them to any `ITableRepository`
- **Blockchain Processor** — `CreateProcessor()` builds a continuous sync loop with block progress tracking and reorg handling
- **Normaliser** — `MudPostgresStoreRecordsNormaliser` creates typed PostgreSQL tables mirroring MUD schemas (e.g., `app__Player` with `address`, `score`, `name` columns)
- **Query Service** — `NormalisedTableQueryService` provides SQL queries with pagination, ordering, and predicate filtering over normalised tables
- **REST Client** — `StoredRecordRestApiClient` queries a remote MUD indexer via HTTP POST with `TablePredicate`
- **Predicate Builder** — `TablePredicateBuilder` provides a fluent, typed query API: `builder.Equals(x => x.Address, addr).AndEqual(x => x.Status, 1).Expand()`

## Packages

| Package | Description |
|---|---|
| `Nethereum.Mud` | Table schemas, record encoding/decoding, repositories, predicate queries, REST API client, resource encoding |
| `Nethereum.Mud.Contracts` | World/Store contract services, system services, Store event processing, table/system registration, access management, namespace base classes |
| `Nethereum.Mud.Repositories.EntityFramework` | EF Core repository for MUD table records |
| `Nethereum.Mud.Repositories.Postgres` | PostgreSQL storage with schema normalisation and typed query service |

## Guides

### Getting Started

| Guide | What You'll Learn |
|---|---|
| [MUD Quickstart](guide-mud-quickstart) | Enhanced diamond pattern, code generation, systems as smart contracts, namespace pattern, the unified context |

### Working with Data

| Guide | What You'll Learn |
|---|---|
| [Tables and Records](guide-mud-tables) | Table records, table services, repositories, predicate queries, change tracking, REST API client, multicall batch operations |
| [Indexing Store Events](guide-mud-indexing) | Store event processing, continuous sync, EF Core and PostgreSQL storage, schema normalisation, query service |

### Deployment

| Guide | What You'll Learn |
|---|---|
| [Deploy a MUD World](guide-mud-deployment) | World factory, CREATE2 system deployment, batch table/system registration, namespace access control |

## Production Reference

[CafeCosmos](https://github.com/CafeCosmosHQ/CafeCosmosDotNet) is a production MUD application built with Nethereum that demonstrates the full pattern — a `LandNamespace` composing 35+ table services and 17+ system services, with business logic methods that combine table reads and system calls into high-level operations.
