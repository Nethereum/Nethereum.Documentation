---
title: Custom Storage Backends
sidebar_label: Custom Storage
sidebar_position: 3
description: Implement custom storage backends or use RocksDB for persistent blockchain data
---

# Custom Storage Backends

CoreChain separates storage from execution through a set of pluggable interfaces. Every piece of blockchain data — blocks, transactions, receipts, logs, account state, and trie nodes — goes through an interface that you can implement with any backing store.

Three implementations ship with Nethereum: **in-memory** (built into CoreChain), **SQLite** (in DevChain), and **RocksDB** (in `Nethereum.CoreChain.RocksDB`). You can implement your own for PostgreSQL, Redis, cloud storage, or any other backend.

## Prerequisites

```bash
dotnet add package Nethereum.CoreChain            # Core interfaces + in-memory implementations
dotnet add package Nethereum.CoreChain.RocksDB     # RocksDB persistent storage (optional)
```

## Storage Interfaces

CoreChain defines seven storage interfaces:

| Interface | What It Stores | Key Operations |
|-----------|---------------|----------------|
| `IBlockStore` | Block headers | Get by hash/number, save, get latest, get height |
| `ITransactionStore` | Signed transactions | Get by hash/block, save with location, get hashes by block |
| `IReceiptStore` | Transaction receipts | Get by tx hash/block, save with gas/contract info |
| `ILogStore` | Event logs | Save with bloom, query by filter/address/block |
| `IStateStore` | Account state, storage slots, code | Get/save account, storage, code; snapshots |
| `IFilterStore` | Active log/block filters | Create, update, remove filters |
| `ITrieNodeStore` | Patricia trie nodes | Get/save nodes by hash |

### IBlockStore

```csharp
public interface IBlockStore
{
    Task<BlockHeader> GetByHashAsync(byte[] hash);
    Task<BlockHeader> GetByNumberAsync(BigInteger number);
    Task<BlockHeader> GetLatestAsync();
    Task<BigInteger> GetHeightAsync();
    Task SaveAsync(BlockHeader header, byte[] blockHash);
    Task<bool> ExistsAsync(byte[] hash);
    Task<byte[]> GetHashByNumberAsync(BigInteger number);
    Task UpdateBlockHashAsync(BigInteger blockNumber, byte[] newHash);
    Task DeleteByNumberAsync(BigInteger blockNumber);
}
```

### IStateStore

The state store is the most complex — it manages account state, contract storage slots, contract bytecode, and supports snapshots for EVM execution rollback:

```csharp
public interface IStateStore
{
    // Account state
    Task<AccountState> GetAccountAsync(string address);
    Task SaveAccountAsync(string address, AccountState state);
    Task<List<string>> GetAllAccountsAsync();

    // Storage slots
    Task<byte[]> GetStorageAsync(string address, byte[] key);
    Task SaveStorageAsync(string address, byte[] key, byte[] value);

    // Code
    Task<byte[]> GetCodeByHashAsync(byte[] codeHash);
    Task SaveCodeAsync(byte[] codeHash, byte[] code);

    // Snapshots (for EVM execution rollback)
    Task<int> TakeSnapshotAsync();
    Task RevertToSnapshotAsync(int snapshotId);
}
```

Snapshots are critical for EVM execution — the EVM takes a snapshot before each call, and reverts if the call fails. Your implementation must support nested snapshots.

## Using RocksDB for Persistence

For production-grade persistent storage, use the RocksDB backend:

```csharp
using Nethereum.CoreChain.RocksDB;

// Via dependency injection
services.AddRocksDbStorage("./chaindata");

// Or with options
services.AddRocksDbStorage(new RocksDbStorageOptions
{
    DatabasePath = "./chaindata",
    BlockCacheSize = 256 * 1024 * 1024,  // 256MB read cache
    WriteBufferSize = 64 * 1024 * 1024,  // 64MB write buffer
    EnableStatistics = true
});
```

Or create stores directly:

```csharp
using Nethereum.CoreChain.RocksDB;
using Nethereum.CoreChain.RocksDB.Stores;

var options = new RocksDbStorageOptions { DatabasePath = "./chaindata" };
using var manager = new RocksDbManager(options);

var blockStore = new RocksDbBlockStore(manager);
var stateStore = new RocksDbStateStore(manager);
var trieStore = new RocksDbTrieNodeStore(manager);
// ... other stores
```

RocksDB organizes data into column families (blocks, transactions, state_accounts, state_storage, etc.) for optimal read/write performance.

### RocksDB State Snapshots

The RocksDB state store supports transactional snapshots:

```csharp
var stateStore = new RocksDbStateStore(manager);

var snapshot = await stateStore.CreateSnapshotAsync();
try
{
    snapshot.SetAccount(address, account);
    snapshot.SetStorage(address, slot, value);

    await stateStore.CommitSnapshotAsync(snapshot);
}
catch
{
    await stateStore.RevertSnapshotAsync(snapshot);
}
finally
{
    snapshot.Dispose();
}
```

## Implementing a Custom Backend

To implement your own storage, create classes that implement the storage interfaces. Here's a skeleton for a custom block store:

```csharp
using Nethereum.CoreChain.Storage;
using Nethereum.Model;

public class MyCustomBlockStore : IBlockStore
{
    public Task<BlockHeader> GetByHashAsync(byte[] hash)
    {
        // Look up block header by hash in your database
    }

    public Task<BlockHeader> GetByNumberAsync(BigInteger number)
    {
        // Look up block header by number
    }

    public Task<BlockHeader> GetLatestAsync()
    {
        // Return the most recent block header
    }

    public Task<BigInteger> GetHeightAsync()
    {
        // Return the latest block number
    }

    public Task SaveAsync(BlockHeader header, byte[] blockHash)
    {
        // Persist the block header
    }

    // ... implement remaining methods
}
```

The key consideration for custom implementations is **atomicity** — block production writes to multiple stores (blocks, transactions, receipts, logs, state) and all writes should succeed or fail together. RocksDB achieves this with `WriteBatch`; for SQL databases, use a transaction.

## Performance Tips

- **Block cache**: Increase `BlockCacheSize` in RocksDB for read-heavy workloads (explorer, indexing)
- **Write buffer**: Increase `WriteBufferSize` for write-heavy workloads (fast block production)
- **State snapshots**: The EVM creates many snapshots during execution — make `TakeSnapshotAsync` and `RevertToSnapshotAsync` as fast as possible
- **Bloom filters**: RocksDB enables bloom filters by default for fast key existence checks

## Next Steps

- [Custom Chain Node](guide-custom-chain-node) — build a complete chain node using your storage backend
- [Custom RPC Handlers](guide-custom-rpc-handlers) — add custom JSON-RPC methods
- For RocksDB configuration details, see the [Nethereum.CoreChain.RocksDB package reference](nethereum-corechain-rocksdb)
