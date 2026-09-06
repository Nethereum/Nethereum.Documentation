---
title: "Nethereum.DevP2P.Sync"
sidebar_label: "Nethereum.DevP2P.Sync"
sidebar_position: 100
description: "The block and state sync engine for a Nethereum node syncing Ethereum over `eth/68`–`eth/71` and `snap/1`."
custom_edit_url: "https://github.com/Nethereum/Nethereum/edit/master/src/Nethereum.DevP2P.Sync/README.md"
format: md
---

# Nethereum.DevP2P.Sync

> **NuGet**: [`Nethereum.DevP2P.Sync`](https://www.nuget.org/packages/Nethereum.DevP2P.Sync/) | **Source**: [`src/Nethereum.DevP2P.Sync/`](https://github.com/Nethereum/Nethereum/tree/master/src/Nethereum.DevP2P.Sync)
# Nethereum.DevP2P.Sync

The block and state sync engine for a Nethereum node syncing Ethereum over `eth/68`–`eth/71` and `snap/1`.

## Overview

Nethereum.DevP2P.Sync cold-starts and keeps a node in sync with the Ethereum devp2p network. It implements a **snap-first** sync in three phases, every one of which verifies what it fetches against cryptographic commitments so a peer cannot poison the local database:

- **Phase 1 — block archive backfill.** Download headers, bodies (transactions + uncles), and receipts for `[genesis..pivot]`. Bodies and receipts are content-addressed against the header's `TransactionsHash` / `UnclesHash` / `ReceiptHash`, and the parent-hash chain is validated within and across batches.
- **Phase 2 — snap state stream.** Stream the full account, storage, and bytecode state at a pivot block via snap range requests, verifying every range against a Merkle-Patricia proof and comparing the assembled trie root to the pivot's state root.
- **Phase 3 — heal.** Walk the reconstructed trie and re-fetch any missing nodes (and bytecode) until the computed root matches the target, following the pivot as the head advances.

The engine is chain-agnostic: it drives Ethereum mainnet (via [Nethereum.MainnetChain](../mainnet-follower/nethereum-mainnetchain)) and Nethereum AppChains through the same orchestrator, differing only in the injected fork activations and canonical-tip source.

Typical uses:

- **Cold-start a node from snapshot state** instead of replaying the entire chain.
- **Backfill a full block + receipt archive** behind a snap-synced head.
- **Follow a rolling pivot** so state stays fresh while syncing a large chain.

## Installation

```bash
dotnet add package Nethereum.DevP2P.Sync
```

### Dependencies

**Nethereum packages (direct):** `Nethereum.DevP2P` (peer networking), `Nethereum.CoreChain` (stores, state, snap-sync state model), `Nethereum.Model`, `Nethereum.RLP`, `Nethereum.Util`, `Nethereum.Hex`, `Nethereum.Documentation` (doc-example tagging). Proof verification (`Nethereum.Merkle.Patricia`) and `Microsoft.Extensions.Logging.Abstractions` arrive transitively, not as direct references. Targets `net8.0`, `net9.0`, `net10.0`.

## Architecture

```
SyncNode                             the "start here" facade — one object: serve state + snap-bootstrap
   └─ SnapSyncOrchestrator           anchor pivot, retry/backoff, follow rolling pivot
        └─ SnapBootstrapper          sequence one pivot: skip-if-synced -> Phase 2 -> heal-on-mismatch -> commit
             ├─ ParallelBlockBackfiller   Phase 1: header + body + receipt + persist stages over a BlockTaskQueue
             │     └─ BackwardBlockWalker  (skeleton mode) lay headers backward from a trusted tip
             ├─ SnapSyncClient            Phase 2: parallel account/storage/bytecode leaf stream -> ISnapSyncSink
             └─ TrieHealer                Phase 3: BFS re-fetch of missing trie nodes until root matches
```

`SyncNode` is the discoverable top-level entry point — construct it once and reach every sync capability from it. Under it, `SnapSyncOrchestrator` and `SnapBootstrapper` remain usable directly for advanced control, and the phase workers can be driven on their own (e.g. Phase 1 only). `SnapBootstrapper` and its partials live under `Snap/Bootstrap/`.

## Public entry points

**`SyncNode`** — the single discoverable entry point, in the spirit of `Nethereum.Web3.Web3`. Construct it once from the chain's storage bundle, activations and peering resources, then reach every sync capability from this one object. The underlying drivers remain available for advanced use; a consumer normally only needs this facade:

```csharp
public sealed class SyncNode
{
    public IPeerPool Peers { get; }                    // dial-out / inbound pool (null if not configured)
    public IFetchRequestScheduler Scheduler { get; }   // fans fetch requests across peers (null if not configured)
    public PeerListener Serving { get; }               // inbound listener; serves eth + snap (null if not serving)
    public RelayMempool Mempool { get; }               // good-citizen relay tx pool (null if not relaying)

    public SyncNode(
        IChainStoreBundle bundle, IChainActivations activations, ILogger logger,
        IPeerPool peers = null, IFetchRequestScheduler scheduler = null, PeerListener serving = null,
        RelayMempool mempool = null);

    public Task StartServingAsync(CancellationToken ct = default);   // bind the listener; no-op if not serving
    public Task<SnapBootstrapper.Result> RunSnapBootstrapAsync(      // cold-start state; delegates to the orchestrator
        ICanonicalStateRootSource canonicalTip, SnapSyncOrchestratorOptions options = null,
        CancellationToken ct = default);
}
```

**`SnapSyncOrchestrator`** (static) — top-level driver, and what `SyncNode.RunSnapBootstrapAsync` delegates to. Anchors the pivot from the injected canonical tip, runs the bootstrapper, and follows a rolling pivot with backoff:

```csharp
Task<SnapBootstrapper.Result> RunAsync(
    IChainStoreBundle bundle, IPeerPool? pool, IFetchRequestScheduler? scheduler,
    ICanonicalStateRootSource canonicalTip, IChainActivations activations, ILogger logger,
    SnapSyncOrchestratorOptions options = null, CancellationToken ct = default);
```

Optional mode/tuning lives on `SnapSyncOrchestratorOptions` (`UseBackwardSkeleton`, `Metrics`, `RootRefreshIntervalMs`, `HeaderSweepOverride`, `BackfillOnly`, `Phase1First`, `HeaderFollow`).

**`SnapBootstrapper`** (static) — sequences the cold-start for a single pivot: skip if state is already committed, run the Phase-2 stream, heal on root mismatch, persist the pivot and completion sentinel. It also exposes pure, unit-tested decision helpers:

- `SnapResumeMode DecideResumeMode(SnapPhase savedPhase, bool healTargetValid, bool pivotMoved)`
- `bool ShouldMarkPhase2Entry(bool skipPhase2, bool backfillOnly)`

Cold-starts a single pivot: the required inputs are direct parameters; all optional collaborators, mode selection and tuning live on `SnapRunOptions`:

```csharp
Task<SnapBootstrapper.Result> RunAsync(
    IChainStoreBundle bundle, ISnapPeer peer, BlockHeader pivot, byte[] pivotHash, ILogger logger,
    SnapRunOptions options = null, CancellationToken ct = default);
```

**`SnapSyncClient`** — the Phase-2 leaf-stream fetcher. Pulls account ranges with `AccountConcurrency` (16) partitioned workers, per-account storage, and bytecodes from an `ISnapPeer` into an `ISnapSyncSink`, verifying proofs and comparing the assembled root to target:

```csharp
Task<SyncResult> SyncStateAsync(byte[] targetRoot, CancellationToken ct = default);
Task<SyncResult> SyncStateAsync(byte[] targetRoot, SnapSyncState resumeFrom,
                                Action<SnapSyncState> checkpointSink, CancellationToken ct = default);
// The checkpointing entry the resumable overload delegates to (checkpoints a SnapSyncCheckpoint):
Task<SyncResult> SyncStateWithCheckpointAsync(byte[] targetRoot, SnapSyncState resumeFrom,
                                Action<SnapSyncCheckpoint> checkpointSink, CancellationToken ct = default);
```

A `SnapRootMismatchException` signals that heal is required.

**`TrieHealer`** — Phase 3. BFS-walks the in-storage trie under a target root, re-fetching missing hash-referenced nodes (and missing bytecode), and re-roots on staleness as the pivot advances:

```csharp
Task<HealResult> HealAsync(byte[] targetRoot,
    IReadOnlyList<(byte[] AccountHash, byte[] StorageRoot)> seedStorageHeal = null,
    IReadOnlyList<byte[]> seedCodeHeal = null,
    ulong pivotBlock = 0, bool wipeSeedsFirst = false, CancellationToken ct = default);
```

**`ParallelBlockBackfiller`** — Phase 1. Runs a concurrent pipeline (header producer/loader, body fetcher, receipt fetcher, persistence drain) over a shared `BlockTaskQueue`:

```csharp
Task<BackfillResult> BackfillAsync(ulong startBlock, ulong endBlock, CancellationToken ct);
Task<BackfillResult> BackfillAsync(ulong startBlock, ulong endBlock, bool headersFromStore, CancellationToken ct);
```

**`BlockTaskQueue`** — the producer/consumer work queue behind Phase 1: content-addressed body/receipt matching, a per-peer in-flight reservation gate, and a strict cursor-ordered persist drain. Constructed with `maxInFlightPerPeer` (default 1; the backfiller uses 4).

**`BackwardBlockWalker`** — walks the chain backward from a trusted-tip hash anchor, validating parent-hash chains and persisting a header skeleton (optionally bodies).

Concrete infrastructure impls are also provided: `FetchRequestScheduler` (`IFetchRequestScheduler`), `PeerRequestWorker` (`IPeerRequestWorker`), `PeerPoolManager` (`IPeerPool`), `SchedulerSnapPeer` / `Eth68SnapPeer` (`ISnapPeer`), and `TrieSnapSyncSink` / `InMemorySnapSyncSink` (`ISnapSyncSink`).

## Key types

### Core abstractions & resume model

| Type | Role |
|---|---|
| `SnapPhase` (`NotStarted`/`Phase2Running`/`Phase3Running`/`Complete`) | Persisted phase in `SnapSyncState`; drives resume. *Defined in Nethereum.CoreChain.* |
| `SnapResumeMode` (`Fresh`/`Phase2`/`Phase3Heal`/`ClearOrphan`) | Resume routing from a saved state. |
| `SnapSyncState` | Resumable checkpoint blob (phase, pivot, heal target, task cursors, counters). *Defined in Nethereum.CoreChain.* |
| `IFetchRequestScheduler` | Peer-agnostic request scheduler (headers/bodies/receipts/account-range/storage/bytecode/trie-nodes). |
| `IPeerPool` | Active peer set with add/remove events and a target size. |
| `ISnapSyncSink` | Streaming sink the Phase-2 client writes accounts/storage/bytecode into. |
| `ICanonicalStateRootSource` | Trusted-tip source that anchors the pivot. *Defined in Nethereum.CoreChain.* |

### Peering & serving

| Type | Role |
|---|---|
| `PeerPoolManager` (`IPeerPool`) | The concrete peer pool: score-ordered candidate prioritisation, ban tracking, dial-out and the useless-peer floor. |
| `PeerPoolOptions` | Peer-pool tuning record (`TargetPeerCount` 16, dial concurrency/cooldown, subnet-diversity caps, trusted-redial interval). |
| `SyncPeerSession` (`IEthPeer`) | Live per-peer session for any chain: dial → RLPx + Hello → eth handshake (Status with EIP-2124 fork-ID) → header/body/receipt requests over the negotiated `eth/68`–`eth/71`. |
| `PeerListener` / `PeerListenerOptions` | Inbound RLPx serving composition: binds a port, drives the eth server handshake and serves `eth` + `snap/1` to peers syncing *from* this node. |
| `RelayMempool` | Good-citizen relay tx pool: admits locally-submitted signed txs (via `MempoolAdmissionValidator`), holds them in the `ITxPool`, and announces hashes to peers. Leaf-only — never re-gossips remote txs. |
| `MempoolAdmission` / `MempoolRejectReason` | Admission decision and its reject reasons for a submitted transaction. |
| `Eth68PeerPool` / `Eth68PeerSession` | Broadcast peer registry for block/tx publishing (distinct from `IPeerPool`; used by `DevP2PBlockPublisher`). |
| `Eip2124ForkIdCalculator` / `Eip2124ValidationResult` | EIP-2124 fork-ID compute (CRC32 over the fork schedule) and peer-compatibility validation (mirrors geth's stale/incompatible outcomes). |

### Fetch pipeline (Phase 1)

| Type | Role |
|---|---|
| `FetchRequestScheduler` (`IFetchRequestScheduler`) | Concrete scheduler that fans and retries fetch requests across the peer pool, with per-peer in-flight caps and body/receipt fan-out chunking. |
| `PeerRequestWorker` (`IPeerRequestWorker`) | Executes a single fetch against a single peer; the scheduler's per-attempt unit. |
| `BackwardBlockWalker` (`IBackwardBlockWalker`) | Lays a header skeleton backward from a trusted-tip hash, validating parent-hash chains (optionally bodies). |
| `TipBandBodyFollowService` | Standing catch-up that keeps `[execution-head+1 .. trusted-tip]` supplied with bodies + receipts so the executor never starves. |
| `ReceiptBackfillService` | Background scrub that fills missing receipts behind the executor head as blocks become eligible. |
| `DevP2PBlockSource` (`IBlockSource`) | Multi-peer block source (pool + scheduler) a follower pulls from, reporting chain breaks for auto-rewind. |

### Snap state (Phase 2/3)

| Type | Role |
|---|---|
| `SnapRunOptions` / `SnapSyncOrchestratorOptions` | Optional collaborators, mode selection and tuning for `SnapBootstrapper.RunAsync` / `SnapSyncOrchestrator.RunAsync`. |
| `SchedulerSnapPeer` / `Eth68SnapPeer` (`ISnapPeer`) | Snap request transports — scheduler-backed and direct-eth/68-session-backed. |
| `TrieSnapSyncSink` / `InMemorySnapSyncSink` (`ISnapSyncSink`) | Phase-2 sinks: durable Patricia-trie + bytecode writer, and an in-memory sink for tests. |
| `SnapSyncMetrics` | Phase 2/3 progress counters (accounts/slots/bytecodes, rates). |

## Usage examples

The first two examples drive a live peer pool (a connected devp2p network); the Phase-1 backfill example runs fully in-memory and is exercised by a unit test.

**Full orchestrated snap sync** (the production path):

```csharp
var activations = new FixedChainActivations(HardforkNames.Parse("prague"));
var result = await SnapSyncOrchestrator.RunAsync(
    bundle, pool, scheduler, canonical, activations, logger,
    new SnapSyncOrchestratorOptions { UseBackwardSkeleton = true }, ct);
// result.Ran / result.SkipReason / result.PivotBlockNumber
```

**Drive `SnapBootstrapper` directly against a scheduler-backed snap peer:**

```csharp
var scheduler = new FetchRequestScheduler(pool, new PeerRequestWorker(), new FetchRequestSchedulerOptions());
var snapPeer  = new SchedulerSnapPeer(scheduler);

await bundle.Blocks.SaveAsync(pivotHeader, pivotHash); // trusted pivot header
var result = await SnapBootstrapper.RunAsync(
    bundle, snapPeer, pivotHeader, pivotHash, logger,
    new SnapRunOptions
    {
        Scheduler = scheduler,
        PivotRefresher = null,
        RunBackfill = false,
        Activations = new FixedChainActivations(HardforkNames.Parse("prague")),
        Pool = pool,
    },
    ct);
```

**Phase-1 backfill over a pre-laid header skeleton:**

```csharp
var backfiller = new ParallelBlockBackfiller(scheduler, pool, worker, bundle);
var result = await backfiller.BackfillAsync(startBlock, endBlock, headersFromStore: true, ct);
// result.BlocksWritten; bundle.Metadata.GetLastFetchedBody() advances to endBlock
```

## Design notes

- **Trustless fetch (verify-on-read).** Snap account and storage ranges are proof-verified against their roots before persistence, and the final assembled root is compared to target (mismatch throws `SnapRootMismatchException`). Phase-1 bodies/receipts are content-addressed against the header commitments and parent-hash-validated. A peer cannot corrupt the archive or state.
- **Resumability.** Phase 2 checkpoints a `SnapSyncState` blob every ~8 MB and on graceful shutdown; resume routing (`DecideResumeMode`) honours the saved phase — a kill during heal resumes heal directly even if the pivot moved. Phase 1 resumes from the `LastFetchedHeader` / `LastFetchedBody` metadata cursors.
- **Per-peer in-flight depth.** `BlockTaskQueue` caps concurrent reservations per peer per stage (`maxInFlightPerPeer`). Depth 1 is the historical one-in-flight behaviour; the backfiller uses 4 so a fast peer can pipeline across the round-trip instead of idling. Reservations are release-XOR-deliver so a failed request never double-frees a peer's slot.
- **Rolling pivot.** Phase 2 (`PivotRefresher` + `RootRefreshIntervalMs`) and Phase 3 (`TrieHealer.PivotRefresher` + a staleness gate) follow the advancing head so the target root doesn't age out of peers' snapshot windows.
- **Shared-socket awareness.** Heal deliberately caps its snap responses below the server frame limit because eth and snap multiplex over one RLPx socket; oversized snap frames were starving concurrent Phase-1 backfill.
- **Bytecode is fetched outside the trie root check** (contract code isn't in the state trie), with explicit completeness passes in Phase 2, heal, and on resume.
- **Atomic cursor ordering.** Phase 1 writes block data durably first, then advances the metadata cursor over only the contiguous persisted prefix, so a crash leaves the cursor consistent with on-disk content. The final pivot commit and the `Phase=Complete` sentinel land in one batch.
- **Bogus-converge guard.** The bootstrapper refuses to declare success if the leaf stream wrote zero accounts and heal matched after fetching implausibly few nodes (a stale-subtree false positive).
