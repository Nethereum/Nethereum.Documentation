---
title: Consensus & Cryptography
sidebar_label: Overview
sidebar_position: 1
description: Merkle trees, Patricia tries, SSZ, BLS signatures, and light client verification
---

# Consensus & Cryptography

Nethereum provides implementations for core Ethereum cryptographic data structures and consensus-layer verification.

## Merkle Trees

### Modified Merkle Patricia Trie

Ethereum uses a Modified Merkle Patricia Trie for state verification:

| Trie | Root in Header | Purpose |
|---|---|---|
| **State Trie** | `stateRoot` | Maps account addresses to state |
| **Storage Trie** | Per-account `storageRoot` | Maps storage slots to values |
| **Transaction Trie** | `transactionsRoot` | Maps tx index to tx data |
| **Receipt Trie** | `receiptsRoot` | Maps tx index to receipt data |

```csharp
var trie = new PatriciaTrie();
trie.Put(key, value);
byte[] rootHash = trie.GetRootHash();
```

### Binary Merkle Trees

For airdrops, allowlists, and rollup data:

- `LeanIncrementalMerkleTree` — append-only with cached layers
- `FrontierMerkleTree` — minimal frontier nodes

## SSZ (Simple Serialize)

`Nethereum.Ssz` provides SSZ encoding for the Ethereum consensus layer.

## Light Client

`Nethereum.Consensus.LightClient` implements sync committee verification for the Ethereum beacon chain.

## Packages

| Package | Description |
|---|---|
| `Nethereum.Merkle` | Standard, incremental, and frontier Merkle trees |
| `Nethereum.Merkle.Patricia` | Modified Merkle Patricia Trie |
| `Nethereum.Ssz` | Simple Serialize (SSZ) encoding |
| `Nethereum.Consensus.LightClient` | Beacon chain light client verification |
