---
title: MUD Quickstart
sidebar_label: MUD Quickstart
sidebar_position: 2
description: Understand MUD as an enhanced diamond pattern — systems as smart contracts, typed tables, namespaces as unified contexts, and code generation
---

# MUD Quickstart

MUD is an enhanced version of the [EIP-2535 Diamond pattern](https://eips.ethereum.org/EIPS/eip-2535) for building complex smart contract applications. A **World** contract acts as a diamond proxy — routing calls to **system** contracts via delegatecall, with all state stored in typed **tables**. **Namespaces** group systems and tables together, giving you a unified context for your entire application — similar to how `web3.Eth` organises all Ethereum operations under one entry point.

This guide covers the architecture, code generation workflow, and how to use the generated services.

:::tip The Simple Way
```csharp
var app = new AppNamespace(web3, worldAddress);

// Call a system (smart contract routed through World)
await app.Systems.Game.MoveRequestAndWaitForReceiptAsync(new MoveFunction { X = 10, Y = 20 });

// Read a table
var player = await app.Tables.Player.GetTableRecordAsync(new PlayerKey { Address = addr });
```
Systems, tables, gas, nonce, World routing — all handled through the namespace.
:::

## The Architecture

### World = Enhanced Diamond

In a standard Diamond (EIP-2535), you manually manage facets and storage slots. MUD automates this:

- The **World contract** is the diamond — it routes all calls and holds all storage
- **Systems** are the facets — smart contracts that execute via delegatecall within the World's context
- **Tables** replace raw storage — typed schemas registered on-chain, with every mutation emitting a Store event
- **Namespaces** replace manual facet management — they group related systems and tables with shared access control

When you call a system through the World, the World looks up the system's address from its resource ID and delegatecalls it. The system executes in the World's storage context, so it can read and write any table in its namespace.

### Systems Are Smart Contracts

This is a critical point: **systems are regular smart contracts**. They're written in Solidity, compiled with Forge, and have ABIs like any other contract. Nethereum generates typed C# service classes from their ABIs — the same `FunctionMessage`, `RequestAsync`, and `RequestAndWaitForReceiptAsync` patterns you use for any contract.

The difference is that systems are **registered with the World** and called through it. Instead of calling the system contract directly, you call `World.call(systemId, callData)` — the World delegatecalls the system, which executes with access to the World's storage (tables).

In Nethereum, this routing is transparent. The generated system services handle the wrapping automatically — you call methods on the service, and it routes through the World:

```csharp
// This looks like a normal contract call, but it routes through the World
await gameSystemService.MoveRequestAndWaitForReceiptAsync(
    new MoveFunction { X = 10, Y = 20 });
```

### Tables Are Typed Storage

Tables replace Solidity's raw `mapping` and `struct` storage with a structured, schema-aware data layer. Each table has:

- **Keys** — the lookup index (like a primary key in a database)
- **Values** — the stored data fields
- **Schema** — registered on-chain, so indexers can decode any table's data

Every table mutation emits a Store event (`Store_SetRecord`, `Store_SpliceStaticData`, `Store_SpliceDynamicData`, `Store_DeleteRecord`), which means the entire state history is available in event logs — you can rebuild the full state from genesis at any time.

### Namespaces = Unified Context

A namespace groups systems and tables into a single access-controlled unit. In Nethereum, the `NamespaceBase` class composes all generated services:

```csharp
// The namespace is your application's entry point
var app = new AppNamespace(web3, worldAddress);

// Access systems (smart contracts)
app.Systems.Crafting.CraftItemRequestAndWaitForReceiptAsync(...);
app.Systems.Trade.ListItemRequestAndWaitForReceiptAsync(...);

// Access tables (typed storage)
app.Tables.Player.GetTableRecordAsync(key);
app.Tables.Inventory.GetTableRecordAsync(key);

// Business logic combining both
app.GetPlayerInventoryAsync(playerId);
```

This mirrors the `web3.Eth` pattern — one object, organised access to everything, IntelliSense-discoverable.

## Prerequisites

```bash
dotnet add package Nethereum.Mud
dotnet add package Nethereum.Mud.Contracts
```

For code generation, install the .NET CLI tool:

```bash
dotnet tool install -g Nethereum.Generator.Console
```

You'll also need a MUD project with tables and systems defined at [mud.dev](https://mud.dev) and contracts compiled with Forge.

## Define Tables in Solidity

Tables are defined in `mud.config.ts` using the `defineWorld()` function — this is standard MUD, see [mud.dev](https://mud.dev). Here's a minimal example:

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
      key: [],  // singleton table — one record, no key
    },
  },
});
```

- Fields in `key` become lookup keys; the rest become values
- `key: []` creates a singleton table (one record, no key needed)
- Solidity types (`uint256`, `address`, `string`, `bool`, `bytes32`, `string[]`) map automatically to C# types

Systems are regular Solidity contracts — write them as you would any smart contract, then register them with the World.

## Code Generation

Nethereum generates two kinds of C# services from your MUD project:

- **`MudTables`** — parses `mud.config.ts` and generates `TableRecord` + `TableService` classes for each table
- **`MudExtendedService`** — parses compiled system ABIs and generates system service classes (like standard contract services, but with MUD namespace/resource configuration)

Configure code generation in `.nethereum-gen.multisettings`:

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
    "paths": ["path/to/compiled/GameSystem.json"],
    "generatorConfigs": [
      {
        "baseNamespace": "MyProject.Contracts",
        "basePath": "Generated/Systems",
        "codeGenLang": 0,
        "generatorType": "MudExtendedService",
        "mudNamespace": "app"
      }
    ]
  }
]
```

Run the generator using one of three methods:

- **VS Code**: Install the [Nethereum Solidity extension](https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity), right-click `.nethereum-gen.multisettings` → "Generate Nethereum code"
- **.NET CLI**: `Nethereum.Generator.Console generate from-config --config path/to/.nethereum-gen.multisettings`
- **Node.js**: Use the JavaScript generator package for Node.js build pipelines

## Generated Table Services

For each table, the generator produces a `TableRecord` with key/value inner classes and a `TableService` with typed CRUD methods:

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

// Generated: PlayerTableService.gen.cs
public partial class PlayerTableService : TableService<PlayerTableRecord, PlayerTableRecord.PlayerKey, PlayerTableRecord.PlayerValue>
{
    public PlayerTableService(IWeb3 web3, string contractAddress) : base(web3, contractAddress) { }
    // GetTableRecordAsync, SetRecordRequestAsync, DeleteRecordRequestAsync, etc.
}
```

Singleton tables (`key: []`) generate `TableSingletonService` — no key parameter needed.

## Generated System Services

For each system contract, `MudExtendedService` generates a service class that extends the standard Nethereum contract service with MUD resource configuration:

```csharp
// Generated: GameSystemServiceMudExt.gen.cs
public partial class GameSystemService : ContractWeb3ServiceBase, ISystemService<GameSystemResource>
{
    public GameSystemService(IWeb3 web3, string contractAddress) : base(web3, contractAddress) { }

    // Same patterns as any Nethereum contract service:
    public Task<TransactionReceipt> MoveRequestAndWaitForReceiptAsync(MoveFunction moveFunction, ...);
    public Task<string> AttackRequestAsync(AttackFunction attackFunction);

    // Plus MUD-specific:
    public IResource Resource { get; }  // The system's resource ID
    public Task<Create2ContractDeploymentTransactionReceiptResult> DeployCreate2ContractAndWaitForReceiptAsync(...);
}
```

The generated service implements `ISystemService<TSystemResource>` — this interface provides CREATE2 deployment, resource encoding, and function ABI metadata that the namespace uses for batch registration.

## Build the Namespace

With generated table and system services, compose them into the namespace pattern:

```csharp
// Aggregate all table services
public class AppTables : TablesServices
{
    public PlayerTableService Player { get; private set; }
    public GameConfigTableSingletonService GameConfig { get; private set; }

    public AppTables(IWeb3 web3, string contractAddress) : base(web3, contractAddress)
    {
        Player = new PlayerTableService(web3, contractAddress);
        GameConfig = new GameConfigTableSingletonService(web3, contractAddress);
    }
}

// Aggregate all system services
public class AppSystems : SystemsServices
{
    public GameSystemService Game { get; private set; }
    public TradeSystemService Trade { get; private set; }

    public AppSystems(IWeb3 web3, string contractAddress) : base(web3, contractAddress)
    {
        Game = new GameSystemService(web3, contractAddress);
        Trade = new TradeSystemService(web3, contractAddress);
    }
}

// The namespace — unified entry point
public class AppNamespace : NamespaceBase<AppNamespaceResource, AppSystems, AppTables>
{
    public AppNamespace(IWeb3 web3, string contractAddress) : base(web3, contractAddress)
    {
        Systems = new AppSystems(web3, contractAddress);
        Tables = new AppTables(web3, contractAddress);
    }

    // Business logic methods that combine system calls and table reads
    public async Task<PlayerTableRecord> GetPlayerWithScoreAsync(string address)
    {
        var player = await Tables.Player.GetTableRecordAsync(
            new PlayerTableRecord.PlayerKey { Address = address });
        return player;
    }
}
```

`TablesServices` provides batch registration (`BatchRegisterAllTablesRequestAndWaitForReceiptAsync`). `SystemsServices` provides CREATE2 deployment (`DeployAllCreate2ContractSystemsRequestAndWaitForReceiptAsync`) and batch registration (`BatchRegisterAllSystemsRequestAndWaitForReceiptAsync`).

## Use the Namespace

```csharp
var app = new AppNamespace(web3, worldAddress);

// Read tables
var player = await app.Tables.Player.GetTableRecordAsync(
    new PlayerTableRecord.PlayerKey { Address = playerAddress });
Console.WriteLine($"{player.Name}: {player.Score}");

// Call systems
var receipt = await app.Systems.Game.MoveRequestAndWaitForReceiptAsync(
    new MoveFunction { X = 10, Y = 20 });

// Batch read via multicall
var keys = new List<PlayerTableRecord.PlayerKey> { key1, key2, key3 };
var players = await app.Tables.Player.GetTableRecordsMulticallRpcAsync(keys);

// Singleton tables — no key needed
var config = await app.Tables.GameConfig.GetTableRecordAsync();
```

## System Delegation

The World supports delegated calls — calling a system on behalf of another account. The `MudCallFromContractHandler` handles this transparently:

```csharp
// Enable delegation — all subsequent system calls route through World.callFrom()
app.Systems.Game.SetSystemCallFromDelegatorContractHandler(delegatorAddress);

// This now calls World.callFrom(delegator, systemId, callData) instead of World.call()
await app.Systems.Game.MoveRequestAndWaitForReceiptAsync(moveFunction);
```

## Resource Encoding

MUD identifies tables, systems, and namespaces using 32-byte resource IDs. `ResourceEncoder` provides encoding:

```csharp
byte[] tableId = ResourceEncoder.EncodeTable("app", "Player");
byte[] systemId = ResourceEncoder.EncodeSystem("app", "GameSystem");
byte[] namespaceId = ResourceEncoder.EncodeNamespace("app");
```

These resource IDs are used internally by the World for routing and access control — you typically don't encode them manually unless building custom tooling.

## Common Gotchas

- **Systems are called through the World** — don't call system contracts directly. The generated services handle routing, but if you're debugging, remember that `World.call(systemId, callData)` is what's actually sent.
- **Generated files are `.gen.cs`** — don't edit them; use `partial` classes to extend. They'll be overwritten on next code generation.
- **World address is the contract address** — all table and system services point at the World, not individual system contracts.
- **Table names are case-sensitive** — `"Player"` and `"player"` produce different resource IDs.
- **Singleton tables have no key** — `key: []` in `mud.config.ts` generates `TableSingletonService`, not `TableService`.

## Next Steps

- **[Tables and Records](guide-mud-tables)** — deep dive into table records, repositories, predicate queries, REST API client, change tracking, and multicall batch operations
- **[Indexing Store Events](guide-mud-indexing)** — process Store events into repositories, continuous sync, EF Core and PostgreSQL storage, schema normalisation, query service
- **[Deploy a MUD World](guide-mud-deployment)** — World factory, CREATE2 system deployment, batch table/system registration, namespace access control
