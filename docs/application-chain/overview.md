---
title: AppChains (Preview)
sidebar_label: Overview
sidebar_position: 1
description: Build custom Ethereum-compatible AppChains with sequencing, P2P, and L1 anchoring
---

# AppChains (Preview)

Nethereum.AppChain extends CoreChain to provide an application-specific chain layer. Applications run their own chain for domain-specific data and business rules — game state, social graphs, content, governance — while users retain the ability to exit with their data at any time.

## Use Cases

- Game state and social graphs
- Content and governance systems
- Application-specific business rules
- Custom consensus and validation policies

## Packages

| Package | Description |
|---|---|
| `Nethereum.AppChain` | AppChain core |
| `Nethereum.AppChain.Server` | HTTP server |
| `Nethereum.AppChain.Sequencer` | Transaction ordering and sequencing |
| `Nethereum.AppChain.Sync` | Multi-node state synchronisation |
| `Nethereum.AppChain.P2P` | P2P networking abstractions |
| `Nethereum.AppChain.Policy` | Governance, validation, and access policies |
| `Nethereum.AppChain.Anchoring` | L1 anchoring for state commitment |
| `Nethereum.Consensus.Clique` | Clique Proof-of-Authority consensus |
