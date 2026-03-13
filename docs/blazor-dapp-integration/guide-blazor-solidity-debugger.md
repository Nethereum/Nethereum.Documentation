---
title: "Solidity Debugger"
sidebar_label: "Solidity Debugger"
sidebar_position: 40
description: "Step-through Solidity debugging in the browser using Nethereum.Blazor.Solidity"
---

# Solidity Debugger

`Nethereum.Blazor.Solidity` provides an in-browser step-through debugger for Solidity smart contracts. It replays Ethereum transactions through the [Nethereum EVM Simulator](../evm-simulator/nethereum-evm), maps execution steps to Solidity source lines, and renders a full debugging UI with a Monaco editor, stack/memory/storage inspection, and opcode navigation.

## Setup

```bash
dotnet add package Nethereum.Blazor.Solidity
```

Targets `net10.0`. Works with Blazor Server (requires server-side access to compiled contract artifacts).

### Register Services

```csharp
using Nethereum.Blazor.Solidity;

builder.Services.AddSolidityDebugger();
```

This registers `IEvmDebugService` as a scoped `EvmDebugService`.

### Include Static Assets

In `App.razor` or `_Host.cshtml`:

```html
<script src="_content/Nethereum.Blazor.Solidity/solidity-monaco-interop.js"></script>
```

The Monaco editor is loaded from a CDN by the interop script.

## Debug a Transaction

Point the `EvmDebugger` component at a transaction hash and a directory containing compiled Solidity artifacts:

```razor
@using Nethereum.Blazor.Solidity.Components

<EvmDebugger TransactionHash="@txHash"
             Web3="@web3"
             ABIDirectory="@abiDir" />

@code {
    private string txHash = "0xabc123...";
    private Nethereum.Web3.Web3 web3 = new("http://localhost:8545");
    private string abiDir = "C:/project/out";
}
```

The `ABIDirectory` should point to the compiler output folder (Forge's `out/`, Hardhat's `artifacts/`, or `solc --combined-json` output). The debugger scans this directory to match deployed bytecode against compiled artifacts and load source maps.

## How It Works

1. `EvmDebugService` fetches the transaction and receipt via `eth_getTransactionByHash` / `eth_getTransactionReceipt`
2. The transaction is replayed through the Nethereum `EVMSimulator`, producing a full execution trace
3. `FileSystemABIInfoStorage.FindABIInfoByRuntimeBytecode()` matches deployed bytecode against compiled artifacts in the ABI directory
4. When source maps are found, trace steps are mapped to Solidity source locations
5. If EVM simulation is not available, falls back to `debug_traceTransaction` (opcode tracer)

## Debugger UI Components

The `EvmDebugger` is a composite of four sub-components:

### DebugControlBar

Step controls for navigating the execution trace:

- **GoToStart / GoToEnd** -- jump to first or last step
- **StepBack / StepForward** -- move one opcode at a time
- **PrevSourceLine / NextSourceLine** -- jump to the next step that maps to a different Solidity source location
- **GoToInputStep** -- jump to a specific step number

Displays the current step index, total steps, and current opcode.

### DebugSourcePanel

Monaco editor showing Solidity source with the current execution line highlighted. When multiple source files are involved (imports, libraries), file tabs allow switching between them.

### DebugOpcodeList

Scrollable list of all opcodes in the trace. Each entry shows the program counter, opcode mnemonic, and gas cost. The current step is highlighted and auto-scrolled into view.

### DebugStatePanel

Tabbed panel showing EVM state at the current step:

| Tab | Content |
|-----|---------|
| Stack | Current stack values (top-down, hex-encoded) |
| Memory | Memory contents in 32-byte rows |
| Storage | Key/value pairs written to storage at the current contract |
| Call Info | Contract address, caller, call depth, remaining gas, opcode, decoded function parameters |

## Programmatic Access

Use `IEvmDebugService` directly for custom debugging UIs:

```csharp
@inject IEvmDebugService DebugService

var result = await DebugService.ReplayTransactionAsync("0xabc123...");

if (result.Error != null)
{
    Console.WriteLine($"Replay failed: {result.Error}");
    return;
}

Console.WriteLine($"Total steps: {result.TotalSteps}");
Console.WriteLine($"Reverted: {result.IsRevert}");
Console.WriteLine($"Has source maps: {result.HasSourceMaps}");
Console.WriteLine($"Source files: {string.Join(", ", result.SourceFiles)}");
```

The `EvmReplayResult` contains:

```csharp
public class EvmReplayResult
{
    public EVMDebuggerSession Session { get; set; }
    public int TotalSteps { get; set; }
    public bool IsRevert { get; set; }
    public bool HasSourceMaps { get; set; }
    public string Error { get; set; }
    public List<string> SourceFiles { get; set; }
    public Dictionary<string, string> FileContents { get; set; }
}
```

## Source Map Requirements

For source-level debugging, you need compiled artifacts with source maps. Standard output formats are supported:

- **Forge**: `forge build` produces `out/ContractName.sol/ContractName.json` with `deployedBytecode`, `sourceMap`, and `sourcePaths`
- **Hardhat**: `npx hardhat compile` produces `artifacts/contracts/ContractName.sol/ContractName.json`
- **solc**: `solc --combined-json bin-runtime,srcmap-runtime,ast`

Without source maps, the debugger still works at the opcode level -- you get the full execution trace, stack, memory, and storage, but no Solidity source highlighting.

## Next Steps

- [EVM Simulator](../evm-simulator/nethereum-evm) -- the underlying execution engine
- [EVM Debugging Guide](../evm-simulator/guide-evm-debugging) -- debugging patterns and trace analysis
- [Nethereum.Blazor.Solidity](nethereum-blazor-solidity) -- full package API reference
