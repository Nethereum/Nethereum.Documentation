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

## Zero-Knowledge Proofs

Nethereum provides a complete ZK proof pipeline — generation, verification, and Solidity-compatible proof formatting — for Groth16 proofs on the BN128 curve.

### Proof Generation

Two proof generation paths are available depending on your platform:

**Browser (Blazor WebAssembly)** — `Nethereum.ZkProofs.Snarkjs.Blazor` calls snarkjs via JS interop. Private inputs never leave the browser.

```csharp
var provider = new SnarkjsBlazorProvider(jsRuntime, "./js/snarkjs.min.js");
await provider.InitializeAsync();
var result = await provider.FullProveAsync(request);
```

**Native (Desktop/Server)** — `Nethereum.CircomWitnessCalc` + `Nethereum.ZkProofs.RapidSnark` use native C/C++ libraries via P/Invoke. Typically 10-50x faster than browser-based generation.

```csharp
byte[] witness = WitnessCalculator.CalculateWitness(graphData, inputsJson);
using var prover = new RapidSnarkProver();
var (proofJson, publicSignalsJson) = prover.Prove(zkeyBytes, witness);
```

Both paths implement `IZkProofProvider` from `Nethereum.ZkProofs`, making them interchangeable.

### Proof Verification

`Nethereum.ZkProofsVerifier` provides pure C# Groth16 verification on the BN128 curve. Directly consumes snarkjs/Circom JSON output:

```csharp
var result = CircomGroth16Adapter.Verify(proofJson, vkJson, publicJson);
```

### Demo Applications

Two working demos show the full generate-and-verify flow with educational UI:

- **Blazor WASM** — `src/demos/Nethereum.ZkProofs.Blazor.Demo/` (browser-based, snarkjs)
- **Avalonia Desktop** — `src/demos/Nethereum.ZkProofs.Avalonia.Demo/` (native, rapidsnark)

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
| `Nethereum.ZkProofs` | Provider-agnostic interfaces and models for ZK proof generation |
| `Nethereum.ZkProofsVerifier` | Groth16 proof verification on BN128 (Circom/snarkjs) |
| `Nethereum.ZkProofs.Snarkjs.Blazor` | Browser-based Groth16 proof generation via snarkjs JS interop |
| `Nethereum.ZkProofs.RapidSnark` | Native Groth16 proof generation via rapidsnark (P/Invoke) |
| `Nethereum.CircomWitnessCalc` | Native witness generation via circom-witnesscalc (P/Invoke) |
| `Nethereum.Ssz` | Simple Serialize (SSZ) encoding |
| `Nethereum.Consensus.LightClient` | Beacon chain light client verification |
