---
title: Verify ZK Proofs (Groth16)
sidebar_label: Verify ZK Proofs (Groth16)
sidebar_position: 2
description: Verify Groth16 zero-knowledge proofs from Circom/snarkjs circuits in .NET using Nethereum.ZkProofsVerifier
---

# Verify ZK Proofs (Groth16)

:::tip One-Liner Verification
If you have snarkjs JSON output files, verify a proof in a single call:

```csharp
var result = CircomGroth16Adapter.Verify(proofJson, vkJson, publicJson);
```

This parses all three files, runs the BN128 pairing check, and returns `result.IsValid`.
:::

## Why Verify ZK Proofs in .NET?

Zero-knowledge proofs allow one party to prove a statement is true without revealing the underlying data. Groth16 is the most widely used ZK proof system in Ethereum (used by Zcash, Tornado Cash, Privacy Pools, and many rollups). While proof generation typically happens in JavaScript or Rust, **verification** can happen anywhere — and for server-side .NET applications, native verification avoids costly interop with Node.js or WASM runtimes.

Common use cases:
- **Backend validation** of ZK proofs before submitting transactions
- **Cross-checking** native verification against on-chain Solidity verifiers
- **Privacy-preserving applications** where proof verification is part of a .NET pipeline

## Prerequisites

Install the NuGet package:

```bash
dotnet add package Nethereum.ZkProofsVerifier
```

You will also need three JSON files produced by [snarkjs](https://github.com/iden3/snarkjs) after proving a Circom circuit:
- `proof.json` — The Groth16 proof (G1/G2 curve points)
- `verification_key.json` — The verification key from the trusted setup
- `public.json` — The public circuit inputs

## How It Works

Groth16 verification checks a pairing equation on the BN128 elliptic curve:

```
e(-A, B) · e(Alpha, Beta) · e(vkX, Gamma) · e(C, Delta) = 1
```

Where `vkX = IC[0] + IC[1]·input[0] + IC[2]·input[1] + ...`

If the equation holds, the proof is valid — the prover knew a valid witness for the circuit without revealing it.

## Example 1: Verify a Circom Proof (Recommended)

The simplest approach uses `CircomGroth16Adapter` which handles all parsing internally:

```csharp
using Nethereum.ZkProofsVerifier.Circom;

// Load snarkjs output
var proofJson = File.ReadAllText("proof.json");
var vkJson = File.ReadAllText("verification_key.json");
var publicJson = File.ReadAllText("public.json");

// Verify
var result = CircomGroth16Adapter.Verify(proofJson, vkJson, publicJson);

if (result.IsValid)
{
    Console.WriteLine("Proof verified successfully!");
}
else
{
    Console.WriteLine($"Verification failed: {result.Error}");
}
```

## Example 2: Parse and Inspect Before Verifying

When you need to inspect the proof structure or validate inputs before verification:

```csharp
using Nethereum.ZkProofsVerifier.Circom;
using Nethereum.ZkProofsVerifier.Groth16;

// Parse each component
var proof = SnarkjsProofParser.Parse(proofJson);
var vk = SnarkjsVerificationKeyParser.Parse(vkJson);
var publicInputs = SnarkjsPublicInputParser.Parse(publicJson);

// Inspect structure
Console.WriteLine($"Public inputs: {publicInputs.Length}");
Console.WriteLine($"IC points in VK: {vk.IC.Length}");  // Must be publicInputs.Length + 1

// Verify
var verifier = new Groth16Verifier();
var result = verifier.Verify(proof, vk, publicInputs);
```

## Example 3: Detect Tampered Proofs

Groth16 verification rejects any modification to the proof, inputs, or verification key. The simplest way to demonstrate this is to verify a valid proof against a different circuit's verification key or public inputs:

```csharp
using Nethereum.ZkProofsVerifier.Circom;

// Verify with mismatched files — proof from circuit A, VK from circuit B
var result = CircomGroth16Adapter.Verify(proofJsonA, vkJsonB, publicJsonA);
// result.IsValid == false — VK doesn't match the proof's circuit

// Or verify with tampered public inputs JSON
var tamperedPublicJson = "[\"999\"]";
var result2 = CircomGroth16Adapter.Verify(proofJson, vkJson, tamperedPublicJson);
// result2.IsValid == false — inputs don't match what was proven
```

## Understanding the G2 Coordinate Swap

When working with G2 curve points directly (not through the parsers), be aware that snarkjs stores Fp2 elements as `[c0, c1]` (imaginary, real) while the internal `Fp2` constructor takes `Fp2(a, b)` where the parameters are swapped. The built-in parsers handle this automatically — you only need to account for this if constructing `TwistPoint` objects manually.

## Error Messages

| Error | Cause |
|-------|-------|
| `"Proof is null"` | Null proof object passed to verifier |
| `"Public inputs array is null"` | Null public inputs |
| `"Expected N public inputs but got M"` | IC array length doesn't match inputs + 1 |
| `"Pairing check failed"` | Proof is invalid (tampered or wrong inputs) |

## Related

- [Nethereum.ZkProofsVerifier Package Reference](nethereum-zkproofsverifier) — Full API reference
- [Sparse Merkle Trees for ZK Circuits](guide-sparse-merkle-zk) — Build ZK-compatible state trees with Poseidon hashing
