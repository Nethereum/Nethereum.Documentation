---
title: Bytecode Execution
sidebar_label: Bytecode Execution
sidebar_position: 7
description: Execute raw EVM bytecode step-by-step with full stack, memory, and trace access
---

# Bytecode Execution

The `EVMSimulator` executes EVM bytecode instruction-by-instruction, giving you direct access to the stack, memory, storage, and execution trace at every step. This is the lowest level of the EVM simulator — useful for testing individual opcodes, understanding gas costs, or building custom EVM tooling.

For most use cases (simulating transactions, extracting state changes), use the higher-level [Transaction Simulation](guide-transaction-simulation) pipeline instead.

## Prerequisites

```bash
dotnet add package Nethereum.EVM
```

## Running Bytecode

The simplest way to execute bytecode is with `ExecuteAsync`:

```csharp
using Nethereum.EVM;
using Nethereum.Hex.HexConvertors.Extensions;

// PUSH1 0x04, PUSH1 0x04, ADD → pushes 8 onto the stack
var bytecode = "6004600401".HexToByteArray();

var vm = new EVMSimulator();
var program = new Program(bytecode);

await vm.ExecuteAsync(program);

var result = program.StackPeek(); // 0x0000...0008
Console.WriteLine($"Result: {result.ToHex()}");
```

The bytecode `6004600401` breaks down as: `PUSH1 0x04` (push 4), `PUSH1 0x04` (push 4), `ADD` (pop two, push sum). After execution, the stack contains a single value: 8.

## Step-by-Step Execution

For debugging or analysis, step through instructions one at a time:

```csharp
var bytecode = "60F0600F17".HexToByteArray(); // PUSH1 0xF0, PUSH1 0x0F, OR
var vm = new EVMSimulator();
var program = new Program(bytecode);

// Step 1: PUSH1 0xF0
await vm.StepAsync(program, 0);
Console.WriteLine($"Stack: [{program.StackPeek().ToHex()}]");
// Stack: [0xF0]

// Step 2: PUSH1 0x0F
await vm.StepAsync(program, 1);
// Stack: [0x0F, 0xF0]

// Step 3: OR (0xF0 | 0x0F = 0xFF)
await vm.StepAsync(program, 2);
Console.WriteLine($"Result: {program.StackPeek().ToHex()}");
// Stack: [0xFF]
```

The second parameter to `StepAsync` is the step index, which maps to the position in `program.Instructions`.

## Working with the Stack

EVM stack values are 32 bytes (256 bits). The `Program` class provides stack operations:

```csharp
// Push a value
program.StackPush(new byte[32] { /* value */ });

// Peek at top (without removing)
var top = program.StackPeek();

// Peek at a specific position (0 = top)
var second = program.StackPeekAt(1);

// Pop the top value
program.StackPop();

// Swap top with position N
program.StackSwap(1);  // Swap top with second item

// Get full stack as hex strings
var stack = program.GetCurrentStackAsHex();
```

The stack has a maximum size of 1024 entries (`Program.MAX_STACKSIZE`).

## Memory Operations

EVM memory is a byte-addressable array that expands automatically in 32-byte increments:

```csharp
// Write to memory
byte[] data = new byte[] { 0x01, 0x02, 0x03 };
program.WriteToMemory(index: 0, totalSize: 32, data: data, extend: true);

// Read memory size
var size = program.Memory.Count;
Console.WriteLine($"Memory size: {size} bytes");
```

Memory expansion costs gas — the cost grows quadratically with size.

## Execution with Blockchain State

To execute contract bytecode that reads storage, balances, or calls other contracts, provide an `ExecutionStateService`:

```csharp
using Nethereum.EVM.BlockchainState;
using Nethereum.Web3;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR_KEY");
var nodeDataService = new RpcNodeDataService(
    web3.Eth, BlockParameter.CreateLatest());
var stateService = new ExecutionStateService(nodeDataService);

// Create execution context
var callInput = new CallInput
{
    From = "0x0000000000000000000000000000000000000001",
    To = "0xContractAddress",
    Gas = new HexBigInteger(1000000),
    Data = "0x70a08231000000000000000000000000YourAddress" // balanceOf(address)
};

var context = new ProgramContext(callInput, stateService);

// Get contract bytecode
var contractCode = await stateService.GetCodeAsync(callInput.To);

// Execute
var vm = new EVMSimulator();
var program = new Program(contractCode, context);
await vm.ExecuteAsync(program, traceEnabled: true);

// Result
if (!program.ProgramResult.IsRevert)
{
    var returnData = program.ProgramResult.Result;
    Console.WriteLine($"Return: {returnData.ToHex()}");
}
```

The `RpcNodeDataService` fetches state on demand: when the contract reads storage (`SLOAD`), checks a balance (`BALANCE`), or calls another contract (`CALL`), the data is fetched from the RPC node and cached.

## Analyzing Traces

When `traceEnabled: true`, every instruction is recorded with its stack, memory, storage state, and gas cost:

```csharp
await vm.ExecuteAsync(program, traceEnabled: true);

foreach (var trace in program.Trace)
{
    Console.WriteLine($"Step {trace.VMTraceStep}: " +
        $"{trace.Instruction?.Instruction} " +
        $"Gas: {trace.GasCost} " +
        $"Depth: {trace.Depth}");
}

// Total gas
var totalGas = program.Trace.Sum(t => t.GasCost);
Console.WriteLine($"Total gas: {totalGas}");
```

Each `ProgramTrace` entry includes:
- `VMTraceStep` — global step counter
- `Instruction` — the executed opcode
- `Stack` — stack snapshot at that point
- `Memory` — memory snapshot
- `Storage` — storage changes
- `GasCost` — gas consumed by this instruction
- `Depth` — call depth (0 for top-level)

## Conditional Jumps

Here's an example testing conditional execution with `JUMPI`:

```csharp
// PUSH1 0x01 (condition=true), PUSH1 0x05 (target), JUMPI, JUMPDEST, PUSH1 0xCC
var bytecode = "60016005575B60CC".HexToByteArray();

var vm = new EVMSimulator();
var program = new Program(bytecode);
await vm.ExecuteAsync(program);

var result = program.StackPeek(); // 0xCC — jump was taken
```

When the condition is 1 (true), `JUMPI` jumps to the `JUMPDEST` at byte offset 5, then pushes `0xCC`. If the condition were 0, execution would continue sequentially (hitting `JUMPDEST` and `PUSH1 0xCC` anyway in this case, since the destination is the next instruction).

## Next Steps

- [Bytecode Disassembly](guide-bytecode-disassembly) — parse and disassemble bytecode without executing it
- [EVM Debugging](guide-evm-debugging) — interactive source-level debugging with Solidity source maps
- [Transaction Simulation](guide-transaction-simulation) — the higher-level pipeline for simulating full transactions
