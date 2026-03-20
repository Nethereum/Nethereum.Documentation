---
title: Consensus & Cryptography
sidebar_label: Overview
sidebar_position: 1
description: Merkle trees, Patricia tries, binary tries, sparse Merkle trees, ZK proof verification, SSZ, and light client verification
---

# Consensus & Cryptography

Nethereum provides implementations for core Ethereum cryptographic data structures, zero-knowledge proof verification, and consensus-layer protocols.

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

### Binary Merkle Trie (EIP-7864)

`Nethereum.Merkle.Binary` implements the EIP-7864 binary trie for stateless Ethereum execution. Stem-based structure with 256 colocated values per stem node, BLAKE3 hashing, key derivation, and compact inclusion proofs.

```csharp
var trie = new BinaryTrie();
trie.Put(key, value);
var root = trie.ComputeRoot();
```

### Sparse Merkle Trees (ZK-Optimized)

`SparseMerkleBinaryTree<T>` provides ZK-circuit-compatible sparse Merkle trees with pluggable hashing — Poseidon for ZK circuits, Celestia-compatible SHA-256, or generic hash providers. Supports persistent storage with lazy node loading.

```csharp
var smt = new SparseMerkleBinaryTree<byte[]>(
    new PoseidonSmtHasher(),
    new ByteArrayToByteArrayConvertor(),
    new IdentitySmtKeyHasher(256));
smt.Put(key, value);
var root = smt.ComputeRoot();
```

## Zero-Knowledge Proof Verification

`Nethereum.ZkProofsVerifier` provides native .NET Groth16 proof verification on the BN128 curve. Directly consumes snarkjs/Circom JSON output for one-liner verification:

```csharp
var result = CircomGroth16Adapter.Verify(proofJson, vkJson, publicJson);
```

## SSZ (Simple Serialize)

`Nethereum.Ssz` provides SSZ encoding for the Ethereum consensus layer.

## Light Client

`Nethereum.Consensus.LightClient` implements sync committee verification for the Ethereum beacon chain.

## Packages

| Package | Description |
|---|---|
| `Nethereum.Merkle` | Standard, incremental, sparse, and ZK-optimized Merkle trees |
| `Nethereum.Merkle.Binary` | EIP-7864 Binary Merkle Trie for stateless execution |
| `Nethereum.Merkle.Patricia` | Modified Merkle Patricia Trie |
| `Nethereum.ZkProofsVerifier` | Groth16 proof verification on BN128 (Circom/snarkjs) |
| `Nethereum.Ssz` | Simple Serialize (SSZ) encoding |
| `Nethereum.Consensus.LightClient` | Beacon chain light client verification |
