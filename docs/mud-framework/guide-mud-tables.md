---
title: Tables and Records
sidebar_label: Tables & Records
sidebar_position: 3
description: Work with MUD table records, typed services, in-memory repositories, predicate queries, REST API client, change tracking, and multicall batch operations
---

# Tables and Records

MUD tables are the data layer of the enhanced diamond pattern — typed records with defined schemas stored in the World contract, accessible through generated table services. As covered in the [Quickstart](guide-mud-quickstart), systems (smart contracts) read and write these tables via delegatecall, and every mutation emits a Store event for off-chain indexing. This guide covers the table record model, repository pattern, predicate queries, REST API access, change tracking, and batch operations.

:::tip The Simple Way
```csharp
var playerService = new PlayerTableService(web3, worldAddress);
var player = await playerService.GetTableRecordAsync(new PlayerKey { Address = addr });
```
Read and write typed table records through generated services — encoding, World routing, gas, and nonce are automatic.
:::

## Prerequisites

```bash
dotnet add package Nethereum.Mud
dotnet add package Nethereum.Mud.Contracts
```

You need generated table record and service classes from the [MUD Quickstart](guide-mud-quickstart) code generation workflow.

## Table Record Model

Every MUD table record has two parts: **keys** (the lookup index) and **values** (the stored data). The generated `TableRecord<TKey, TValue>` base class combines them:

```csharp
// Generated from mud.config.ts
public partial class PlayerTableRecord : TableRecord<PlayerTableRecord.PlayerKey, PlayerTableRecord.PlayerValue>
{
    public PlayerTableRecord() : base("app", "Player") { }

    // Direct access properties bypass .Keys. and .Values. nesting
    public virtual string Address => Keys.Address;
    public virtual BigInteger Score => Values.Score;
    public virtual string Name => Values.Name;
}
```

The direct access properties are convenience shortcuts — `player.Score` instead of `player.Values.Score`. Both access the same data.

For singleton tables (defined with `key: []` in `mud.config.ts`), the record extends `TableRecordSingleton<TValue>` — no key class is generated because there's only ever one record.

## Read and Write Records

Generated table services provide typed CRUD operations. All calls route through the World contract:

```csharp
var playerService = new PlayerTableService(web3, worldAddress);

// Read
var player = await playerService.GetTableRecordAsync(
    new PlayerTableRecord.PlayerKey { Address = playerAddress });

// Write
var receipt = await playerService.SetRecordRequestAndWaitForReceiptAsync(
    new PlayerTableRecord.PlayerKey { Address = playerAddress },
    new PlayerTableRecord.PlayerValue { Score = 500, Name = "Bob" });

// Delete
await playerService.DeleteRecordRequestAndWaitForReceiptAsync(
    new PlayerTableRecord.PlayerKey { Address = playerAddress });
```

For singleton tables, reads and writes don't require a key:

```csharp
var configService = new GameConfigTableSingletonService(web3, worldAddress);

// Read the single record
var config = await configService.GetTableRecordAsync();

// Write the single record
await configService.SetRecordRequestAndWaitForReceiptAsync(
    new GameConfigValue { MaxPlayers = 100, RoundDuration = 3600 });
```

## Batch Reads with Multicall

When you need to read multiple records, use multicall to batch the RPC requests into a single call:

```csharp
var keys = new List<PlayerTableRecord.PlayerKey>
{
    new() { Address = "0xAddr1..." },
    new() { Address = "0xAddr2..." },
    new() { Address = "0xAddr3..." },
};

var players = await playerService.GetTableRecordsMulticallRpcAsync(keys);
```

This sends one RPC request instead of three, significantly reducing latency for bulk reads.

## In-Memory Repository

The `InMemoryTableRepository` stores decoded table records locally. This is useful for caching state, running predicate queries, and processing Store events:

```csharp
using Nethereum.Mud.TableRepository;

var repository = new InMemoryTableRepository();

// Process all Store events from the chain into the repository
var storeEventsService = new StoreEventsLogProcessingService(web3, worldAddress);
await storeEventsService.ProcessAllStoreChangesAsync(repository);

// Now query records from local state
var players = await repository.GetTableRecordsAsync<PlayerTableRecord>();
```

After processing, the repository contains the full current state of all tables — you can query it without making further RPC calls.

You can also read records for a specific table through the generated table service:

```csharp
var allPlayers = await playerService.GetTableRecordsAsync(repository);
```

## Predicate Queries

The `TablePredicateBuilder` provides a fluent API for filtering table records by key values. This is particularly useful when querying records from a repository:

```csharp
var builder = playerService.CreateTablePredicateBuilder();

var predicate = builder
    .Equals(x => x.Address, "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B")
    .Expand();

var results = await playerService.GetRecordsFromRepositoryAsync(predicate, repository);
```

Predicates support multiple conditions with logical operators:

```csharp
// Complex predicate with AND/OR
var predicate = builder
    .Equals(x => x.Field1, value1)
    .AndEqual(x => x.Field2, value2)
    .OrEqual(x => x.Field3, value3)
    .AndNotEqual(x => x.Field4, value4)
    .Expand();
```

The predicate is translated to the repository's query language — for `InMemoryTableRepository` it filters in-memory, and for EF Core or PostgreSQL repositories it generates SQL WHERE clauses.

## Change Tracking

The `InMemoryChangeTrackerTableRepository` extends the in-memory repository with mutation tracking. This enables a pattern where you make changes locally and then batch-submit them to the chain:

```csharp
var repository = new InMemoryChangeTrackerTableRepository();

// Load current state from chain
await storeEventsService.ProcessAllStoreChangesAsync(repository);

// Start tracking changes
repository.StartTracking();

// Make local modifications (these are tracked but not sent to chain yet)
await repository.SetRecordAsync(playerRecord);
await repository.DeleteRecordAsync(tableId, key);

// Get all changes since tracking started
var changeSet = repository.GetAndClearChangeSet();

repository.StopTracking();
```

The `InMemoryChangeSet` contains lists of set and deleted records, which you can then submit to the World contract — for example, by building multicall inputs from the changes.

## System Call Multicall

For batch writes, use `SystemCallMulticallInput` to combine multiple system calls into a single transaction:

```csharp
using Nethereum.Mud.Contracts.Core.Systems;

// Create multicall inputs for multiple operations
var input1 = new SystemCallMulticallInput<MoveFunction, GameSystemResource>(
    new MoveFunction { X = 10, Y = 20 });

var input2 = new SystemCallMulticallInput<AttackFunction, GameSystemResource>(
    new AttackFunction { TargetId = 42 });

// Get the encoded system call data
var callData1 = input1.GetSystemCallData();
var callData2 = input2.GetSystemCallData();
```

Each `SystemCallMulticallInput` encodes the function message with the system's resource ID, producing data that the World contract's batch call system can execute in a single transaction.

## Schema Encoding

Under the hood, table records use schema-based encoding to convert between C# types and the on-chain byte representation. The `GetEncodeValues()` method on a table record produces the encoded static data, encoded lengths, and dynamic data:

```csharp
var record = new PlayerTableRecord
{
    Keys = new PlayerTableRecord.PlayerKey { Address = playerAddress },
    Values = new PlayerTableRecord.PlayerValue { Score = 100, Name = "Alice" }
};

var encodedValues = record.Values.GetEncodeValues();
// encodedValues.StaticData — fixed-size fields (uint256, address, etc.)
// encodedValues.EncodedLengths — lengths of dynamic fields
// encodedValues.DynamicData — variable-size fields (string, bytes, arrays)
```

You typically don't need to work with encoded values directly — the table services handle encoding and decoding. This is useful when building custom indexing or debugging store events.

## REST API Client

If you have a MUD indexer running with a REST API, the `StoredRecordRestApiClient` queries it using the same `TablePredicate` system used for local repositories:

```csharp
using Nethereum.Mud.TableRepository;
using Nethereum.Util.Rest;

var restClient = new StoredRecordRestApiClient(
    new RestHttpHelper(httpClient),
    "https://indexer.example.com",
    postPath: "storedrecords");

// Query typed records via HTTP POST with predicates
var predicate = playerService.CreateTablePredicateBuilder()
    .Equals(x => x.Address, playerAddress)
    .Expand();

var players = await restClient.GetTableRecordsAsync<PlayerTableRecord>(predicate);
```

The REST client implements `ITablePredicateQueryRepository`, so it's interchangeable with in-memory and database repositories — your query code works the same regardless of where the data lives.

## Common Gotchas

- **Repository state is a snapshot** — after calling `ProcessAllStoreChangesAsync`, the repository reflects the chain state at that point. New on-chain mutations won't appear until you process again. Use the blockchain processor (see [Indexing Store Events](guide-mud-indexing)) for continuous sync.
- **Predicate queries work on keys only** — the fluent builder filters by key fields, not value fields. To filter by value, retrieve all records and filter in memory.
- **Generated classes are partial** — extend them with your own methods in separate files rather than modifying `.gen.cs` files.

## Next Steps

- **[Indexing Store Events](guide-mud-indexing)** — process Store events continuously into repositories, use EF Core or PostgreSQL for persistent storage, normalise schemas into relational tables
- **[Deploy a MUD World](guide-mud-deployment)** — deploy the World contract, register namespaces, tables, and systems
- **[MUD Quickstart](guide-mud-quickstart)** — code generation workflow and namespace pattern overview
