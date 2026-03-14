---
title: MUD Quickstart
sidebar_label: MUD Quickstart
sidebar_position: 2
description: Understand MUD's structured data model, define tables in Solidity, generate typed C# services, and interact with tables and systems
---

# MUD Quickstart

MUD gives you a structured data layer on-chain — typed tables with defined schemas, systems that operate on those tables, and a World contract that ties everything together. Every table mutation emits an event, so you can rebuild the entire state from logs. This guide covers what MUD is, how to define tables, generate C# code, and use the generated services.

:::tip The Simple Way
```csharp
// Read a table record (generated typed service)
var player = await playerTableService.GetTableRecordAsync(new PlayerKey { Address = playerAddress });

// Write a table record
await playerTableService.SetRecordRequestAndWaitForReceiptAsync(
    new PlayerKey { Address = playerAddress },
    new PlayerValue { Score = 100, Name = "Alice" });
```
Table services handle encoding, World contract routing, gas, and nonce automatically.
:::

## What Is MUD?

MUD is a framework from [Lattice](https://mud.dev) for building on-chain applications with structured data. Instead of writing custom Solidity storage mappings, you define **tables** with typed schemas and **systems** that operate on them. A **World** contract manages registration, access control, and routing.

This is useful for any application that needs structured on-chain state — not just games. Supply chain tracking, on-chain registries, DAOs with complex governance state, DeFi configuration management — any domain where you want typed, indexable, structured data on-chain.

Key properties:
- **Every mutation is an event** — you can rebuild the full state from Store events at any point
- **Typed schemas** — tables have defined key and value fields with Solidity types
- **Namespace isolation** — tables and systems are grouped under namespaces with access control
- **Composability** — systems can call other systems through the World contract

## Prerequisites

```bash
dotnet add package Nethereum.Mud
dotnet add package Nethereum.Mud.Contracts
```

For code generation, install the .NET CLI tool:

```bash
dotnet tool install -g Nethereum.Generator.Console
```

You'll also need a MUD project with tables defined at [mud.dev](https://mud.dev) and contracts compiled with Forge.

## Define Tables in Solidity

Tables are defined in `mud.config.ts` using the `defineWorld()` function. This is standard MUD — see the [MUD documentation](https://mud.dev) for the full reference. Here's a minimal example:

```typescript
import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  namespace: "app",
  tables: {
    Player: {
      schema: {
        address: "address",
        score: "uint256",
        name: "string",
      },
      key: ["address"],
    },
    GameConfig: {
      schema: {
        maxPlayers: "uint32",
        roundDuration: "uint32",
      },
      key: [],  // empty key = singleton table (one record)
    },
  },
});
```

Key concepts:
- Fields listed in `key` become the table's lookup keys — you query records by providing key values
- Fields NOT in `key` become the value schema
- `key: []` creates a singleton table with exactly one record (no key needed to look it up)
- Solidity types (`uint256`, `address`, `string`, `bool`, `bytes32`, `string[]`) map automatically to C# types

## Generate C# Code

After defining tables and compiling contracts with Forge, configure the Nethereum code generator. Create a `.nethereum-gen.multisettings` file:

```json
[
  {
    "paths": ["path/to/mud.config.ts"],
    "generatorConfigs": [
      {
        "baseNamespace": "MyProject.Contracts",
        "basePath": "Generated/Tables",
        "codeGenLang": 0,
        "generatorType": "MudTables"
      }
    ]
  },
  {
    "paths": ["path/to/compiled/System.json"],
    "generatorConfigs": [
      {
        "baseNamespace": "MyProject.Contracts",
        "basePath": "Generated/Systems",
        "codeGenLang": 0,
        "generatorType": "MudExtendedService"
      }
    ]
  }
]
```

The `generatorType` values:
- **`MudTables`** — parses `mud.config.ts` and generates `TableRecord` and `TableService` classes for each table
- **`MudExtendedService`** — parses compiled system JSON and generates typed system service wrappers
- **`ContractDefinition`** — standard ABI-to-C# generation (for non-MUD contracts in the project)

Run the generator using one of three methods:

**VS Code** (recommended for interactive use): Install the [Nethereum Solidity extension](https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity), right-click the `.nethereum-gen.multisettings` file, and select "Generate Nethereum code".

**.NET CLI** (recommended for CI/CD):
```bash
Nethereum.Generator.Console generate from-config --config path/to/.nethereum-gen.multisettings
```

**Node.js**: Use the JavaScript generator package for integration with Node.js build pipelines.

## Generated Code Structure

For each table, the generator produces a `.gen.cs` file with three classes:

**TableRecord** — the typed record with key and value inner classes:

```csharp
// Generated: PlayerTableRecord.gen.cs
public partial class PlayerTableRecord : TableRecord<PlayerTableRecord.PlayerKey, PlayerTableRecord.PlayerValue>
{
    public PlayerTableRecord() : base("app", "Player") { }

    // Direct access properties (convenience)
    public virtual string Address => Keys.Address;
    public virtual BigInteger Score => Values.Score;
    public virtual string Name => Values.Name;

    public partial class PlayerKey
    {
        [Parameter("address", "address", 1)]
        public virtual string Address { get; set; }
    }

    public partial class PlayerValue
    {
        [Parameter("uint256", "score", 1)]
        public virtual BigInteger Score { get; set; }

        [Parameter("string", "name", 2)]
        public virtual string Name { get; set; }
    }
}
```

**TableService** — typed CRUD operations routed through the World contract:

```csharp
// Generated: PlayerTableService.gen.cs
public partial class PlayerTableService : TableService<PlayerTableRecord, PlayerTableRecord.PlayerKey, PlayerTableRecord.PlayerValue>
{
    public PlayerTableService(IWeb3 web3, string contractAddress) : base(web3, contractAddress) { }

    public virtual Task<PlayerTableRecord> GetTableRecordAsync(PlayerTableRecord.PlayerKey key, BlockParameter blockParameter = null);
    public virtual Task<string> SetRecordRequestAsync(PlayerTableRecord.PlayerKey key, PlayerTableRecord.PlayerValue value);
    public virtual Task<TransactionReceipt> SetRecordRequestAndWaitForReceiptAsync(PlayerTableRecord.PlayerKey key, PlayerTableRecord.PlayerValue value);
    public virtual Task<string> DeleteRecordRequestAsync(PlayerTableRecord.PlayerKey key);
}
```

Singleton tables (like `GameConfig` with `key: []`) generate a `TableSingletonService` instead — no key parameter needed for reads and writes.

## Use Generated Services

Connect to a deployed World contract and use the generated table services:

```csharp
using Nethereum.Web3;

var web3 = new Web3(new Account(privateKey), "https://rpc.example.com");
string worldAddress = "0x..."; // your deployed World contract

// Create a table service pointing at the World
var playerService = new PlayerTableService(web3, worldAddress);
```

Read a record by providing the key:

```csharp
var record = await playerService.GetTableRecordAsync(
    new PlayerTableRecord.PlayerKey { Address = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B" });

Console.WriteLine($"Player: {record.Name}, Score: {record.Score}");
```

Write a record — the service encodes the key and value, routes through the World contract, and handles gas/nonce:

```csharp
var receipt = await playerService.SetRecordRequestAndWaitForReceiptAsync(
    new PlayerTableRecord.PlayerKey { Address = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B" },
    new PlayerTableRecord.PlayerValue { Score = 250, Name = "Alice" });
```

Delete a record:

```csharp
await playerService.DeleteRecordRequestAndWaitForReceiptAsync(
    new PlayerTableRecord.PlayerKey { Address = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B" });
```

## The Namespace Pattern

In production MUD applications, you aggregate generated table services and system services into namespace classes. This provides a clean API for interacting with all tables and systems in a namespace.

The pattern uses three layers:

```csharp
// 1. TablesServices — aggregates all table services
public class AppTablesServices : TablesServices
{
    public PlayerTableService Player { get; private set; }
    public GameConfigTableService GameConfig { get; private set; }

    public AppTablesServices(IWeb3 web3, string contractAddress) : base(web3, contractAddress)
    {
        Player = new PlayerTableService(web3, contractAddress);
        GameConfig = new GameConfigTableService(web3, contractAddress);
    }
}

// 2. SystemsServices — aggregates all system services
public class AppSystems : SystemsServices
{
    public GameSystemService Game { get; private set; }

    public AppSystems(IWeb3 web3, string contractAddress) : base(web3, contractAddress)
    {
        Game = new GameSystemService(web3, contractAddress);
    }
}

// 3. Namespace — combines tables and systems with business logic
public class AppNamespace : NamespaceBase<AppNamespaceResource, AppSystems, AppTablesServices>
{
    public AppNamespace(IWeb3 web3, string contractAddress) : base(web3, contractAddress)
    {
        Systems = new AppSystems(web3, contractAddress);
        Tables = new AppTablesServices(web3, contractAddress);
    }
}
```

Then use the namespace as a single entry point:

```csharp
var app = new AppNamespace(web3, worldAddress);

// Access tables
var player = await app.Tables.Player.GetTableRecordAsync(key);

// Call systems
await app.Systems.Game.MoveRequestAndWaitForReceiptAsync(moveFunction);
```

For a production example of this pattern with 35+ tables and 17+ systems, see [CafeCosmos](https://github.com/CafeCosmosHQ/CafeCosmosDotNet).

## Resource Encoding

MUD identifies tables, systems, and namespaces using 32-byte resource IDs. Nethereum provides `ResourceEncoder` for creating these:

```csharp
using Nethereum.Mud;

// Encode resource IDs
byte[] tableId = ResourceEncoder.EncodeTable("app", "Player");
byte[] systemId = ResourceEncoder.EncodeSystem("app", "GameSystem");
byte[] namespaceId = ResourceEncoder.EncodeNamespace("app");
```

These resource IDs are used internally by table services and Store event processing — you typically don't need to encode them manually unless building custom tooling.

## Common Gotchas

- **Table names are case-sensitive** — `"Player"` and `"player"` are different tables with different resource IDs
- **Singleton tables have no key** — use `TableSingletonService` (generated automatically for `key: []` tables). Don't try to create a key class for them.
- **Generated files are `.gen.cs`** — don't edit them directly; they'll be overwritten on the next code generation run. Use `partial` classes to extend generated types.
- **World address is the contract address** — all table and system services point at the World contract, not individual system contracts. The World routes calls internally.

## Next Steps

- **[Tables and Records](guide-mud-tables)** — deep dive into table records, repositories, predicate queries, local state with change tracking, and multicall batch operations
- **[Indexing Store Events](guide-mud-indexing)** — process Store events into repositories, EF Core and PostgreSQL storage, schema normalisation
- **[Deploy a MUD World](guide-mud-deployment)** — World factory deployment, namespace/table/system registration, access control
