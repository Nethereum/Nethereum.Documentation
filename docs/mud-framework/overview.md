---
title: MUD Framework
sidebar_label: Overview
sidebar_position: 1
description: MUD autonomous worlds — tables, systems, store events, and normalisation
---

# MUD Framework

[MUD](https://mud.dev) is an on-chain application framework with a structured data model. Nethereum provides packages for working with MUD tables, encoding/decoding data, and processing Store events.

## Core Concepts

- **Tables** — typed data storage with a defined schema
- **Systems** — smart contract logic that reads and writes table data
- **Store** — on-chain data layer that emits events for every mutation
- **World** — entry point contract managing systems and tables

## Defining Table Records

```csharp
[TableRecord("app", "Player")]
public class PlayerTableRecord : TableRecord<PlayerKey, PlayerValue>
{
    public PlayerTableRecord() : base("app", "Player") { }
}

public class PlayerKey
{
    [Key(0, "address")]
    public string Address { get; set; }
}

public class PlayerValue
{
    [Value(0, "uint256")]
    public BigInteger Score { get; set; }

    [Value(1, "string")]
    public string Name { get; set; }
}
```

## Processing Store Events

```csharp
var processingService = new StoreEventsLogProcessingService(web3, worldAddress);
var records = await processingService.GetAllRecordsAsync<PlayerTableRecord>(fromBlock: 0);
```

## PostgreSQL Storage

For production, use `Nethereum.Mud.Repositories.Postgres` to normalise MUD data into relational tables.

## Lifecycle

1. **Deploy** a MUD World with tables and systems
2. **Index** Store events using `StoreEventsLogProcessingService`
3. **Store** decoded records in PostgreSQL
4. **Query** through the repository layer
5. **Write** back via system calls

## Packages

| Package | Description |
|---|---|
| `Nethereum.Mud` | Table schemas, record encoding, store subscriptions, predicate queries |
| `Nethereum.Mud.Contracts` | Store/World contract services and event processing |
| `Nethereum.Mud.Repositories.EntityFramework` | EF Core repository |
| `Nethereum.Mud.Repositories.Postgres` | PostgreSQL with normalisation |
| `Nethereum.MudBlazorComponents` | Blazor UI for MUD tables |
