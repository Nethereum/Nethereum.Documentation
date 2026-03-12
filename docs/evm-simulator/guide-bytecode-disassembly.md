---
title: Bytecode Disassembly
sidebar_label: Bytecode Disassembly
sidebar_position: 9
description: Parse, disassemble, and analyze EVM bytecode to understand contract structure
---

# Bytecode Disassembly

After [executing bytecode](guide-bytecode-execution) or [debugging with source maps](guide-evm-debugging), you may want to analyze bytecode structure statically — what opcodes it contains, which function selectors are present, and how the code is organized. The `ProgramInstructionsUtils` class provides tools for parsing and disassembling EVM bytecode without executing it.

This is useful for security analysis (checking for specific opcodes), contract verification (confirming expected function signatures), or simply understanding what a deployed contract does at the bytecode level.

## Prerequisites

```bash
dotnet add package Nethereum.EVM
```

## Disassembling Bytecode

The simplest way to understand bytecode is to disassemble it into human-readable opcodes:

```csharp
using Nethereum.EVM;

var bytecode = "0x6080604052600436106100..."; // Contract bytecode

// Full disassembly with byte offsets
var disassembly = ProgramInstructionsUtils.DisassembleToString(bytecode);
Console.WriteLine(disassembly);
```

The output shows each instruction with its byte offset, opcode byte, mnemonic, and operand:

```
0000   60   PUSH1  0x80
0002   60   PUSH1  0x40
0004   52   MSTORE
0005   60   PUSH1  0x04
0007   36   CALLDATASIZE
0008   10   LT
```

For a more compact view without byte offsets:

```csharp
var simplified = ProgramInstructionsUtils.DisassembleSimplifiedToString(bytecode);
Console.WriteLine(simplified);
// Output: PUSH1 0x80 PUSH1 0x40 MSTORE PUSH1 0x04 CALLDATASIZE LT ...
```

## Parsing into Instructions

For programmatic analysis, parse bytecode into structured `ProgramInstruction` objects:

```csharp
var instructions = ProgramInstructionsUtils.GetProgramInstructions(bytecode);

Console.WriteLine($"Total instructions: {instructions.Count}");

foreach (var instruction in instructions)
{
    Console.WriteLine($"Offset {instruction.Step}: {instruction.Instruction}");
}
```

Each `ProgramInstruction` contains the opcode, its position in the bytecode, and any operand bytes (for `PUSH1` through `PUSH32`).

## Detecting Function Signatures

Solidity compilers typically place function selector checks at the start of the bytecode — comparing `msg.sig` (the first 4 bytes of calldata) against known function selectors. You can check whether a contract contains a specific function:

```csharp
var instructions = ProgramInstructionsUtils.GetProgramInstructions(contractBytecode);

// Check for transfer(address,uint256)
bool hasTransfer = ProgramInstructionsUtils.ContainsFunctionSignature(
    instructions,
    "0xa9059cbb"
);

// Check for multiple signatures at once
var signatures = new[] { "0xa9059cbb", "0x70a08231", "0x095ea7b3" };
// transfer, balanceOf, approve
bool hasAll = ProgramInstructionsUtils.ContainsFunctionSignatures(instructions, signatures);

Console.WriteLine($"Has transfer: {hasTransfer}");
Console.WriteLine($"Has all ERC-20 functions: {hasAll}");
```

This checks whether the selector bytes appear as `PUSH4` operands in the bytecode — the standard pattern for Solidity function dispatch.

## Real-World Example: Analyzing a Deployed Contract

Fetch a contract's bytecode from the blockchain and analyze it:

```csharp
using Nethereum.EVM;
using Nethereum.Web3;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR_KEY");

// Fetch USDC contract bytecode
var usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
var bytecode = await web3.Eth.GetCode.SendRequestAsync(usdcAddress);

var instructions = ProgramInstructionsUtils.GetProgramInstructions(bytecode);
Console.WriteLine($"Total instructions: {instructions.Count}");

// Check for standard ERC-20 functions
var erc20Signatures = new[]
{
    "0x70a08231", // balanceOf(address)
    "0xa9059cbb", // transfer(address,uint256)
    "0x23b872dd", // transferFrom(address,address,uint256)
    "0x095ea7b3", // approve(address,uint256)
    "0xdd62ed3e", // allowance(address,address)
    "0x18160ddd", // totalSupply()
};

foreach (var sig in erc20Signatures)
{
    bool found = ProgramInstructionsUtils.ContainsFunctionSignature(instructions, sig);
    Console.WriteLine($"  {sig}: {(found ? "found" : "missing")}");
}

// Full disassembly
var disassembly = ProgramInstructionsUtils.DisassembleToString(bytecode);
Console.WriteLine(disassembly);
```

This pattern is useful for verifying that a contract implements expected interfaces before interacting with it.

## Supported Opcodes

The disassembler supports all EVM opcodes through the Prague hard fork:

| Category | Opcodes |
|----------|---------|
| Arithmetic | ADD, MUL, SUB, DIV, SDIV, MOD, SMOD, ADDMOD, MULMOD, EXP, SIGNEXTEND |
| Comparison | LT, GT, SLT, SGT, EQ, ISZERO |
| Bitwise | AND, OR, XOR, NOT, BYTE, SHL, SHR, SAR |
| Crypto | KECCAK256 |
| Environment | ADDRESS, BALANCE, ORIGIN, CALLER, CALLVALUE, CALLDATALOAD, CALLDATASIZE, GASPRICE, CHAINID, SELFBALANCE, BASEFEE |
| Block | BLOCKHASH, COINBASE, TIMESTAMP, NUMBER, DIFFICULTY, GASLIMIT, BLOBHASH, BLOBBASEFEE |
| Stack | POP, PUSH0-PUSH32, DUP1-DUP16, SWAP1-SWAP16 |
| Memory | MLOAD, MSTORE, MSTORE8, MSIZE, MCOPY |
| Storage | SLOAD, SSTORE, TLOAD, TSTORE |
| Flow | JUMP, JUMPI, PC, GAS, JUMPDEST |
| Logging | LOG0-LOG4 |
| System | CREATE, CALL, CALLCODE, RETURN, DELEGATECALL, CREATE2, STATICCALL, REVERT, INVALID, SELFDESTRUCT |

## Next Steps

- [Bytecode Execution](guide-bytecode-execution) — execute the bytecode you've disassembled and trace its behavior
- [EVM Debugging](guide-evm-debugging) — step through execution with source-level debugging
- For the complete opcode reference, see the [Nethereum.EVM package reference](nethereum-evm)
