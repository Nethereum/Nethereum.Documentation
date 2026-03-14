---
title: Storage
sidebar_label: Storage
sidebar_position: 3
description: Configure AppChain storage — in-memory for development, RocksDB for production, storage interfaces for custom implementations
---

# Storage

> **PREVIEW** — AppChain packages are in preview. APIs may change between releases.

Every AppChain stores blocks, transactions, receipts, logs, account state, and trie nodes. The storage layer is fully pluggable through CoreChain interfaces — swap between in-memory (fast, ephemeral) and RocksDB (persistent, production-ready) without changing any application code. This guide covers both built-in backends and how the storage interfaces work.

:::tip The Simple Way
```bash
# RocksDB persistent storage (default)
nethereum-appchain --db-path ./chaindata

# In-memory (development, no persistence)
nethereum-appchain --in-memory
```
The CLI handles storage setup automatically. This guide is for when you need programmatic control or want to tune RocksDB performance.
:::

## Prerequisites

```bash
dotnet add package Nethereum.CoreChain           # Storage interfaces + in-memory
dotnet add package Nethereum.CoreChain.RocksDB    # RocksDB backend
```

## Storage Interfaces

CoreChain defines six storage interfaces that every chain implementation uses. Whether you're running a DevChain, AppChain, or building something custom, these are the data access contracts:

| Interface | What It Stores |
|-----------|---------------|
| `IBlockStore` | Block headers by hash and number |
| `ITransactionStore` | Signed transactions with block location |
| `IReceiptStore` | Transaction receipts with gas and status |
| `ILogStore` | Event logs with bloom filter indexing |
| `IStateStore` | Account state, contract storage, bytecode, snapshots |
| `ITrieNodeStore` | Patricia Merkle Trie nodes for state root computation |

Every storage operation is async — both in-memory and RocksDB implementations use `Task`-based APIs so the calling code doesn't need to know which backend is active.

## In-Memory Storage

The in-memory backend stores everything in `ConcurrentDictionary` structures. Data is lost when the process exits — ideal for tests, demos, and short-lived chains:

```csharp
using Nethereum.CoreChain.Storage.InMemory;

var blockStore = new InMemoryBlockStore();
var txStore = new InMemoryTransactionStore(blockStore);
var receiptStore = new InMemoryReceiptStore();
var logStore = new InMemoryLogStore();
var stateStore = new InMemoryStateStore();
var trieNodeStore = new InMemoryTrieNodeStore();
```

Note that `InMemoryTransactionStore` takes a reference to `blockStore` — it needs to look up block hashes when querying transactions by block number.

Wire these into an AppChain:

```csharp
using Nethereum.AppChain;

var config = AppChainConfig.CreateWithName("TestChain", chainId: 420420);
config.SequencerAddress = sequencerAddress;

var appChain = new AppChain(config,
    blockStore, txStore, receiptStore,
    logStore, stateStore, trieNodeStore);

await appChain.InitializeAsync();
```

Or use the builder, which defaults to in-memory:

```csharp
var chain = await new AppChainBuilder("TestChain", 420420)
    .WithOperator(privateKey)
    .BuildAsync();  // In-memory by default
```

## RocksDB Storage

For production AppChains that need data to survive restarts, use RocksDB. The `RocksDbManager` coordinates a single RocksDB instance with multiple column families optimized for blockchain workloads:

```csharp
using Nethereum.CoreChain.RocksDB;
using Nethereum.CoreChain.RocksDB.Stores;

var options = new RocksDbStorageOptions
{
    DatabasePath = "./chaindata"
};

using var manager = new RocksDbManager(options);

var blockStore = new RocksDbBlockStore(manager);
var txStore = new RocksDbTransactionStore(manager, blockStore);
var receiptStore = new RocksDbReceiptStore(manager, blockStore);
var logStore = new RocksDbLogStore(manager);
var stateStore = new RocksDbStateStore(manager);
var trieNodeStore = new RocksDbTrieNodeStore(manager);
```

All RocksDB stores share a single database instance through the manager. This is important — you must use one `RocksDbManager` per database path, and all stores must come from the same manager.

Wire into an AppChain the same way as in-memory:

```csharp
var appChain = new AppChain(config,
    blockStore, txStore, receiptStore,
    logStore, stateStore, trieNodeStore);
```

Or via the builder:

```csharp
var chain = await new AppChainBuilder("MyChain", 420420)
    .WithOperator(privateKey)
    .WithStorage(StorageType.RocksDb, "./chaindata")
    .BuildAsync();
```

### Dependency Injection

For ASP.NET Core or hosted service scenarios, register RocksDB storage via DI:

```csharp
services.AddRocksDbStorage("./chaindata");

// Or with full options
services.AddRocksDbStorage(new RocksDbStorageOptions
{
    DatabasePath = "./chaindata",
    BlockCacheSize = 256 * 1024 * 1024,  // 256MB read cache
    EnableStatistics = true
});
```

This registers all store implementations as singletons, resolving `IBlockStore`, `IStateStore`, etc. from the container.

## Column Families

RocksDB organizes data into column families — each with its own write buffer, bloom filter, and compaction settings. This is why RocksDB outperforms a naive key-value store for blockchain data: block lookups, state queries, and log filters each get optimized independently.

| Column Family | Data | Access Pattern |
|---------------|------|---------------|
| `blocks` | Block headers | Sequential writes, random reads by hash |
| `block_numbers` | Number → hash index | Sequential writes, point lookups |
| `transactions` | Signed transactions | Batch writes per block, random reads by hash |
| `tx_by_block` | Block → transaction index | Batch writes, range scans |
| `receipts` | Transaction receipts | Batch writes per block, random reads |
| `logs` | Event logs | Batch writes, filter scans |
| `log_by_address` | Address → log index | Append-only, filter scans |
| `state_accounts` | Account state (balance, nonce, code hash) | Heavy read/write, point lookups |
| `state_storage` | Contract storage slots | Heavy read/write, point lookups |
| `state_code` | Contract bytecode | Write-once, random reads |
| `trie_nodes` | Patricia trie nodes | Heavy read/write during block production |
| `metadata` | Chain metadata (height, genesis hash) | Rare reads/writes |

## Performance Tuning

The default `RocksDbStorageOptions` work well for most AppChains. For high-throughput scenarios, tune these parameters:

```csharp
var options = new RocksDbStorageOptions
{
    DatabasePath = "./chaindata",

    // Read cache — increase for read-heavy workloads (default: 128MB)
    BlockCacheSize = 256 * 1024 * 1024,

    // Write buffer — increase for write-heavy workloads (default: 64MB)
    WriteBufferSize = 128 * 1024 * 1024,

    // Number of write buffers before flush (default: 3)
    MaxWriteBufferNumber = 4,

    // Background compaction threads (default: 4)
    MaxBackgroundCompactions = 8,

    // Background flush threads (default: 2)
    MaxBackgroundFlushes = 4,

    // Bloom filter bits per key — higher = more memory, faster lookups (default: 10)
    BloomFilterBitsPerKey = 10,

    // Enable RocksDB internal statistics (adds overhead)
    EnableStatistics = false
};
```

**Guidelines:**
- **Read-heavy** (followers serving queries): increase `BlockCacheSize`
- **Write-heavy** (sequencer producing blocks): increase `WriteBufferSize` and `MaxWriteBufferNumber`
- **Many concurrent readers**: increase `MaxBackgroundCompactions` based on CPU cores
- **SSD vs HDD**: SSDs benefit from higher parallelism; HDDs need lower compaction threads to avoid thrashing

## State Snapshots

The state store supports snapshots for EVM execution rollback — this is how block production works internally. The producer takes a snapshot before executing a block, and reverts if execution fails:

```csharp
var stateStore = new RocksDbStateStore(manager);

// Take snapshot before block execution
var snapshotId = await stateStore.TakeSnapshotAsync();

try
{
    // Execute transactions (modifies state)
    // ...

    // Commit on success — snapshot is discarded
}
catch
{
    // Revert on failure — state returns to snapshot point
    await stateStore.RevertToSnapshotAsync(snapshotId);
}
```

You typically don't call this directly — the `BlockProducer` and `TransactionProcessor` in CoreChain handle snapshot management automatically.

## Choosing a Backend

| Criterion | In-Memory | RocksDB |
|-----------|-----------|---------|
| **Persistence** | None — lost on restart | Full — survives restarts |
| **Speed** | Fastest (no I/O) | Fast (optimized column families) |
| **Memory usage** | Grows with chain size | Bounded by cache settings |
| **Use case** | Tests, demos, short-lived chains | Production, long-running chains |
| **CLI flag** | `--in-memory` | `--db-path ./chaindata` (default) |
| **Builder method** | Default | `.WithStorage(StorageType.RocksDb, path)` |

For development, start with in-memory and switch to RocksDB when you need persistence. The storage interfaces guarantee your application code doesn't change.

## Common Gotchas

- **One manager per path** — don't create multiple `RocksDbManager` instances pointing at the same directory. RocksDB locks the database file; the second instance will fail.
- **Dispose the manager** — `RocksDbManager` implements `IDisposable`. Use `using` or dispose it in your shutdown logic. Not disposing can corrupt the database.
- **RocksDB native libraries** — the `Nethereum.CoreChain.RocksDB` NuGet package includes native RocksDB binaries. On Linux, you may need `librocksdb` installed separately depending on your distribution.
- **Disk space** — a busy AppChain can grow the database quickly. Monitor disk usage and consider pruning strategies for long-running chains.

## Next Steps

- **[AppChain Quickstart](guide-appchain-quickstart)** — launch a sequencer and follower with the CLI
- **[Syncing Follower Nodes](guide-appchain-sync)** — how followers sync and verify chain state using these storage backends
