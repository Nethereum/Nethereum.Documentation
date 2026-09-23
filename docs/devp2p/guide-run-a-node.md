---
title: Run a Node
sidebar_label: Run a Node
sidebar_position: 4
description: The SyncNode facade — the single entry point that ties peering, serving eth/snap, syncing, and mempool relay together.
---

# Run a Node

[Connect to a Peer](./guide-connect-to-a-peer) and [Peer Discovery](./guide-peer-discovery) covered the transport primitives one at a time — dialing, listening, discovering. A real node needs all of them working together: a peer pool, a fetch scheduler, an inbound listener serving `eth`/`snap` to other nodes, and (optionally) a mempool relay — plus the sync engine covered in the next two guides. `SyncNode` is the facade that ties this into one object, in the same spirit as `Web3` for the JSON-RPC side of Nethereum: construct it once from your chain's storage and activation config, then reach every sync capability from it.

## Prerequisites

```bash
dotnet add package Nethereum.DevP2P.Sync
```

You'll need an `IChainStoreBundle` (block/state storage) and `IChainActivations` (fork schedule) from `Nethereum.CoreChain` — these come from whichever chain you're running (mainnet follower or an AppChain), not from this package. You'll also typically have already built the peering resources from the previous two guides: an `IPeerPool`, an `IFetchRequestScheduler`, and optionally a `PeerListener` for serving.

## Mental model: one facade, four capabilities

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

Each of the four properties is `null` when you didn't configure that capability — a node that only backfills the archive (no inbound serving) simply won't set `serving`, and `node.Serving` stays `null`. This lets one class model "full node," "archive-only follower," and "serving-only" without three different types. The underlying drivers (`SnapSyncOrchestrator`, `SnapBootstrapper`, the phase workers) stay directly usable for advanced control — `SyncNode` is a front door, not a wall.

**Source:** `src/Nethereum.DevP2P.Sync/README.md` — "Public entry points" (`SyncNode`) and "Architecture".

## Start serving eth and snap to other peers

If you built a `PeerListener` (the inbound serving composition — binds a port, drives the `eth` server handshake, and serves `eth` plus `snap/1` to peers syncing *from* you) and passed it into the constructor's `serving` parameter, `StartServingAsync` binds it:

```csharp
var node = new SyncNode(bundle, activations, logger, peers: pool, scheduler: scheduler, serving: peerListener);

await node.StartServingAsync(ct);   // no-op if you didn't pass a `serving` PeerListener
```

This is what makes your node useful to *other* nodes doing [Full Sync](./guide-full-sync) or [Snap Sync](./guide-snap-sync) against you — without it, your node can dial out and sync but nobody can sync from it. The README's DevP2P-side note about `RlpxListener.PeerAccepted` not running the `eth` Status exchange (from [Connect to a Peer](./guide-connect-to-a-peer)) is exactly the gap `PeerListener` fills.

**Source:** `src/Nethereum.DevP2P.Sync/README.md` — "Peering & serving" (`PeerListener` / `PeerListenerOptions`).

## Relay locally-submitted transactions

`RelayMempool` is the "good citizen" side of mempool participation: it admits transactions *your own node* (or a locally-connected wallet/RPC client) submits — after running them through `MempoolAdmissionValidator` — holds them in an `ITxPool`, and announces their hashes to your connected peers. It is deliberately **leaf-only**: it never re-gossips transactions it received from *other* peers, so a `SyncNode` participates in propagation without becoming a full relay hub.

```csharp
var node = new SyncNode(bundle, activations, logger, peers: pool, scheduler: scheduler, mempool: relayMempool);

var result = await node.Mempool.SubmitAsync(signedTx);   // MempoolSubmitResult tells you the outcome
if (!result.Accepted)
{
    // result.RejectReason (MempoolRejectReason) + result.RejectMessage explain why
}
```

`SubmitAsync` returns a `MempoolSubmitResult`; check `result.Accepted` (and `result.RejectReason` / `result.RejectMessage` on failure) before assuming a submitted transaction actually made it into the pool — a full pool, a stale nonce, or a validator rejection all fail silently from the caller's perspective unless you inspect the result. (`AdmitFromTrustedPeerAsync` is the separate inbound path used when relaying transactions received from peers.)

**Source:** `src/Nethereum.DevP2P.Sync/Mempool/RelayMempool.cs:55` (`SubmitAsync(ISignedTransaction, CancellationToken) : Task<MempoolSubmitResult>`); `Mempool/MempoolSubmitResult.cs` (`Accepted`, `TransactionHash`, `Sender`, `RejectReason`, `RejectMessage`).

> **Follow-up (untested example):** the signature above is verified against source, but no `[NethereumDocExample]`-tagged test in `tests/Nethereum.DevP2P.Sync.*` exercises `RelayMempool.SubmitAsync` end-to-end — a concrete runnable, tagged example is a follow-up.

## Cold-start state with the same facade

`SyncNode.RunSnapBootstrapAsync` is the sync-side capability, delegating straight to `SnapSyncOrchestrator.RunAsync`:

```csharp
var result = await node.RunSnapBootstrapAsync(canonicalTip, options, ct);
// result.Ran / result.SkipReason / result.PivotBlockNumber
```

This is covered in depth in [Snap Sync](./guide-snap-sync) — the point here is that it's reached from the same `node` object as serving and mempool relay, not a separately-constructed orchestrator.

**Source:** `src/Nethereum.DevP2P.Sync/README.md` — "Public entry points" (`SyncNode.RunSnapBootstrapAsync`).

## Common mistakes

| Symptom | Cause | Fix |
|---|---|---|
| `node.Serving` is `null` at runtime | No `serving: peerListener` argument was passed to the constructor | `StartServingAsync` is a safe no-op in this case, but check whether you *meant* to serve |
| Peers connect but the node never answers `eth`/`snap` requests | Used bare `RlpxListener` (from [Connect to a Peer](./guide-connect-to-a-peer)) instead of `PeerListener` | `RlpxListener` only completes the transport handshake; `PeerListener` runs the actual protocol dispatch |
| Submitted transaction never reaches peers | `RelayMempool.SubmitAsync` rejected it, or `node.Mempool` is `null` because no `mempool:` argument was passed | Check the returned `MempoolSubmitResult` (`Accepted`, `RejectReason`/`RejectMessage`); confirm the constructor argument |
| A remote peer connects but is dropped right after Status | Fork-ID mismatch (EIP-2124) — flagged in [Connect to a Peer](./guide-connect-to-a-peer) | Confirm both nodes share `GenesisHash`/`ForkBlockNumbers`/`ForkTimestamps` in their `DevP2PConfig` |

## Decision guidance

| I want to… | Use |
|---|---|
| The single object that gives me peering + serving + sync + mempool | `SyncNode` |
| Fine-grained control over pivot selection, retry/backoff | `SnapSyncOrchestrator` directly (advanced — see [Snap Sync](./guide-snap-sync)) |
| Only Phase 1 (block archive), no state sync | Drive `ParallelBlockBackfiller` directly (see [Full Sync](./guide-full-sync)) |
| Only serve, never sync out | Construct `SyncNode` with `serving:` set and skip `RunSnapBootstrapAsync` |

Full API reference (peer pool tuning, fetch scheduler options, `Eip2124ForkIdCalculator`): see the [Nethereum.DevP2P.Sync reference](./nethereum-devp2p-sync).

## Next steps

- **[Full Sync](./guide-full-sync)** — the Phase-1 block archive backfill `SyncNode` drives underneath, and how to consume its output as an `IBlockSource`.
- **[Snap Sync](./guide-snap-sync)** — the full Phase 2/3 cold-start flow behind `RunSnapBootstrapAsync`.
- **[Connect to a Peer](./guide-connect-to-a-peer)** — revisit the transport layer `PeerListener` and `IPeerPool` are built on.
