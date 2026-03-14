---
title: AppChains (Preview)
sidebar_label: Overview
sidebar_position: 1
description: Build domain-specific Ethereum extension layers with AppChains — lightweight chains with full EVM, pluggable storage, sequencing, syncing, and L1 anchoring
---

# AppChains (Preview)

> **PREVIEW** — AppChain packages are in preview. APIs may change between releases. The core launch, storage, and sync workflows described here are stable; policy, anchoring, and account abstraction APIs are still evolving.

A Nethereum AppChain is a lightweight, domain-specific extension layer for Ethereum L1/L2.

It is a chain — with blocks, transactions, a full EVM, and cryptographic state roots — but purpose-built for your domain. You control the operation. You define the logic. Your users interact with it like any Ethereum network.

The difference is that it does not exist in isolation. It extends Ethereum through bidirectional messaging: L1/L2 events can trigger AppChain logic, and AppChain execution can trigger L1/L2 contracts. State roots are periodically anchored to Ethereum, making the full history tamper-evident and independently verifiable.

Core settlement state — assets, identity, governance — remains on L1/L2. The AppChain manages structured, high-frequency, domain-specific state that does not belong on L1/L2 but still requires public readability, cryptographic verifiability, and independent synchronisation.

A business extends its Ethereum presence with an AppChain the same way it extends its storefront with a backend. The difference is this backend is public. Anyone can read the state, verify the logic, sync the history, and check the anchoring. The business operates it, the public verifies it.

## Fully Ethereum-Compatible

A Nethereum AppChain runs a full EVM and exposes a standard Ethereum JSON-RPC interface:

- Deploy contracts with Hardhat, Foundry, or Remix
- Interact using ethers.js, web3.js, viem, or Nethereum
- Use standard wallets and tooling

If you can deploy to Sepolia, you can deploy to your AppChain. Zero new tooling.

## Architecture

```
Sequencer Node (produces blocks)
    │
    ├── AppChain (IAppChain)
    │   ├── Full EVM execution (Prague hardfork)
    │   ├── Pluggable storage (InMemory / RocksDB)
    │   ├── Genesis with pre-funded accounts + CREATE2 factory
    │   └── Optional MUD World deployment
    │
    ├── Sequencer
    │   ├── Transaction validation pipeline
    │   ├── Interval or on-demand block production
    │   └── Policy enforcement (Preview)
    │
    ├── HTTP/WS JSON-RPC Server
    │   ├── All standard eth_*, web3_*, net_* methods
    │   ├── WebSocket subscriptions
    │   └── Health, metrics, sync status endpoints
    │
    └── L1 Anchoring (Preview)
        └── Periodic state root commitment to Ethereum

Follower Node (syncs and verifies)
    │
    ├── Multi-peer sync with automatic failover
    ├── Batch import for historical catch-up
    ├── Live block polling for chain head
    ├── Optional block re-execution for state validation
    └── Finality tracking (soft vs L1-anchored)
```

## The Simple Path

| Task | How |
|------|-----|
| Launch a sequencer | `nethereum-appchain --chain-id 420420 --genesis-owner-key $KEY --sequencer-key $KEY` |
| Launch a follower | `nethereum-appchain --chain-id 420420 --genesis-owner-address $ADDR --sync-peers http://sequencer:8546` |
| Use persistent storage | `nethereum-appchain --db-path ./chaindata` (RocksDB, default) |
| Use in-memory storage | `nethereum-appchain --in-memory` |
| Deploy contracts | Use Hardhat, Foundry, Remix, or Nethereum — same as any Ethereum network |
| Interact via Nethereum | `var web3 = new Web3(account, "http://localhost:8546");` |
| Deploy MUD World at genesis | `nethereum-appchain --deploy-mud-world true` (default) |
| Programmatic AppChain | `await new AppChainBuilder("MyChain", 420420).WithOperator(key).BuildAsync()` |

## Use Cases

- **Game state** — high-frequency moves, inventory, player data
- **Social graphs** — follows, posts, reactions, reputation
- **Content systems** — metadata, moderation, licensing
- **Domain registries** — on-chain registries for domain-specific data
- **Enterprise workflows** — auditable business logic with public verifiability

## Packages

| Package | Description | Status |
|---|---|---|
| `Nethereum.AppChain` | Core chain abstraction, genesis, IAppChain interface | Preview |
| `Nethereum.AppChain.Server` | HTTP/WS JSON-RPC server (CLI tool) | Preview |
| `Nethereum.AppChain.Sequencer` | Block production, transaction ordering, AppChainBuilder | Preview |
| `Nethereum.CoreChain` | Storage interfaces, block production, RPC framework | Preview |
| `Nethereum.CoreChain.RocksDB` | RocksDB persistent storage backend | Preview |
| `Nethereum.AppChain.Sync` | Multi-peer sync, batch import, finality tracking | Preview |
| `Nethereum.AppChain.P2P` | P2P security: reputation, rate limiting, authentication | Preview |
| `Nethereum.AppChain.P2P.DotNetty` | DotNetty transport implementation | Preview |
| `Nethereum.AppChain.P2P.Server` | Complete P2P node with Clique PoA | Preview |
| `Nethereum.AppChain.Policy` | Governance, access control, merkle authorization | Preview |
| `Nethereum.AppChain.Anchoring` | L1 state root commitment and verification | Preview |
| `Nethereum.Consensus.Clique` | Clique Proof-of-Authority consensus engine | Preview |

## Guides

### Getting Started

| Guide | What You'll Learn |
|---|---|
| [AppChain Quickstart](guide-appchain-quickstart) | Launch a sequencer and follower, deploy contracts, interact via web3, programmatic AppChain with AppChainBuilder |
| [Storage](guide-appchain-storage) | Storage interfaces, in-memory vs RocksDB, column families, configuration tuning |
| [Syncing Follower Nodes](guide-appchain-sync) | Multi-peer sync, batch import, live polling, state validation, finality tracking |
