---
title: EVM Simulator
sidebar_label: Overview
sidebar_position: 1
description: Full in-process EVM simulator with tracing, debugging, and state change extraction
---

# EVM Simulator

Nethereum includes a full in-process Ethereum Virtual Machine supporting all opcodes through Prague/Cancun, with native precompile implementations, call tracing, state change extraction, and step-by-step debugging. It passes all Ethereum VM and State tests.

The EVM simulator is the foundational engine that powers several higher-level Nethereum systems:

| System | How It Uses the EVM | Frontend |
|--------|---------------------|----------|
| **Wallet Transaction Preview** | Simulates transactions and extracts all balance changes (ETH, ERC-20, ERC-721, ERC-1155) before the user signs | `Nethereum.Wallet.UI.Components.Blazor` |
| **DevChain** | Powers the in-process development node for local testing | — |
| **CoreChain** | Full chain execution engine for application chains | — |
| **Account Abstraction Bundler** | Validates UserOperations via ERC-7562 simulation rules | — |
| **Solidity Debugger** | Source-level debugging with Solidity source maps and step navigation | `Nethereum.Blazor.Solidity` |

## The Simple Path

For most developers, the EVM simulator is used through the transaction simulation pipeline:

```csharp
// 1. Connect to blockchain state
var nodeDataService = new RpcNodeDataService(web3.Eth, new BlockParameter(blockNumber));
var executionState = new ExecutionStateService(nodeDataService);

// 2. Build execution context
var ctx = new TransactionExecutionContext
{
    Mode = ExecutionMode.Call,
    Sender = from, To = to, Data = calldata,
    GasLimit = 10_000_000,
    ExecutionState = executionState,
    TraceEnabled = true
    // ... block context fields
};

// 3. Execute
var executor = new TransactionExecutor(HardforkConfig.Default);
var result = await executor.ExecuteAsync(ctx);

// 4. Decode and extract
var decoder = new ProgramResultDecoder(abiStorage);
var decoded = decoder.Decode(result, callInput, chainId);

var extractor = new StateChangesExtractor();
var stateChanges = extractor.ExtractFromDecodedResult(decoded, executionState, userAddress);
```

This pipeline handles gas calculation, EIP-1559 fees, sub-call execution, ABI decoding, and balance change extraction automatically.

## Capabilities

- All opcodes including PUSH0, MCOPY, TSTORE/TLOAD, BLOBHASH, BLOBBASEFEE
- EIP-1559, EIP-4844 (blobs), EIP-7702 (authorization lists) transaction types
- Call frame tracking and access list (EIP-2929) with warm/cold gas accounting
- Full transaction execution pipeline with gas accounting
- ABI-aware decoding of call trees, events, and errors
- State change extraction for ETH, ERC-20, ERC-721, and ERC-1155 transfers
- Balance validation (fee-on-transfer, rebasing token detection)
- Interactive debugging sessions with source map support
- Bytecode disassembly and function signature detection
- Configurable hardfork rules (Cancun, Prague)
- Precompiled contracts: ecRecover, SHA-256, RIPEMD-160, identity, modexp, alt_bn128, blake2f, BLS12-381, KZG

## Packages

| Package | Description |
|---|---|
| `Nethereum.EVM` | Core EVM simulator, transaction executor, decoder, state changes extractor, debugger |
| `Nethereum.EVM.Contracts` | ERC-20 contract simulator with storage layout discovery |
| `Nethereum.EVM.Precompiles.Bls` | BLS12-381 precompile (EIP-2537) |
| `Nethereum.EVM.Precompiles.Kzg` | KZG Point Evaluation precompile (EIP-4844) |

## Guides

### Simulation & Decoding

| Guide | What You'll Learn |
|---|---|
| [Transaction Simulation](guide-transaction-simulation) | Simulate transactions locally and preview all state changes before signing — the wallet preview pattern |
| [Call Tree Decoding](guide-call-tree-decoding) | Decode the full call hierarchy with function names, decoded parameters, and sub-calls |
| [Log Extraction](guide-log-extraction) | Extract and decode events, and consolidate token transfers into net balance changes |
| [Revert Decoding](guide-revert-decoding) | Decode revert reasons, custom errors, and Solidity panic codes |

### Advanced

| Guide | What You'll Learn |
|---|---|
| [ERC-20 Simulation](guide-erc20-simulation) | Simulate token transfers, approvals, and detect fee-on-transfer tokens |
| [Bytecode Execution](guide-bytecode-execution) | Execute raw EVM bytecode step-by-step with full stack, memory, and trace access |
| [EVM Debugging](guide-evm-debugging) | Interactive source-level debugging with Solidity source maps |
| [Bytecode Disassembly](guide-bytecode-disassembly) | Parse and analyze bytecode structure, detect function signatures |
