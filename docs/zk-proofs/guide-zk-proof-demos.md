---
title: "ZK Proof Generation Demos"
sidebar_label: "ZK Proof Demos"
sidebar_position: 2
description: "Browser-based and native ZK proof generation demos using Nethereum's Privacy Pools commitment circuit"
---

# ZK Proof Generation Demos

Two demo applications demonstrate end-to-end Groth16 zero-knowledge proof generation and verification using Nethereum's ZK proof packages and the Privacy Pools commitment circuit.

Both demos include educational UI explaining what ZK proofs are, how Privacy Pools work, and what each step in the pipeline does.

## Architecture Overview

```
                     ┌─────────────────────────────────┐
                     │        Circuit Artifacts          │
                     │   Nethereum.PrivacyPools.Circuits │
                     │  (commitment.wasm / .graph.bin    │
                     │   commitment.zkey, _vk.json)      │
                     └──────────┬──────────┬─────────────┘
                                │          │
              ┌─────────────────┘          └──────────────────┐
              ▼                                               ▼
   ┌──────────────────────┐                    ┌──────────────────────────┐
   │   Browser Path        │                    │   Native Path             │
   │  (Blazor WASM Demo)   │                    │  (Avalonia Desktop Demo)  │
   │                        │                    │                           │
   │  snarkjs (JS interop)  │                    │  CircomWitnessCalc (C)    │
   │  SnarkjsBlazorProvider │                    │  RapidSnarkProver (C++)   │
   └──────────┬─────────────┘                    └──────────┬────────────────┘
              │                                              │
              ▼                                              ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                    Proof Verification                            │
   │               Nethereum.ZkProofsVerifier                         │
   │          CircomGroth16Adapter.Verify(proof, vk, signals)         │
   │              Pure C# BN128 pairing check                         │
   └──────────────────────────────────────────────────────────────────┘
```

## Blazor WebAssembly Demo

**Location:** `src/demos/Nethereum.ZkProofs.Blazor.Demo/`

Uses snarkjs JavaScript running in the browser via Blazor JS interop.

### Running

```bash
cd src/demos/Nethereum.ZkProofs.Blazor.Demo
dotnet run
# Open http://localhost:5000 in your browser
```

### Pipeline

1. **Load** — snarkjs is loaded via `<script>` tag; circuit WASM and zkey are loaded from embedded resources
2. **Prove** — snarkjs evaluates the WASM circuit and computes the Groth16 proof in JavaScript
3. **Verify** — `CircomGroth16Adapter.Verify()` checks the proof in pure C#

### Packages

| Package | Role |
|---------|------|
| `Nethereum.ZkProofs.Snarkjs.Blazor` | JS interop with snarkjs for proof generation |
| `Nethereum.PrivacyPools.Circuits` | Embedded circuit artifacts |
| `Nethereum.ZkProofsVerifier` | Pure C# Groth16 verification |

## Avalonia Desktop Demo

**Location:** `src/demos/Nethereum.ZkProofs.Avalonia.Demo/`

Uses native C/C++ libraries for proof generation — no JavaScript or browser required.

### Running

```bash
cd src/demos/Nethereum.ZkProofs.Avalonia.Demo
dotnet run
```

### Pipeline

1. **Witness** — `WitnessCalculator.CalculateWitness(graphData, inputsJson)` evaluates the circuit constraints natively using circom-witnesscalc
2. **Prove** — `RapidSnarkProver.Prove(zkeyBytes, witnessBytes)` generates the Groth16 proof using optimised native multi-scalar multiplication
3. **Verify** — `CircomGroth16Adapter.Verify()` checks the proof in pure C#

### Packages

| Package | Role |
|---------|------|
| `Nethereum.CircomWitnessCalc` | Native witness generation (NuGet with native DLLs) |
| `Nethereum.ZkProofs.RapidSnark` | Native Groth16 proof generation (NuGet with native DLLs) |
| `Nethereum.PrivacyPools.Circuits` | Embedded circuit artifacts |
| `Nethereum.ZkProofsVerifier` | Pure C# Groth16 verification |

## Browser vs Native Comparison

| Aspect | Browser (Blazor) | Native (Avalonia) |
|--------|-------------------|-------------------|
| Proof engine | snarkjs (JavaScript) | rapidsnark (C++) |
| Witness computation | WASM circuit evaluation | circom-witnesscalc (C) |
| Typical proof time | 2-10 seconds | 50-500 milliseconds |
| Platform | Any modern browser | Windows, Linux, macOS, Android |
| Privacy | Private inputs stay in browser | Private inputs stay on device |
| Dependencies | snarkjs.min.js (673 KB) | Native DLLs (bundled in NuGet) |
| Verification | Pure C# (same) | Pure C# (same) |

## The Privacy Pools Commitment Circuit

Both demos use the same commitment circuit from `Nethereum.PrivacyPools.Circuits`:

**Private inputs** (never revealed):
- `nullifier` — random number for double-spend prevention
- `secret` — combined with nullifier to create the commitment

**Public inputs** (visible to verifiers):
- `value` — deposit amount in wei
- `label` — Association Set identifier

**Public outputs**:
- `commitmentHash` — `Hash(nullifier, secret, value, label)` — uniquely identifies the deposit on-chain
- `nullifierHash` — `Hash(nullifier)` — published on withdrawal to prevent double-spending

The proof demonstrates: "I know a (nullifier, secret) pair that produces this commitment hash" — without revealing the nullifier or secret.
