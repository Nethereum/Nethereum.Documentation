---
title: Zero-Knowledge Proofs
sidebar_label: Overview
sidebar_position: 1
description: Groth16 proof generation and verification, browser and native providers, Circom circuit integration, and Solidity-compatible proof formatting
---

# Zero-Knowledge Proofs

Nethereum provides a complete ZK proof pipeline — generation, verification, and Solidity-compatible proof formatting — for Groth16 proofs on the BN128 elliptic curve.

## Proof Generation

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

## Proof Verification

`Nethereum.ZkProofsVerifier` provides pure C# Groth16 verification on the BN128 curve. Directly consumes snarkjs/Circom JSON output:

```csharp
var result = CircomGroth16Adapter.Verify(proofJson, vkJson, publicJson);
```

## Demo Applications

Two working demos show the full generate-and-verify flow with educational UI:

- **Blazor WASM** — `src/demos/Nethereum.ZkProofs.Blazor.Demo/` (browser-based, snarkjs)
- **Avalonia Desktop** — `src/demos/Nethereum.ZkProofs.Avalonia.Demo/` (native, rapidsnark)

## Packages

| Package | Description |
|---|---|
| `Nethereum.ZkProofs` | Provider-agnostic interfaces and models for ZK proof generation |
| `Nethereum.ZkProofsVerifier` | Pure C# Groth16 verification on BN128 (Circom/snarkjs) |
| `Nethereum.ZkProofs.Snarkjs.Blazor` | Browser-based Groth16 proof generation via snarkjs JS interop |
| `Nethereum.ZkProofs.RapidSnark` | Native Groth16 proof generation via rapidsnark (P/Invoke) |
| `Nethereum.CircomWitnessCalc` | Native witness generation via circom-witnesscalc (P/Invoke) |
