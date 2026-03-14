---
title: Syncing Follower Nodes
sidebar_label: Syncing
sidebar_position: 4
description: Sync AppChain follower nodes — multi-peer live polling, batch import, state re-execution, finality tracking
---

# Syncing Follower Nodes

> **PREVIEW** — AppChain packages are in preview. APIs may change between releases.

A core promise of the AppChain model is that state is synchronisable by anyone. Follower nodes catch up with the sequencer and maintain a verified copy of the chain state, with every block re-executed and every state root validated. This guide covers multi-peer live sync, batch import for historical catch-up, state validation, and finality tracking.

:::tip The Simple Way
```bash
nethereum-appchain \
  --chain-id 420420 \
  --genesis-owner-address $ADDR \
  --sync-peers http://sequencer:8546 \
  --sync-poll-interval 100
```
The CLI handles sync automatically — connects to peers, polls for new blocks, validates state. This guide is for when you need programmatic sync control.
:::

## Prerequisites

```bash
dotnet add package Nethereum.AppChain.Sync
```

You need a running sequencer to sync from. See the [AppChain Quickstart](guide-appchain-quickstart) for launching one.

## Two-Phase Synchronization

AppChain sync uses a two-phase strategy:

1. **Batch Sync** (historical catch-up): Download pre-packaged block batches from the sequencer. Batches are verified against their content hash and imported into local storage. This is the fast path for catching up with a chain that has been running for a while.

2. **Live Sync** (chain head following): Poll peers for new blocks as they're produced. The `MultiPeerSyncService` follows the chain head with configurable intervals and automatic peer switching on failures.

For a new follower joining a chain with 10,000 blocks of history, batch sync imports the historical blocks quickly, then live sync takes over to follow the chain head in real-time.

## Live Sync

`MultiPeerSyncService` is the primary sync mechanism — it polls connected peers for new blocks and imports them into local storage:

```csharp
using Nethereum.AppChain.Sync;

var peerManager = new PeerManager(new PeerManagerConfig());
peerManager.AddPeer("http://sequencer:8546");

var syncConfig = new MultiPeerSyncConfig
{
    PollIntervalMs = 100,
    AutoFollow = true,
    RejectOnStateRootMismatch = true
};

var syncService = new MultiPeerSyncService(syncConfig,
    blockStore, txStore, receiptStore, logStore,
    finalityTracker, peerManager, blockReExecutor);

await syncService.StartAsync();
```

Setting `RejectOnStateRootMismatch = true` means the sync service will reject blocks whose state root doesn't match the locally re-executed state — this is how followers independently verify the sequencer's execution.

### Sync Events

The sync service emits events for monitoring:

```csharp
syncService.BlockImported += (sender, args) =>
{
    Console.WriteLine($"Block {args.Header.BlockNumber} imported, " +
                      $"local tip: {syncService.LocalTip}, " +
                      $"remote tip: {syncService.RemoteTip}");
};

syncService.Error += (sender, args) =>
{
    Console.WriteLine($"Sync error: {args.Message}");
};
```

`LocalTip` and `RemoteTip` tell you how far behind the follower is. When they're equal, the follower is fully caught up.

### Sync to a Specific Block

For scenarios where you need to sync to a known block (e.g., before querying state at that point):

```csharp
// Sync until block 1000 is imported
await syncService.SyncToBlockAsync(1000);

// Or sync to the current chain head
await syncService.SyncToLatestAsync();
```

## Multi-Peer Management

`PeerManager` maintains a health-checked pool of sync peers. It tracks each peer's block height, latency, and failure count, automatically selecting the best peer for sync requests:

```csharp
var peerManager = new PeerManager(new PeerManagerConfig
{
    HealthCheckIntervalMs = 5000,
    HealthCheckTimeoutMs = 3000,
    MaxFailuresBeforeRemoval = 5
});

// Add multiple peers for redundancy
peerManager.AddPeer("http://node1:8546");
peerManager.AddPeer("http://node2:8546");
peerManager.AddPeer("http://node3:8546");

peerManager.PeerStatusChanged += (sender, args) =>
{
    Console.WriteLine($"Peer {args.Url}: healthy={args.IsHealthy}");
};

await peerManager.StartHealthCheckAsync();
```

The health checker periodically pings each peer, checks its block height, and marks unhealthy peers for removal. When the current sync peer fails, `MultiPeerSyncService` automatically switches to the next best peer.

To get the current best peer (highest block, lowest latency):

```csharp
var bestPeer = peerManager.GetBestPeer();
var healthyClient = await peerManager.GetHealthyClientAsync();
```

## Batch Import

For historical catch-up, batch files contain compressed blocks that can be imported in bulk. The sequencer can produce batch files (via `SequencerBatchProducer`), and followers import them:

```csharp
using Nethereum.AppChain.Sync;

var importer = new BatchImporter(blockStore, txStore, receiptStore, logStore);

var result = await importer.ImportBatchAsync(
    batchStream,
    expectedHash: batchHash,
    verificationMode: BatchVerificationMode.Full,
    cancellationToken: ct);

Console.WriteLine($"Imported {result.BlockCount} blocks, " +
                  $"{result.TransactionCount} transactions");
```

`BatchVerificationMode.Full` verifies the content hash of the batch data before importing — ensuring the batch hasn't been tampered with.

## State Re-Execution

By default, followers store blocks as received from the sequencer. To independently verify the sequencer's execution, enable state re-execution with `BlockReExecutor`:

```csharp
using Nethereum.AppChain.Sync;

var reExecutor = new BlockReExecutor(
    transactionProcessor, stateStore, chainConfig, logger);
```

When passed to `MultiPeerSyncService`, the re-executor processes every imported block's transactions through the local EVM and compares the resulting state root against the block header. If they don't match and `RejectOnStateRootMismatch` is enabled, the block is rejected.

This is the mechanism that makes AppChain state independently verifiable — any follower can prove that the sequencer executed transactions correctly by re-running them locally.

## Coordinated Two-Phase Sync

`CoordinatedSyncService` orchestrates the batch → live transition automatically:

```csharp
var coordinated = new CoordinatedSyncService(
    new CoordinatedSyncConfig { AutoStart = true },
    batchSyncService, liveSyncService,
    finalityTracker, anchorService, batchStore);

coordinated.SyncProgressChanged += (sender, args) =>
{
    Console.WriteLine($"Phase: {args.Phase}, Block: {args.BlockNumber}");
    // Phase transitions: BatchSync → LiveSync
};

await coordinated.StartAsync();
```

The coordinator starts with batch sync to catch up on historical blocks, then seamlessly transitions to live sync once the batch phase is complete.

## Finality Tracking

AppChain blocks have two finality levels:

- **Soft** — recently synced from peers, potentially subject to reorgs
- **Finalized** — anchored to L1, cryptographically immutable

The `IFinalityTracker` manages these states:

```csharp
// Check if a block is finalized (L1-anchored)
bool isFinal = await finalityTracker.IsFinalizedAsync(blockNumber);

// Check if a block is soft (synced but not anchored)
bool isSoft = await finalityTracker.IsSoftAsync(blockNumber);

// Get the latest finalized block
long latestFinal = await finalityTracker.GetLatestFinalizedBlockAsync();
```

For applications that need strong guarantees (e.g., asset transfers), wait for finalization. For applications where speed matters more than finality (e.g., game state), soft confirmation is sufficient.

## Common Gotchas

- **Same genesis required** — the follower must use the same `--genesis-owner-address` and `--chain-id` as the sequencer. Different genesis parameters produce a different genesis block, and the sync will fail immediately.
- **State re-execution needs storage** — `BlockReExecutor` rebuilds the state trie locally. With in-memory storage, this means the follower must re-execute every block since genesis on every restart. For long-running chains, use RocksDB (see [Storage guide](guide-appchain-storage)).
- **Poll interval trade-off** — lower `PollIntervalMs` means faster sync but more RPC calls to the sequencer. For production, 1000ms (the default) is usually fine. For testing, 100ms gives near-instant sync.
- **Peer removal** — `MaxFailuresBeforeRemoval` controls when a peer is dropped from the pool. Set this higher for unreliable networks, lower for fast failover.

## Next Steps

- **[Storage](guide-appchain-storage)** — configure RocksDB for persistent follower storage
- **[AppChain Quickstart](guide-appchain-quickstart)** — launch the sequencer that followers sync from
