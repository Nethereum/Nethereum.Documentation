---
title: Full Sync (Block Backfill)
sidebar_label: Full Sync
sidebar_position: 5
description: Phase-1 block archive backfill with ParallelBlockBackfiller, consuming blocks as an IBlockSource, and what happens on a reorg.
---

# Full Sync (Block Archive Backfill)

Once your node can connect to peers ([Connect to a Peer](./guide-connect-to-a-peer)) and is wired up as a `SyncNode` ([Run a Node](./guide-run-a-node)), it needs the actual chain data: headers, bodies, and receipts for every block. This is **Phase 1** of Nethereum's snap-first sync — downloading and verifying the block archive from `[genesis..pivot]` — and it's useful on its own even outside a full snap-sync run, for backfilling history behind an already snap-synced head. This guide covers the Phase-1 backfiller, how a follower consumes blocks as a stream via `IBlockSource`, and what happens when the chain the peers report reorgs out from under you.

## Prerequisites

```bash
dotnet add package Nethereum.DevP2P.Sync
```

You need an `IChainStoreBundle` to persist into, an `IPeerPool` with at least one connected peer (from [Connect to a Peer](./guide-connect-to-a-peer) / [Peer Discovery](./guide-peer-discovery)), and an `IFetchRequestScheduler` to fan requests across that pool.

## Mental model: content-addressed, pipelined, resumable

Phase 1 downloads three things per block — headers, bodies (transactions + uncles), and receipts — and verifies every one of them cryptographically before it's trusted:

- Bodies are checked against the header's `TransactionsHash` and `UnclesHash`.
- Receipts are checked against the header's `ReceiptHash`.
- The parent-hash chain is validated within and across fetch batches.

A peer that returns bad data doesn't corrupt your archive — a mismatch is detected and the request is retried against another peer. This is the same trustless-fetch principle behind Phase 2 in [Snap Sync](./guide-snap-sync): never persist what you can't verify.

**Source:** `src/Nethereum.DevP2P.Sync/README.md` — "Overview" (Phase 1) and "Design notes — Trustless fetch".

## Run a bounded backfill

`ParallelBlockBackfiller` runs a concurrent pipeline — header producer/loader, body fetcher, receipt fetcher, and a persistence drain — over a shared `BlockTaskQueue`:

```csharp
Task<BackfillResult> BackfillAsync(ulong startBlock, ulong endBlock, CancellationToken ct);
Task<BackfillResult> BackfillAsync(ulong startBlock, ulong endBlock, IBodyFillCursor cursor, CancellationToken ct);
Task<BackfillResult> BackfillAsync(ulong startBlock, ulong endBlock, bool headersFromStore, CancellationToken ct);
```

The `headersFromStore: true` overload is the one you reach for when headers are already persisted (laid down by a header skeleton, or by a previous partial run) and only bodies/receipts are missing. Here's that overload driving a real fill over ten blocks, with transactions on blocks 3–7:

```csharp
var pool = new OnePeerPool();                 // your IPeerPool with a connected peer
var worker = new ServingWorker(chain);        // your IPeerRequestWorker implementation
var backfiller = new ParallelBlockBackfiller(scheduler, pool, worker, bundle);

using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
var result = await backfiller.BackfillAsync(3, 7, headersFromStore: true, cts.Token);

// result.Ran == true
// result.BlocksWritten == 5, result.TransactionsWritten == 5, result.ReceiptsWritten == 5
// bundle.Metadata.GetLastFetchedBody() advances to 7
```

`BlocksWritten`/`TransactionsWritten`/`ReceiptsWritten` tell you exactly what landed; `bundle.Metadata.GetLastFetchedBody()` is the durable cursor Phase 1 advances only over the *contiguous* persisted prefix — so a crash mid-fill leaves the cursor pointing at real, complete data, never past a gap.

**Source:** `tests/Nethereum.DevP2P.Sync.UnitTests/ParallelBlockBackfillerFromStoreTests.cs:35` — `FillsBoundedRange_FromStoreHeaders_PersistsTxsAndReceipts`, tagged `[NethereumDocExample(DocSection.DevP2P, "devp2p-sync", "Phase-1 backfill over a pre-laid header skeleton")]` (peer/worker types abbreviated to their role; see the test file for the full fakes). Matches the README's "Phase-1 backfill over a pre-laid header skeleton" usage example.

## Where the header skeleton comes from

The `headersFromStore: true` path assumes headers are already in the store. `BackwardBlockWalker` is what lays that skeleton down: it walks the chain backward from a trusted-tip hash anchor, validating the parent-hash chain as it goes, and optionally persisting bodies too. `BlockTaskQueue` — the producer/consumer queue underneath the backfiller — caps concurrent in-flight requests per peer per stage via `maxInFlightPerPeer` (default 1; the backfiller itself uses 4, so a fast peer can pipeline across the round trip instead of idling waiting for one response before sending the next request).

**Source:** `src/Nethereum.DevP2P.Sync/README.md` — "Public entry points" (`BackwardBlockWalker`, `BlockTaskQueue`) and "Design notes — Per-peer in-flight depth".

## Keeping the tip band fed independently

Phase 1's archive backfill and the "keep the live tip fresh" job are deliberately separate concerns: `TipBandBodyFollowService` fills `[execution-head+1 .. trusted-tip]` with bodies and receipts so the block executor never starves waiting on the *history* drain to catch up. It's driven the same way as a bounded backfill, but against an `IBodyFillCursor` anchored at the execution head rather than a fixed `[start, end]` range:

```csharp
var service = new TipBandBodyFollowService(scheduler, pool, bundle, activations);
var cursor = new ExecutionHeadBodyFillCursor(bundle);

await service.FillOnceAsync(backfiller, cursor, ct);
// cursor advances to the trusted tip independently of bundle.Metadata's archive body cursor
```

Notice the archive cursor (`bundle.Metadata.GetLastFetchedBody()`) does **not** move when you drive the tip band this way — the two cursors track different things on purpose, so a slow archive backfill can never stall block execution at the tip.

**Source:** `tests/Nethereum.DevP2P.Sync.UnitTests/TipBandBodyFollowServiceTests.cs:52` (constructor) and `:56` (`FillOnceAsync` call) — `FillOnce_FillsExecutionHeadToTip_IndependentOfArchiveBodyCursor`, tagged `[NethereumDocExample(DocSection.ChainInfrastructure, "snap-sync", "Tip-range job fills [executionHead+1..tip] independently of the history drain")]`. *(Tagged `ChainInfrastructure`, not `DevP2P` — included here because it directly documents `Nethereum.DevP2P.Sync.FullSync.TipBandBodyFollowService`, whose only DevP2P-section coverage is the README's one-line role table entry.)*

## Consuming blocks as a stream: `IBlockSource`

A follower doesn't call the backfiller directly in most cases — it consumes an `IBlockSource`, a chain-agnostic abstraction that streams blocks and reports when the source diverges from what was previously seen (a reorg or a bad peer). Two DevP2P-backed implementations exist:

- **`DevP2PBlockSource`** — a multi-peer source (built on the pool + scheduler) that a follower pulls from, reporting chain breaks so the caller can auto-rewind.
- **`PushedBlockSource`** — accepts blocks pushed to it (e.g. from a broadcast peer bridge) rather than pulling.

**Source:** `src/Nethereum.DevP2P.Sync/README.md` — "Fetch pipeline (Phase 1)" (`DevP2PBlockSource`).

> **Follow-up (untested example):** `IBlockSource`, `DevP2PBlockSource`, and `PushedBlockSource` are named in the README's type table (role description only, no method signature block), and `IBlockSource` itself is defined in `Nethereum.CoreChain` rather than either DevP2P README. No `[NethereumDocExample]`-tagged test covers constructing or streaming from either implementation. A concrete `StreamAsync`/reorg-handling example is a follow-up — do not treat the interface shape above as guaranteed stable without checking `src/Nethereum.CoreChain/Sync/IBlockSource.cs` directly.

## What happens on a reorg

Phase 1 validates the parent-hash chain as it fetches, so a peer serving a block whose parent doesn't match what was already fetched is detected immediately rather than silently corrupting the archive. At the streaming layer, `DevP2PBlockSource` reports this as a chain break so the follower can auto-rewind to the last common ancestor and re-fetch forward — the same "verify before persist, never trust a single peer" discipline Phase 1 applies to bodies and receipts applies here to chain continuity itself.

## Common mistakes

| Symptom | Cause | Fix |
|---|---|---|
| `BackfillAsync(headersFromStore: true)` waits forever without progress | The header skeleton hasn't reached the requested `startBlock` yet — the filler correctly waits rather than falsely declaring failure | Confirm `BackwardBlockWalker`'s descent has reached `startBlock`, or increase how long you wait |
| `bundle.Metadata.GetLastFetchedBody()` doesn't move even though blocks are being written | You're driving `TipBandBodyFollowService`, whose cursor is intentionally separate from the archive cursor | This is expected — check the tip-band cursor (`ExecutionHeadBodyFillCursor`), not the archive one |
| Backfill throws on a mismatched body/receipt | A peer returned data that doesn't match the header's commitment — this is the trustless-fetch check working as intended | The scheduler retries against another peer; if it persists, suspect a malicious or badly-synced peer |
| Archive cursor jumps unexpectedly on restart after a crash | It shouldn't — Phase 1 only advances the cursor over the *contiguous* persisted prefix | If you see this, it's worth filing — this is a documented invariant, not expected behavior |

## Decision guidance

| I want to… | Use |
|---|---|
| Fill a bounded, known range of blocks | `ParallelBlockBackfiller.BackfillAsync(start, end, ct)` |
| Fill bodies/receipts over headers already in the store | `BackfillAsync(start, end, headersFromStore: true, ct)` |
| Keep the live tip fed without waiting on history | `TipBandBodyFollowService.FillOnceAsync` |
| Consume blocks as a stream with reorg handling | `IBlockSource` (`DevP2PBlockSource` pulling, or `PushedBlockSource` for a push model) |
| Lay the header skeleton itself, backward from a trusted tip | `BackwardBlockWalker` |

Full API reference (`BlockTaskQueue` tuning, `IPeerRequestWorker`): see the [Nethereum.DevP2P.Sync reference](./nethereum-devp2p-sync).

## Next steps

- **[Snap Sync](./guide-snap-sync)** — the state-download counterpart to this guide's block-archive backfill, and how the two phases fit into one cold-start orchestration.
- **[Block Access Lists](./guide-block-access-lists)** — what happens when the pivot moves *while* Phase 2/3 state sync is still catching up, closing the gap this guide's reorg handling doesn't cover.
- **[Run a Node](./guide-run-a-node)** — the `SyncNode` facade that wires this backfiller together with peering and serving.
