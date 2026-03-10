---
title: EVM Simulator
sidebar_label: Overview
sidebar_position: 1
description: Full in-process EVM simulator with tracing, debugging, and state change extraction
---

# EVM Simulator

Nethereum includes a full in-process Ethereum Virtual Machine supporting all opcodes through Prague/Cancun, with native precompile implementations, call tracing, state change extraction, and step-by-step debugging.

## Capabilities

- All opcodes including PUSH0, MCOPY, TSTORE/TLOAD, BLOBHASH
- Call frame tracking and access list (EIP-2929)
- Gas accounting and state change extraction
- Async debugging sessions with step-by-step execution
- Precompiled contracts: ecRecover, SHA-256, RIPEMD-160, identity, modexp, alt_bn128, blake2f

## Use Cases

- **Transaction preview** — simulate state changes before signing
- **Testing** — execute contract logic without an external node
- **Debugging** — step through EVM execution with full trace
- **Compliance** — validate ERC-7562 rules for account abstraction

## Packages

| Package | Description |
|---|---|
| `Nethereum.EVM` | Core EVM simulator |
| `Nethereum.EVM.Contracts` | Precompiled contract implementations |
| `Nethereum.EVM.Precompiles.Bls` | BLS12-381 precompile (EIP-2537) |
| `Nethereum.EVM.Precompiles.Kzg` | KZG Point Evaluation precompile (EIP-4844) |
