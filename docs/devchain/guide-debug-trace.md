---
title: Debug & Trace
sidebar_label: Debug & Trace
sidebar_position: 6
description: Trace transaction execution at the opcode level with debug_traceTransaction and debug_traceCall
---

# Debug & Trace

When a transaction fails or behaves unexpectedly, you need to see exactly what the EVM did — which opcodes executed, what values were on the stack, when storage was read or written. DevChain supports Geth-compatible `debug_traceTransaction` and `debug_traceCall` methods that give you opcode-level execution traces.

This builds on the [Testing Patterns](guide-testing-patterns) guide. If you're not yet familiar with DevChain test fixtures, start there.

## Prerequisites

```bash
dotnet add package Nethereum.DevChain
```

## Trace a Mined Transaction

After a transaction has been mined, trace its full execution:

```csharp
using Nethereum.DevChain;
using Nethereum.CoreChain.Tracing;
using Nethereum.Web3.Accounts;

var account = new Account("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
var node = new DevChainNode();
await node.StartAsync(account);
var web3 = node.CreateWeb3(account);

// Send a transaction
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync("0x70997970C51812dc3A010C7d01b50e0d17dc79C8", 1.0m);

// Trace it
var traceConfig = new OpcodeTraceConfig
{
    DisableMemory = false,
    DisableStack = false,
    DisableStorage = false
};

var trace = await node.TraceTransactionAsync(receipt.TransactionHash, traceConfig);
```

The trace result contains a `StructLogs` array — one entry per executed opcode. Each entry includes:

| Field | Description |
|-------|-------------|
| `Pc` | Program counter |
| `Op` | Opcode name (PUSH1, SLOAD, CALL, etc.) |
| `Gas` | Gas remaining |
| `GasCost` | Gas consumed by this opcode |
| `Depth` | Call depth (1 = top-level, 2+ = internal calls) |
| `Stack` | Stack contents (bottom to top) |
| `Memory` | Memory contents (hex) |
| `Storage` | Storage changes at this step |

## Trace a Call Without Mining

`debug_traceCall` lets you trace a hypothetical call without actually mining it — useful for debugging `eth_call` failures or simulating contract interactions:

```csharp
using Nethereum.RPC.Eth.DTOs;

var callInput = new CallInput
{
    From = account.Address,
    To = contractAddress,
    Data = functionData
};

var trace = await node.TraceCallAsync(
    callInput,
    new OpcodeTraceConfig { DisableMemory = true },
    stateOverrides: null
);
```

### With State Overrides

You can modify state for the trace without affecting the actual chain — useful for "what if" scenarios:

```csharp
var overrides = new Dictionary<string, StateOverride>
{
    [account.Address] = new StateOverride
    {
        Balance = new HexBigInteger(Web3.Convert.ToWei(1_000_000))
    }
};

var trace = await node.TraceCallAsync(callInput, traceConfig, overrides);
```

State overrides only apply to this trace call — the chain state is not modified.

## Reading Traces via RPC

When using the HTTP server, trace via standard JSON-RPC:

```bash
# Trace a mined transaction
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "debug_traceTransaction",
    "params": ["0xTXHASH", {"disableMemory": true}],
    "id": 1
  }'

# Trace a call
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "debug_traceCall",
    "params": [
      {"from": "0x...", "to": "0x...", "data": "0x..."},
      "latest",
      {"disableMemory": true}
    ],
    "id": 1
  }'
```

## Trace Configuration

Control what data is captured to balance detail vs. performance:

```csharp
var traceConfig = new OpcodeTraceConfig
{
    DisableMemory = true,   // Skip memory dumps (large, often not needed)
    DisableStack = false,   // Keep stack data (essential for debugging)
    DisableStorage = false  // Keep storage changes (useful for state debugging)
};
```

For simple gas analysis, disable everything except the opcodes:

```csharp
var minimal = new OpcodeTraceConfig
{
    DisableMemory = true,
    DisableStack = true,
    DisableStorage = true
};
```

## Debugging Patterns

### Find Where a Transaction Reverts

Look for the `REVERT` opcode in the trace:

```csharp
var trace = await node.TraceTransactionAsync(txHash, traceConfig);

foreach (var step in trace.StructLogs)
{
    if (step.Op == "REVERT")
    {
        Console.WriteLine($"Revert at PC={step.Pc}, depth={step.Depth}, gas={step.Gas}");
        // The revert reason is in memory at this point
        break;
    }
}
```

### Track Storage Changes

Filter for `SSTORE` operations to see what the contract wrote:

```csharp
foreach (var step in trace.StructLogs)
{
    if (step.Op == "SSTORE" && step.Storage != null)
    {
        foreach (var (slot, value) in step.Storage)
        {
            Console.WriteLine($"SSTORE slot={slot} value={value}");
        }
    }
}
```

### Identify External Calls

`CALL`, `STATICCALL`, and `DELEGATECALL` opcodes indicate cross-contract interactions. Watch for depth changes:

```csharp
var maxDepth = trace.StructLogs.Max(s => s.Depth);
Console.WriteLine($"Max call depth: {maxDepth}");

foreach (var step in trace.StructLogs.Where(s => s.Op.Contains("CALL")))
{
    Console.WriteLine($"{step.Op} at depth={step.Depth}, gas={step.Gas}");
}
```

## Connection to EVM Simulator

DevChain's tracing uses the same EVM engine described in the [EVM Simulator](/docs/evm-simulator/overview) section. For deeper analysis — call tree decoding, log extraction, state change extraction — see:

- [Transaction Simulation](/docs/evm-simulator/guide-transaction-simulation) — the simulation pipeline that powers DevChain
- [Call Tree Decoding](/docs/evm-simulator/guide-call-tree-decoding) — decode internal calls from traces
- [Revert Decoding](/docs/evm-simulator/guide-revert-decoding) — extract revert reasons from failed transactions

## Next Steps

- [Testing Patterns](guide-testing-patterns) — combine tracing with snapshot/revert for debugging test failures
- [Forking & State](guide-forking-and-state) — trace forked transactions against real mainnet state
- [Quick Start](devchain-quickstart) — if you need a refresher on basic setup
- For the complete trace API, see the [Nethereum.DevChain package reference](nethereum-devchain)
