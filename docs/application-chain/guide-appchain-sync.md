---
title: Syncing Follower Nodes
sidebar_label: Syncing
sidebar_position: 4
description: How AppChain follower nodes sync — the shared DevP2P stack, snap bootstrap, forward execution, and independent state-root verification
---

# Syncing Follower Nodes

> **PREVIEW** — AppChain packages are in preview. APIs may change between releases.

A core promise of the AppChain model is that anyone can run a node, sync the chain, and independently verify it. A **follower** does exactly that: it connects to a block producer, downloads the chain, re-executes every block through its own EVM, and rejects anything whose state root does not match. It serves the same JSON-RPC interface as the producer but never signs a block of its own.

There is no separate AppChain sync engine. A follower uses the **same DevP2P sync stack** that Nethereum's mainnet follower and DevChain use — `Nethereum.DevP2P` / `Nethereum.DevP2P.Sync` — composed for AppChain by `AppChainDevP2PFollower`. If you already understand the [DevP2P full-sync](../devp2p/guide-full-sync) and [snap-sync](../devp2p/guide-snap-sync) guides, you already understand how an AppChain follower syncs; this guide shows how that stack is wired for an AppChain and which flags launch it.

:::tip The Simple Way
```bash
# Producer: serve eth/snap over DevP2P so followers can sync from it
nethereum-appchain --chain-id 420420 \
  --genesis-owner-key $KEY --sequencer-key $KEY \
  --enable-devp2p-serve --devp2p-serve-port 30403 \
  --node-key-file ./producer/nodekey

# Follower: dial the producer's enode and sync from it
nethereum-appchain --port 8547 --chain-id 420420 \
  --genesis-owner-address $OWNER_ADDR --sequencer-address $SEQ_ADDR \
  --follow-peer enode://<producer-id>@<host>:30403
```
The follower connects over RLPx, downloads state and blocks, re-executes them, and then follows the chain head — no polling interval to tune.
:::

## Prerequisites

Followers are launched with the same CLI tool as producers:

```bash
dotnet tool install --global Nethereum.AppChain.Server
```

That single tool (`nethereum-appchain`) bundles the DevP2P sync engine. If you compose a node programmatically, reference `Nethereum.AppChain.Server.Core` (it brings `Nethereum.DevP2P.Sync`, `Nethereum.ChainNode.Hosting` and `Nethereum.CoreChain.RocksDB`); `Nethereum.AppChain.Server` is the `nethereum-appchain` tool.

You also need a producer that **serves** DevP2P. A producer only accepts follower connections when it is launched with `--enable-devp2p-serve` (it advertises `eth` and `snap` capabilities). See the [Quickstart](guide-appchain-quickstart) for launching one.

> The old `Nethereum.AppChain.Sync` package — with `MultiPeerSyncService`, `PeerManager`, `BatchImporter`, and friends — has been removed. Followers no longer poll an HTTP RPC endpoint; they peer over DevP2P like any other Ethereum node.

## Mental Model: A Follower Is a DevP2P Node

An AppChain producer and an AppChain follower are the **same server binary** in two roles. The difference is entirely configuration:

| | Producer | Follower |
|---|---|---|
| Has a signing key | `--sequencer-key` (or `--signer-key` for Clique) | none — uses `--sequencer-address` |
| Produces blocks | Yes | No |
| Imports blocks | Optional | Yes — dials `--follow-peer` |
| Serves DevP2P | `--enable-devp2p-serve` | Not required |

Internally, `AppChainComposition.ComposeAsync` decides the role. A node **imports blocks** whenever its sync mode is not `None` (`AppChainServerConfig.ImportsBlocks`), and it **produces blocks** only when it holds a signing key (`ProducesBlocks`). When a node imports, the composition starts an `AppChainDevP2PFollower` in the background:

```csharp
// AppChainComposition.ComposeAsync — the follower runs on the node's AppChainExecutionCore and chain write gate when the node imports
if (imports)
{
    _ = Task.Run(() => AppChainDevP2PFollower.RunAsync(
        config, chainNode, loggerFactory, CancellationToken.None,
        core, chainWriteGate, forkChoice, mempoolReconciler));
}
```

Because a follower is a DevP2P node, "which peer do I sync from?" is answered by an **enode**, not an HTTP URL. The `--follow-peer` enode is placed first in the node's dial list (`ChainNodeConfig.ResolveDialEnodes`), so the follower connects to your producer as soon as it starts.

## How a Follower Syncs

`AppChainDevP2PFollower.RunAsync` runs four steps in order:

```csharp
// AppChainDevP2PFollower.RunAsync
var peer = await WaitForSnapPeerAsync(node, ct);  // 1. dial + find a snap-capable producer
if (peer.PeerLatestBlock > SnapSyncOrchestrator.PivotTrailDistance)
{
    var pivot = await ResolvePivotAsync(peer, ct);   // 2. read the producer's head header
    await SnapBootstrapAsync(node, pivot, ct);        // 3. snap-download state at the pivot
}
await ForwardExecuteAsync(node, ct);                 // 4. execute blocks + follow the head
```

1. **Find a peer.** The follower dials the `--follow-peer` enode and waits (up to two minutes) for a peer that advertises `snap`. If the producer was not started with `--enable-devp2p-serve`, no such peer appears and the follower logs an error and stops.

2. **Resolve the pivot** (only when a snap bootstrap will run). It reads the producer's latest header — the block number, hash, and state root become the snap-sync pivot.

3. **Snap bootstrap.** When the producer's tip is further than the pivot trail distance from genesis, the follower runs `SnapSyncOrchestrator` to download the account and storage trie for the pivot state instead of replaying history. Within that distance (a fresh chain) it logs that the snap bootstrap was skipped and forward-executes from genesis. When it runs, the log line reports `ran` and `reason`.

4. **Forward execute + follow.** From the pivot (or from genesis / the last stored block when no snap happened), the follower hands off to the shared `FollowerService`, which pulls missing blocks over DevP2P, executes each one, and then follows the chain head live.

The block feed itself is the standard sync stack from `ChainNodeSyncStack`: a `DevP2PBlockSource` pulls headers and bodies, and `FollowingBlockSource` keeps pulling as the peer announces a higher head, so the follower catches up and then stays at the tip. Blocks are not pushed: the sequencer announces its head and the follower pulls.

## Launching a Follower

A follower needs the chain identity, the producer's addresses (to rebuild the identical genesis), and the producer's enode:

```bash
nethereum-appchain \
  --port 8547 \
  --chain-id 420420 \
  --name "MyAppChain" \
  --genesis-owner-address 0xOWNER_ADDRESS \
  --sequencer-address 0xSEQUENCER_ADDRESS \
  --follow-peer enode://<producer-node-id>@<host>:30403 \
  --db-path ./follower-data
```

The follower uses **addresses, not keys** (`--genesis-owner-address` / `--sequencer-address`) because it never signs — it only needs the addresses to reconstruct the same genesis block the producer created.

The follower-relevant flags:

| Flag | Purpose |
|------|---------|
| `--follow-peer <enode>` | Enode of the node to follow; the node syncs from it over DevP2P instead of producing blocks |
| `--devp2p-peers` / `--trusted-peer <enode>` | Additional peer enodes to dial and trust (replaces the old `--sync-peers` and `--bootstrap-nodes`) |
| `--genesis-owner-address` | Genesis owner address (follower mode — no private key needed) |
| `--sequencer-address` | Sequencer address (follower mode — no private key needed) |
| `--node-key-hex` / `--node-key-file` | Pin this node's own DevP2P identity so its enode is stable across restarts |
| `--db-path` / `--data-dir` | RocksDB data directory (default `./appchain-data`) |
| `--in-memory` | Keep everything in memory (re-syncs from scratch on every restart) |

On the **producer** side you need the two serve flags so followers have something to dial:

| Flag | Purpose |
|------|---------|
| `--enable-devp2p-serve` | Serve `eth`/`snap` over RLPx DevP2P so snap-sync followers can cold-sync from this node |
| `--devp2p-serve-port` / `--listen-port` | DevP2P listen port (default `30403`) |
| `--node-key-file` | Persist the producer's node identity so its enode stays the same — followers reference it in `--follow-peer` (default: `<db-path>/nodekey`, created on first run) |

## Independent State Verification

This is what makes a follower more than a mirror. As it forward-executes, the follower rebuilds the state trie itself with an `IncrementalStateRootCalculator` and compares the state root it computes against the one in each block header. The decision on a mismatch is made by `StrictValidationPolicy`:

```csharp
// AppChainDevP2PFollower.StrictPolicy() → ChainNodeFollowerOptionsBuilder.BuildStrictValidationPolicy
new StrictValidationPolicy(sync.ContinueOnMismatch, anchorEvery: 0, logger: logger);
```

By default `ContinueOnMismatch` is `false`, so the policy is strict:

- A state-root divergence causes the follower to **rewind and retry** (`ValidationAction.RewindAndRetry`) — it will not accept a block whose execution it cannot reproduce.
- A divergence the classifier attributes to an EVM bug is treated as **fatal** and stops the follower rather than silently accepting bad state.

This is the mechanism behind the AppChain's public-verifiability promise: the producer cannot make the follower record a state it did not actually compute. `ContinueOnMismatch` is an advanced setting (`AppChain:Node:Sync:ContinueOnMismatch`) intended for debugging — leave it off in normal operation.

## Composing a Follower Programmatically

For embedding, testing, or custom hosting, drive the same server code directly. Build an `AppChainServerConfig` in code and run it:

```csharp
using Nethereum.AppChain.Server;
using Nethereum.AppChain.Server.Configuration;
using Nethereum.ChainNode.Hosting.Configuration;

var config = new AppChainServerConfig { ChainId = 420420 };
config.Genesis.Owner.Address = ownerAddress;
config.Consensus.Sequencer.Address = sequencerAddress;
config.Node.Sync.Mode = SyncMode.ForwardExecute;
config.Node.Sync.FollowPeerEnode = producerEnode;
config.Node.Rpc.Port = 8547;

// Runs storage, composition (which starts the DevP2P follower), and the JSON-RPC server
await AppChainServerRunner.RunAsync(config, cancellationToken);
```

`AppChainServerRunner.RunAsync` calls `AppChainComposition.ComposeAsync`, which starts the `AppChainDevP2PFollower` for you when the node is in importing mode — you do not construct sync services by hand.

## Checking Sync Progress

The follower serves the same HTTP surface as the producer. Two endpoints are useful while it catches up:

| Endpoint | What it tells you |
|----------|-------------------|
| `GET /status` | JSON node status including the current `blockNumber` — compare it to the producer's to see how far behind you are |
| `GET /health` | Liveness check |

You can also just query the follower over JSON-RPC (`eth_blockNumber`) and compare it against the producer — when the two heights match, the follower is caught up and following the head live.

## Common Gotchas

- **The producer must serve DevP2P.** A follower waits for a *snap-capable* peer. If the producer was not launched with `--enable-devp2p-serve`, the follower finds no peer to sync from, logs an error after the wait timeout, and stops. This is the most common "my follower does nothing" cause.
- **`--follow-peer` takes an enode, not an HTTP URL.** It is `enode://<node-id>@<host>:<port>`, pointing at the producer's DevP2P port (default `30403`), not its JSON-RPC port (`8546`). The two are different ports.
- **Pin the producer's identity.** An enode contains the node's public key. If the producer generates a fresh key on every start, its enode changes and your `--follow-peer` value goes stale (by default the key is persisted to `<db-path>/nodekey`). Launch the producer with `--node-key-file` (or `--node-key-hex`) so its enode is stable.
- **Same genesis, or no sync.** The follower must use the same `--chain-id`, `--genesis-owner-address`, and `--sequencer-address` as the producer. These addresses are pre-funded at genesis, so different values produce a different genesis block and the chains cannot reconcile.
- **In-memory means re-sync on restart.** With `--in-memory`, a follower keeps no state on disk and re-syncs from scratch every time it starts. Use `--db-path` (RocksDB, the default) for anything long-running — see the [Storage guide](guide-appchain-storage).

## Next Steps

- **[DevP2P Full Sync](../devp2p/guide-full-sync)** — the shared catch-up-then-follow engine an AppChain follower runs, in detail
- **[DevP2P Snap Sync](../devp2p/guide-snap-sync)** — how the state bootstrap at the pivot works
- **[Mainnet Follower](../mainnet-follower/guide-mainnet-follower)** — the same follower stack pointed at Ethereum mainnet
- **[Storage](guide-appchain-storage)** — configure RocksDB so a follower keeps its verified state across restarts
- **[AppChain Quickstart](guide-appchain-quickstart)** — launch the producer that followers sync from
