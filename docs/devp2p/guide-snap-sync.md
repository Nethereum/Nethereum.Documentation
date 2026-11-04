---
title: Snap Sync (State Download)
sidebar_label: Snap Sync
sidebar_position: 6
description: Cold-start state with SnapSyncOrchestrator/SnapBootstrapper, heal missing trie nodes with TrieHealer, and resume from a checkpoint.
---

# Snap Sync (State Download)

[Full Sync](./guide-full-sync) covers downloading the block *archive* — headers, bodies, receipts. That tells you what happened, but not the current *state* (every account's balance, nonce, code, and storage). Replaying every block from genesis to compute that state is exactly what snap sync avoids: it streams the state at a recent pivot block directly, verified against Merkle-Patricia proofs, then heals any gaps. This guide covers cold-starting that state stream (Phase 2), healing the reconstructed trie (Phase 3), and resuming a sync that was interrupted partway through.

## Prerequisites

```bash
dotnet add package Nethereum.DevP2P.Sync
```

You need a peer pool with peers advertising `snap/1` (see [Connect to a Peer](./guide-connect-to-a-peer) for capability negotiation), an `IChainStoreBundle`, `IChainActivations` for the target chain, and an `ICanonicalStateRootSource` — a trusted-tip source that anchors the pivot block.

## Mental model: three phases, one orchestrator

```
SyncNode                             the "start here" facade — one object: serve state + snap-bootstrap
   └─ SnapSyncOrchestrator           anchor pivot, retry/backoff, follow rolling pivot
        └─ SnapBootstrapper          sequence one pivot: skip-if-synced -> Phase 2 -> heal-on-mismatch -> commit
             ├─ ParallelBlockBackfiller   Phase 1: header + body + receipt + persist stages over a BlockTaskQueue
             │     └─ BackwardBlockWalker  (skeleton mode) lay headers backward from a trusted tip
             ├─ SnapSyncClient            Phase 2: parallel account/storage/bytecode leaf stream -> ISnapSyncSink
             └─ TrieHealer                Phase 3: BFS re-fetch of missing trie nodes until root matches
```

Phase 1 (the previous guide) can run inside this same orchestration or standalone. Phase 2 streams the full account/storage/bytecode state at the pivot, verifying every range against a proof and comparing the assembled root to the pivot's `StateRoot`. Phase 3 walks the resulting trie and re-fetches anything still missing, following the pivot forward if the head advances while healing runs — which is exactly the scenario [Block Access Lists](./guide-block-access-lists) covers in more depth for the snap-v2 case.

**Source:** `src/Nethereum.DevP2P.Sync/README.md` — "Overview" and "Architecture".

## Run the full orchestrated sync (the production path)

`SnapSyncOrchestrator.RunAsync` is the top-level driver — anchors the pivot from your canonical tip source, runs the bootstrapper, and follows a rolling pivot with backoff if the chain keeps advancing while you sync:

```csharp
var activations = new FixedChainActivations(HardforkNames.Parse("prague"));
var result = await SnapSyncOrchestrator.RunAsync(
    bundle, pool, scheduler, canonical, activations, logger,
    new SnapSyncOrchestratorOptions { UseBackwardSkeleton = true }, ct);
// result.Ran / result.SkipReason / result.PivotBlockNumber
```

This is what `SyncNode.RunSnapBootstrapAsync` (from [Run a Node](./guide-run-a-node)) delegates to — reach for the orchestrator directly only when you need tuning it doesn't expose through the facade, or you're not using `SyncNode` at all.

**Source:** `src/Nethereum.DevP2P.Sync/README.md` — "Usage examples — Full orchestrated snap sync".

## Tuning the orchestration

`SnapSyncOrchestratorOptions` is where mode and tuning knobs live. The defaults are chosen for a fresh cold-start against a live network; most callers only override one or two:

| Property | Type | Default |
|---|---|---|
| `UseBackwardSkeleton` | `bool` | `true` |
| `Metrics` | `SnapSyncMetrics?` | `null` |
| `RootRefreshIntervalMs` | `int` | `12_000` |
| `PivotStaleDistanceBlocks` | `ulong` | `SnapSyncOrchestrator.PivotStaleDistanceBlocks` |
| `HeaderSweepOverride` | `(ulong From, ulong To)?` | `null` |
| `BackfillOnly` | `bool` | `false` |
| `RunHistoryBackfill` | `bool` | `true` |
| `Phase1First` | `bool` | `false` |
| `AccountConcurrency` | `int?` | `null` |
| `LargeContractConcurrency` | `int?` | `null` |
| `EnableFlatReconcile` | `bool` | obsolete, ignored: the flat state is always certified |
| `FinalizeVerify` | `bool` | obsolete, ignored |
| `HeaderFollow` | `HeaderFollowService?` | `null` |
| `BalHealEnabled` | `bool` | `false` |

`RootRefreshIntervalMs` is how often the orchestrator re-checks whether the pivot has moved; `BackfillOnly` lets you run just Phase 1 through this same entry point when you don't want state sync at all. `BalHealEnabled` gates the snap-v2 BAL heal path — see [Block Access Lists](./guide-block-access-lists) for what it does and why it defaults to `false`.

**Source:** `src/Nethereum.DevP2P.Sync/README.md` — "Public entry points" (`SnapSyncOrchestratorOptions` table).

## Drive `SnapBootstrapper` directly

For advanced control over a single pivot — skipping the orchestrator's rolling-pivot/backoff loop — `SnapBootstrapper.RunAsync` sequences one cold-start: skip if state is already committed, run Phase 2, heal on root mismatch, then persist the pivot and completion sentinel:

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

Notice the pivot header is saved to the store *before* calling `RunAsync` — the bootstrapper trusts the header you hand it as the sync target; it doesn't independently fetch and validate the pivot itself (that trust decision belongs to whatever supplies your `ICanonicalStateRootSource` in the orchestrated path above). `SnapBootstrapper` also exposes pure, unit-tested decision helpers if you need to reason about resume routing yourself: `DecideResumeMode(SnapPhase savedPhase, bool healTargetValid, bool pivotMoved)` and `ShouldMarkPhase2Entry(bool skipPhase2, bool backfillOnly)`.

**Source:** `src/Nethereum.DevP2P.Sync/README.md` — "Usage examples — Drive `SnapBootstrapper` directly" and "Public entry points — `SnapBootstrapper`".

## Phase 2: the leaf-stream fetcher

`SnapSyncClient` is what actually pulls state during Phase 2 — account ranges via 16 (`AccountConcurrency`) partitioned parallel workers, per-account storage, and bytecodes, verifying proofs and comparing the assembled root against target as it goes:

```csharp
Task<SyncResult> SyncStateAsync(byte[] targetRoot, CancellationToken ct = default);
```

If the assembled root doesn't match `targetRoot` when the stream completes, `SyncStateAsync` doesn't fail silently — it signals via a `SnapRootMismatchException`, which is exactly the trigger `SnapBootstrapper` uses to hand off to Phase 3 healing.

**Source:** `src/Nethereum.DevP2P.Sync/README.md` — "Public entry points — `SnapSyncClient`".

## Resume from a checkpoint

A cold-start over a large state trie can run for hours — you need to survive a restart partway through without re-streaming everything. `SyncStateWithCheckpointAsync` is the resumable, checkpointing entry point the resumable overload delegates to:

```csharp
Task<SyncResult> SyncStateAsync(byte[] targetRoot, SnapSyncState resumeFrom,
                                Action<SnapSyncState> checkpointSink, CancellationToken ct = default);
// The checkpointing entry the resumable overload delegates to (checkpoints a SnapSyncCheckpoint):
Task<SyncResult> SyncStateWithCheckpointAsync(byte[] targetRoot, SnapSyncState resumeFrom,
                                Action<SnapSyncCheckpoint> checkpointSink, CancellationToken ct = default);
```

Phase 2 checkpoints a `SnapSyncState` blob roughly every 8 MB and on graceful shutdown. On the next run, `SnapBootstrapper.DecideResumeMode` reads the saved `SnapPhase` (`NotStarted`/`Phase2Running`/`Phase3Running`/`Complete`) and routes accordingly — critically, **a kill during heal resumes heal directly even if the pivot moved in the meantime**, rather than restarting Phase 2 from scratch. Phase 1's resume is simpler: it just picks up from the `LastFetchedHeader`/`LastFetchedBody` metadata cursors covered in [Full Sync](./guide-full-sync).

**Source:** `src/Nethereum.DevP2P.Sync/README.md` — "Public entry points — `SnapSyncClient`" and "Design notes — Resumability".

> **Follow-up (untested example):** the checkpoint/resume signatures above are verified against the README's accepted signature block, but no `[NethereumDocExample]`-tagged test in `tests/Nethereum.DevP2P.Sync.*` exercises a full checkpoint-then-resume cycle. The pure decision helper `SnapBootstrapper.DecideResumeMode` is unit-tested (per the README) but not tagged for doc traceability.

## Phase 3: healing

`TrieHealer` BFS-walks the in-storage trie under a target root, re-fetching any hash-referenced node (or bytecode) still missing, and re-roots as the pivot advances:

```csharp
Task<HealResult> HealAsync(byte[] targetRoot,
    IReadOnlyList<(byte[] AccountHash, byte[] StorageRoot)> seedStorageHeal = null,
    IReadOnlyList<byte[]> seedCodeHeal = null,
    ulong pivotBlock = 0, bool wipeSeedsFirst = false, CancellationToken ct = default);
```

Heal deliberately caps its snap response sizes below the server's frame limit, because `eth` and `snap` share one RLPx socket per peer ([Connect to a Peer](./guide-connect-to-a-peer)) — an oversized snap response would starve a concurrent Phase-1 backfill sharing the same connection. The bootstrapper also refuses to declare heal successful if it converged after fetching implausibly few nodes from an all-zero leaf stream — a guard against a stale-subtree false positive rather than a real completion.

**Source:** `src/Nethereum.DevP2P.Sync/README.md` — "Public entry points — `TrieHealer`" and "Design notes — Shared-socket awareness, Bogus-converge guard".

## Common mistakes

| Symptom | Cause | Fix |
|---|---|---|
| `SyncStateAsync` throws `SnapRootMismatchException` | Expected — this is Phase 2 signaling that heal is required, not necessarily a bug | `SnapBootstrapper` catches this and hands off to `TrieHealer` automatically in the orchestrated path |
| Sync appears to restart from zero after a restart | Not using `SyncStateWithCheckpointAsync`/`resumeFrom`, or resume routing decided `Fresh` because the saved phase was invalid | Confirm you're persisting `SnapSyncState` via the checkpoint sink and passing it back in on restart |
| Heal never converges while the chain keeps producing blocks | Pivot moving faster than heal can catch up | Widen `PivotStaleDistanceBlocks`, or see [Block Access Lists](./guide-block-access-lists) for the dedicated gap-closing mechanism |
| Snap responses seem throttled compared to eth traffic | Intentional — heal caps snap frame sizes to protect concurrent Phase-1 traffic on the same socket | Not a bug; tune peer count/concurrency instead of frame size |

## Decision guidance

| I want to… | Use |
|---|---|
| The production cold-start path with rolling-pivot follow | `SnapSyncOrchestrator.RunAsync` (or `SyncNode.RunSnapBootstrapAsync`) |
| One pivot, advanced control, no rolling-pivot loop | `SnapBootstrapper.RunAsync` directly |
| Just the leaf-stream fetch, custom sink | `SnapSyncClient.SyncStateAsync` |
| Resume across restarts | `SnapSyncClient.SyncStateWithCheckpointAsync` + persisted `SnapSyncState` |
| Re-fetch missing trie nodes after a root mismatch | `TrieHealer.HealAsync` |

Full API reference (`ISnapSyncSink` implementations, `SnapRunOptions`, peer/scheduler abstractions): see the [Nethereum.DevP2P.Sync reference](./nethereum-devp2p-sync).

## Next steps

- **[Block Access Lists](./guide-block-access-lists)** — what happens when the pivot moves *during* Phase 2/3 — the snap-v2 BAL heal path that closes the resulting state gap without re-streaming already-fetched ranges.
- **[Run a Node](./guide-run-a-node)** — the `SyncNode` facade this guide's orchestrator sits behind.
- **[Full Sync](./guide-full-sync)** — Phase 1, which can run standalone or inside this same orchestration via `BackfillOnly`.
