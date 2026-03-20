---
title: Sparse Merkle Trees for ZK Circuits
sidebar_label: Sparse Merkle Trees for ZK
sidebar_position: 3
description: Build ZK-compatible sparse Merkle trees with Poseidon hashing for privacy pools, nullifier sets, and state commitments
---

# Sparse Merkle Trees for ZK Circuits

:::tip Quick Start
Create a Poseidon-based sparse Merkle tree for ZK circuits:

```csharp
var smt = new SparseMerkleBinaryTree<byte[]>(
    new PoseidonSmtHasher(),
    new ByteArrayToByteArrayConvertor(),
    new IdentitySmtKeyHasher(256));

smt.Put(key, value);
var root = smt.ComputeRoot();
```

The root hash is circuit-compatible — use it directly in Circom/snarkjs proofs.
:::

## Why Sparse Merkle Trees for ZK?

Zero-knowledge circuits (Circom, Halo2, Noir) frequently need to prove membership or non-membership in a set. A sparse Merkle tree (SMT) is ideal because:

1. **Deterministic structure** — the tree shape depends only on the keys, not insertion order
2. **Efficient proofs** — proving membership requires only `depth` hashes (typically 140-256)
3. **Circuit-friendly hashing** — Poseidon is ~100x cheaper than Keccak inside a ZK circuit
4. **Non-membership proofs** — empty leaves have a known hash, so you can prove a key is absent

Use cases include privacy pools (nullifier sets), anonymous voting (ballot commitments), and rollup state roots.

## Prerequisites

```bash
dotnet add package Nethereum.Merkle
dotnet add package Nethereum.Util
```

## How It Works

`SparseMerkleBinaryTree<T>` is a binary tree where:
- Each key is converted to a bit path (MSB-first or LSB-first depending on hasher)
- Leaves store the value hash at the key's path
- Internal nodes hash their two children
- Empty subtrees have a fixed empty hash (no storage needed)

The `ISmtHasher` interface controls how leaves and nodes are hashed, with three built-in strategies:

| Hasher | Hash Function | Use Case |
|--------|--------------|----------|
| `PoseidonSmtHasher` | Poseidon (CircomT3 leaf, CircomT2 node) | ZK circuits (Circom, Privacy Pools) |
| `CelestiaSmtHasher` | SHA-256 with domain prefixes | Celestia namespace compatibility |
| `DefaultSmtHasher` | Any `IHashProvider` | Generic use (Keccak, SHA-256) |

## Example 1: Poseidon SMT for ZK Circuits

```csharp
using Nethereum.Merkle.Sparse;
using Nethereum.Util.ByteArrayConvertors;

var smt = new SparseMerkleBinaryTree<byte[]>(
    new PoseidonSmtHasher(),
    new ByteArrayToByteArrayConvertor(),
    new IdentitySmtKeyHasher(140));  // 140-bit paths

// Insert leaves
var key1 = new byte[18];  // 140 bits = ~18 bytes
key1[0] = 0x01;
var value1 = new byte[32];
value1[0] = 0xAA;

smt.Put(key1, value1);

// Compute root — this hash is Circom-compatible
var root = smt.ComputeRoot();

// The root can be used as a public input to a snarkjs proof
Console.WriteLine($"Root: {BitConverter.ToString(root)}");
```

### Poseidon Hash Details

`PoseidonSmtHasher` uses two Poseidon presets:
- **Leaf hash**: `Poseidon(key, value, 1)` using CircomT3 (3 inputs)
- **Node hash**: `Poseidon(leftChild, rightChild)` using CircomT2 (2 inputs)

This matches the Circom SMT circuit conventions used by iden3 and Privacy Pools.

## Example 2: Celestia-Compatible SMT

```csharp
using Nethereum.Merkle.Sparse;
using Nethereum.Util.ByteArrayConvertors;

var smt = new SparseMerkleBinaryTree<byte[]>(
    new CelestiaSmtHasher(),
    new ByteArrayToByteArrayConvertor());

smt.Put(key, value);
var root = smt.ComputeRoot();
```

`CelestiaSmtHasher` uses domain-separated SHA-256:
- **Leaf**: `SHA256(0x00 || path || SHA256(value))`
- **Node**: `SHA256(0x01 || leftHash || rightHash)`

## Example 3: Persistent Storage with Async API

For large trees that need to survive process restarts:

```csharp
using Nethereum.Merkle.Sparse;
using Nethereum.Util.ByteArrayConvertors;

var storage = new InMemorySmtNodeStorage();  // Replace with DB-backed implementation

var smt = new SparseMerkleBinaryTree<byte[]>(
    new PoseidonSmtHasher(),
    new ByteArrayToByteArrayConvertor(),
    new IdentitySmtKeyHasher(256),
    storage: storage);

// Async API for storage-backed operations
await smt.PutAsync(key1, value1);
await smt.PutAsync(key2, value2);
var root = await smt.ComputeRootAsync();

// Persist to storage
await smt.FlushAsync();

// Later — load from storage in a new instance
var smt2 = new SparseMerkleBinaryTree<byte[]>(
    new PoseidonSmtHasher(),
    new ByteArrayToByteArrayConvertor(),
    new IdentitySmtKeyHasher(256),
    storage: storage);

await smt2.LoadRootAsync(root);  // Lazy-loads nodes on demand
var value = await smt2.GetAsync(key1);
```

## Example 4: Batch Operations

Insert many leaves efficiently:

```csharp
var entries = new Dictionary<byte[], byte[]>
{
    { key1, value1 },
    { key2, value2 },
    { key3, value3 }
};

// Sync batch
smt.PutBatch(entries);

// Or async batch
await smt.PutBatchAsync(entries);

var root = smt.ComputeRoot();
Console.WriteLine($"Leaves: {smt.LeafCount}");
```

## Key Path Strategies

The `ISmtKeyHasher` controls how keys map to bit paths in the tree:

| Implementation | Description | Typical Use |
|---------------|-------------|-------------|
| `IdentitySmtKeyHasher(n)` | Key bits used directly as path | Pre-hashed keys, test vectors |
| `Sha256SmtKeyHasher` | `SHA256(key)` → 256-bit path | Variable-length keys |

```csharp
// 256-bit tree with SHA-256 key hashing
var smt = new SparseMerkleBinaryTree<byte[]>(
    new PoseidonSmtHasher(),
    new ByteArrayToByteArrayConvertor(),
    new Sha256SmtKeyHasher());
```

## Node Serialization (SmtNodeCodec)

For custom storage implementations, `SmtNodeCodec` encodes/decodes nodes:

```csharp
// Encode
byte[] encoded = SmtNodeCodec.EncodeLeaf(path, valueBytes);
byte[] branch = SmtNodeCodec.EncodeBranch(leftHash, rightHash);

// Decode
SmtNodeCodec.DecodeLeaf(encoded, out var path, out var value);
SmtNodeCodec.DecodeBranch(branch, 32, out var left, out var right);

// Type check
bool isLeaf = SmtNodeCodec.IsLeaf(data);    // 0x00 prefix
bool isBranch = SmtNodeCodec.IsBranch(data); // 0x01 prefix
```

## Related

- [Verify ZK Proofs (Groth16)](guide-zk-proof-verification) — Verify snarkjs proofs that reference SMT roots
- [Nethereum.Merkle Package Reference](nethereum-merkle) — Full API including standard and incremental trees
- [Nethereum.ZkProofsVerifier Package Reference](nethereum-zkproofsverifier) — Groth16 verification API
