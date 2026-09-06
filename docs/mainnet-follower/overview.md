---
title: Mainnet Follower
sidebar_label: Overview
sidebar_position: 1
description: Run your own Ethereum mainnet node in .NET — sync, validate, and serve mainnet, and use it as your own data source.
---

# Mainnet Follower

The Nethereum mainnet follower is a node that syncs Ethereum from the peer-to-peer network, validates every block, and serves the result over JSON-RPC, all in .NET. Running your own follower gives you a verified, self-hosted view of mainnet: your own data source, without a third-party provider's rate limits or trust assumptions.

The follower is read-only. It follows and serves the chain; it does not propose or mine blocks.

It verifies consensus through a beacon light client, and refuses to start without a `--beacon` endpoint unless that check is explicitly overridden — so an unverified follower is never produced by accident.

## Guides

| Guide | What You'll Learn |
|---|---|
| [Run a Mainnet Follower](guide-mainnet-follower) | Install and run the follower as a command-line tool, or host it inside your own .NET application. |

## Packages

| Package | Description |
|---|---|
| [Nethereum.MainnetChain.Server](nethereum-mainnetchain-server) | The read-only mainnet follower packaged as the `nethereum-mainnetchain` .NET global tool: a JSON-RPC server that syncs, validates, and serves mainnet. |
| [Nethereum.MainnetChain](nethereum-mainnetchain) | The follower node and its JSON-RPC server. |
| [Nethereum.CoreChain](nethereum-corechain) | The chain engine: block execution, state, storage abstractions, and proofs. |
| [Nethereum.CoreChain.RocksDB](nethereum-corechain-rocksdb) | The persistent RocksDB storage backend. |
| [Nethereum.Freezer](nethereum-freezer) | A geth-compatible append-only ancient store ("freezer") for write-once, sequential-by-block historical chain data: headers, block hashes, bodies, receipts, and block access lists. |
| [Nethereum.CoreChain.Freezer](nethereum-corechain-freezer) | The CoreChain layer over `Nethereum.Freezer`: where Nethereum's block types meet the freezer format and a running node uses it as its finalized-history tier. |
