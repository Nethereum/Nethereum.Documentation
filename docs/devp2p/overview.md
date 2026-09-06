---
title: DevP2P
sidebar_label: Overview
sidebar_position: 1
description: Ethereum peer-to-peer networking in .NET — the RLPx transport, node discovery, and the block and state sync engine.
---

# DevP2P

DevP2P is Ethereum's peer-to-peer networking stack, implemented in .NET. It provides the encrypted RLPx transport and the node discovery that Ethereum nodes use to find and connect to each other, together with the sync engine that downloads blocks and state over those connections.

## Packages

| Package | Description |
|---|---|
| [Nethereum.DevP2P](nethereum-devp2p) | The RLPx transport and node discovery (discv4, discv5, and DNS-based discovery). |
| [Nethereum.DevP2P.Sync](nethereum-devp2p-sync) | The eth and snap sync engine: block backfill, snap state download, and healing. |
