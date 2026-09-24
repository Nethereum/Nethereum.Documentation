---
title: DevP2P (Preview)
sidebar_label: Overview
sidebar_position: 1
description: Ethereum peer-to-peer networking in .NET — the RLPx transport, node discovery, and the block and state sync engine.
---

# DevP2P (Preview)

> **PREVIEW** — The DevP2P networking and sync packages are in preview. APIs may change between releases.

DevP2P is Ethereum's peer-to-peer networking stack, implemented in .NET. It provides the encrypted RLPx transport and the node discovery that Ethereum nodes use to find and connect to each other, together with the sync engine that downloads blocks and state over those connections.

## Packages

| Package | Description |
|---|---|
| [Nethereum.DevP2P](nethereum-devp2p) | The RLPx transport and node discovery (discv4, discv5, and DNS-based discovery). |
| [Nethereum.DevP2P.Sync](nethereum-devp2p-sync) | The eth and snap sync engine: block backfill, snap state download, and healing. |

## Where do I start?

There's no `web3.Eth`-style simple path here — this is the infrastructure section, one layer below the JSON-RPC surface. The closest thing to a single entry point is `SyncNode` (see [Run a Node](guide-run-a-node)), which ties peering, serving, syncing, and mempool relay into one object. Start with [Connect to a Peer](guide-connect-to-a-peer) if you're new to devp2p.

## Guides

### Peer Networking

| Guide | What You'll Learn |
|---|---|
| [Connect to a Peer](guide-connect-to-a-peer) | Dial a known peer by its `enode://` URL with `StaticPeerConnector`, accept inbound connections with `RlpxListener`, and understand capability negotiation and fork-ID compatibility. |
| [Peer Discovery](guide-peer-discovery) | Find peer addresses with discv4, discv5, and DNS ENR-tree lookup, and persist your node identity and peer history across restarts. |
| [Run a Node](guide-run-a-node) | The `SyncNode` facade — start serving `eth`/`snap` to other peers and relay locally-submitted transactions. |

### Block & State Sync

| Guide | What You'll Learn |
|---|---|
| [Full Sync](guide-full-sync) | Phase-1 block archive backfill with `ParallelBlockBackfiller`, consuming blocks via `IBlockSource`, and reorg handling. |
| [Snap Sync](guide-snap-sync) | Cold-start state with `SnapSyncOrchestrator`/`SnapBootstrapper`, heal missing trie nodes with `TrieHealer`, and resume from a checkpoint. |
| [Block Access Lists](guide-block-access-lists) | Close the state gap when the sync pivot moves mid-flight, using snap-v2 Block Access Lists (`BalHealEnabled`) instead of re-streaming ranges. |
