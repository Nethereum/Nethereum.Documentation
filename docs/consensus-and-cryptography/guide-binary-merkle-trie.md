---
title: Binary Merkle Trie (EIP-7864)
sidebar_label: Binary Merkle Trie (EIP-7864)
sidebar_position: 4
description: Use the EIP-7864 Binary Merkle Trie for stateless Ethereum execution with stems, proofs, and BLAKE3 hashing
---

# Binary Merkle Trie (EIP-7864)

:::tip Quick Start
Create a binary trie, insert data, and compute the root:

```csharp
var trie = new BinaryTrie();
trie.Put(key, value);      // 32-byte key, 32-byte value
var root = trie.ComputeRoot();
```
:::

## Why Binary Merkle Tries?

EIP-7864 proposes replacing Ethereum's Patricia Merkle Trie with a binary structure to enable **stateless block execution**. The key advantages:

- **Smaller proofs** — binary branching (2 children) vs hexary (16 children) means fewer sibling hashes per proof
- **Stem colocality** — account data, code, and storage for the same address share a 31-byte stem with 256 colocated values
- **Faster hashing** — BLAKE3 is ~6x faster than Keccak-256

This library implements the full EIP-7864 specification for experimentation, testing, and tooling.

## Prerequisites

```bash
dotnet add package Nethereum.Merkle.Binary
```

## How Stems Work

A 32-byte key is split into:
- **Stem** (bytes 0-30): Shared prefix identifying a node group
- **Suffix** (byte 31): Index 0-255 within the stem node

This means an account's basic data (nonce, balance), code hash, inline storage slots (0-63), and code chunks all share the same stem — a single proof path covers them all.

## Example 1: Basic Trie Operations

```csharp
using Nethereum.Merkle.Binary;

var trie = new BinaryTrie();

// Insert a key-value pair
var key = new byte[32];
key[31] = 0x01;
var value = new byte[32];
value[0] = 0xFF;

trie.Put(key, value);

// Retrieve
var result = trie.Get(key);  // Returns the value

// Delete (sets to zero, does not remove)
trie.Delete(key);

// Root hash
var root = trie.ComputeRoot();
```

## Example 2: Key Derivation for Accounts

`BinaryTreeKeyDerivation` maps Ethereum addresses and storage slots to trie keys:

```csharp
using Nethereum.Merkle.Binary.Keys;
using Nethereum.Merkle.Binary.Hashing;
using System.Numerics;

var kd = new BinaryTreeKeyDerivation(new Blake3HashProvider());
var address = new byte[20];  // Ethereum address

// Account basic data (nonce, balance, code size, version)
var basicDataKey = kd.GetTreeKeyForBasicData(address);

// Account code hash
var codeHashKey = kd.GetTreeKeyForCodeHash(address);

// Storage slot
var storageKey = kd.GetTreeKeyForStorageSlot(address, new BigInteger(42));

// Code chunk (each chunk is 31 bytes of bytecode)
var codeChunkKey = kd.GetTreeKeyForCodeChunk(address, chunkId: 0);
```

## Example 3: Pack Account State (BasicDataLeaf)

Pack account fields into a single 32-byte leaf value:

```csharp
using Nethereum.Merkle.Binary.Keys;
using System.Numerics;

// Pack
var leaf = BasicDataLeaf.Pack(
    version: 1,
    codeSize: 24576,
    nonce: 42,
    balance: BigInteger.Parse("1000000000000000000"));  // 1 ETH

// Unpack
BasicDataLeaf.Unpack(leaf, out var version, out var codeSize,
                      out var nonce, out var balance);
```

**Layout (32 bytes):**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 byte | Version |
| 1-4 | 4 bytes | Reserved |
| 5-7 | 3 bytes | Code size (big-endian) |
| 8-15 | 8 bytes | Nonce (big-endian) |
| 16-31 | 16 bytes | Balance (big-endian) |

## Example 4: Code Chunking

Split contract bytecode into 31-byte chunks with PUSH continuation tracking:

```csharp
using Nethereum.Merkle.Binary.Keys;

var bytecode = new byte[] { 0x60, 0x80, 0x60, 0x40, 0x52 };
var chunks = CodeChunker.ChunkifyCode(bytecode);

// Each chunk is 32 bytes: [continuation_byte][31 bytes of code]
// continuation_byte tracks how many bytes of a PUSH operand
// carry over from the previous chunk
```

## Example 5: Proof Generation and Verification

Generate a proof that a key exists in the trie, then verify it independently:

```csharp
using Nethereum.Merkle.Binary;
using Nethereum.Merkle.Binary.Proofs;

// Build trie with data
var trie = new BinaryTrie();
trie.Put(key, value);
var root = trie.ComputeRoot();

// Generate proof
var prover = new BinaryTrieProver(trie);
var proof = prover.BuildProof(key);

// Verify (only needs root hash, key, and proof — no trie needed)
var verifier = new BinaryTrieProofVerifier(trie.HashProvider);
var verified = verifier.VerifyProof(root, key, proof);
// verified contains the value if proof is valid, null otherwise
```

## Example 6: Stem-Level Bulk Operations

Insert or retrieve all 256 values at a stem in one operation:

```csharp
using Nethereum.Merkle.Binary;

var trie = new BinaryTrie();
var stem = new byte[31];

// Prepare sparse values (null entries = zero)
var values = new byte[256][];
values[0] = new byte[32]; values[0][0] = 0xAA;   // basic data
values[1] = new byte[32]; values[1][0] = 0xBB;   // code hash
values[128] = new byte[32]; values[128][0] = 0xCC; // first code chunk

// Bulk insert
trie.PutStem(stem, values);

// Bulk retrieve
var retrieved = trie.GetValuesAtStem(stem);
```

## Hash Providers

```csharp
using Nethereum.Merkle.Binary.Hashing;
using Nethereum.Util.HashProviders;

// SHA-256 — default
var sha256Trie = new BinaryTrie(new Sha256HashProvider());

// BLAKE3 — faster, managed .NET implementation
var blake3Trie = new BinaryTrie(new Blake3HashProvider());
```

## Related

- [Nethereum.Merkle.Binary Package Reference](nethereum-merkle-binary) — Full API reference
- [Nethereum.Merkle Package Reference](nethereum-merkle) — Standard and sparse Merkle trees
- [Sparse Merkle Trees for ZK Circuits](guide-sparse-merkle-zk) — ZK-optimized trees with Poseidon hashing
