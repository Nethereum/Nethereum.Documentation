---
title: MUD Framework
sidebar_label: Overview
sidebar_position: 1
description: Build structured on-chain applications with MUD — typed tables, systems, store event indexing, and PostgreSQL normalisation using Nethereum
---

# MUD Framework

[MUD](https://mud.dev) is a framework for building on-chain applications with structured data. It provides a standardised data model (tables and systems) managed by a World contract, with every mutation emitted as a Store event — making the entire application state indexable and reproducible.

MUD is **not just for games**. Any application that needs structured, on-chain data benefits from MUD's table model: supply chain tracking, on-chain registries, DAOs with structured governance state, DeFi protocols with complex configuration tables, or autonomous worlds. The table/system pattern is a general-purpose alternative to hand-rolling storage mappings in Solidity.

Nethereum provides full .NET support for the MUD lifecycle: define tables in Solidity via [mud.dev](https://mud.dev), generate typed C# services, deploy World contracts, index Store events, store records in PostgreSQL, and query through a typed repository layer.

## The Simple Path

| Task | Simple Path |
|------|-------------|
| Define tables | `mud.config.ts` at [mud.dev](https://mud.dev) (Solidity/TypeScript) |
| Generate C# code | `Nethereum.Generator.Console generate from-config` with `.nethereum-gen.multisettings` |
| Read a table record | `tableService.GetTableRecordAsync(key)` |
| Write a table record | `tableService.SetRecordRequestAndWaitForReceiptAsync(key, value)` |
| Index all store events | `storeEventsService.ProcessAllStoreChangesAsync(repository)` |
| Query with predicates | `builder.Equals(x => x.Field, value).Expand()` |
| Normalise to PostgreSQL | `MudPostgresStoreRecordsNormaliser` creates typed relational tables |
| Register a namespace | `namespaceService.RegisterNamespaceRequestAndWaitForReceiptAsync()` |

For every write operation, Nethereum handles gas estimation, nonce management, EIP-1559 fee calculation, and transaction signing automatically.

## Core Concepts

- **World** — the entry-point contract that manages all namespaces, tables, and systems. One World per application deployment.
- **Tables** — typed data storage with a defined schema (keys + values). Every table mutation emits a Store event. Tables are defined in `mud.config.ts` and registered on-chain.
- **Systems** — smart contract logic that reads and writes table data. Systems are registered under namespaces and called through the World contract.
- **Namespaces** — access control boundaries that group related tables and systems. Each namespace has an owner who controls registration and permissions.
- **Store Events** — every table mutation (`Store_SetRecord`, `Store_SpliceStaticData`, `Store_SpliceDynamicData`, `Store_DeleteRecord`) is emitted as an event, making the entire state indexable from logs.

## Code Generation Workflow

MUD tables are defined in Solidity (via `mud.config.ts`), then Nethereum generates typed C# classes:

1. **Define tables** in `mud.config.ts` using `defineWorld()` — see [mud.dev docs](https://mud.dev)
2. **Build contracts** with Forge to produce compiled JSON artifacts
3. **Configure code generation** in `.nethereum-gen.multisettings` with generator types `MudTables` and `MudExtendedService`
4. **Run the generator** — produces `TableRecord`, `TableService`, and `SystemService` classes

Three ways to run the generator:
- **VS Code**: Right-click `.nethereum-gen.multisettings` → "Generate Nethereum code"
- **.NET CLI**: `dotnet tool install -g Nethereum.Generator.Console` → `Nethereum.Generator.Console generate from-config`
- **Node.js**: Use the JavaScript generator package

## Packages

| Package | Description |
|---|---|
| `Nethereum.Mud` | Table schemas, record encoding/decoding, repositories, predicate queries, resource encoding |
| `Nethereum.Mud.Contracts` | World/Store contract services, Store event processing, table/system registration, access management |
| `Nethereum.Mud.Repositories.EntityFramework` | EF Core repository for MUD table records |
| `Nethereum.Mud.Repositories.Postgres` | PostgreSQL storage with schema normalisation and typed query service |

## Guides

### Getting Started

| Guide | What You'll Learn |
|---|---|
| [MUD Quickstart](guide-mud-quickstart) | What MUD is (beyond gaming), define tables at mud.dev, code generation workflow, namespace/tables/systems pattern |

### Working with Data

| Guide | What You'll Learn |
|---|---|
| [Tables and Records](guide-mud-tables) | Table records, table services, repositories, predicate queries, local state with change tracking, multicall batch saves |
| [Indexing Store Events](guide-mud-indexing) | Process Store events into repositories, EF Core and PostgreSQL storage, schema normalisation, background sync with blockchain processor |

### Deployment

| Guide | What You'll Learn |
|---|---|
| [Deploy a MUD World](guide-mud-deployment) | World factory deployment, namespace registration, table registration, system deployment with CREATE2, access control |

## Production Reference

[CafeCosmos](https://github.com/CafeCosmosHQ/CafeCosmosDotNet) is a production MUD application built with Nethereum that demonstrates the full namespace pattern — aggregating 35+ table services and 17+ system services under typed namespace classes with business logic methods.
