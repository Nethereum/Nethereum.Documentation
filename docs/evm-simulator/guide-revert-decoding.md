---
title: Revert & Error Decoding
sidebar_label: Revert Decoding
sidebar_position: 5
description: Decode revert reasons, custom errors, and panic codes from failed transactions
---

# Revert & Error Decoding

When a simulated transaction fails, understanding *why* it reverted is critical. The EVM simulator captures the revert data and the `ProgramResultDecoder` decodes it into human-readable error messages — including Solidity custom errors, `require()` messages, and panic codes.

## How Reverts Work

Solidity has three ways to signal failure:

1. **`require(condition, "message")`** — encodes as `Error(string)` with selector `0x08c379a0`
2. **`revert CustomError(params)`** — encodes as a custom error with its own 4-byte selector
3. **Panic codes** — `Panic(uint256)` with selector `0x4e487b71` for overflow, division by zero, etc.

The revert data is ABI-encoded and returned in `execResult.ReturnData`.

## Prerequisites

```bash
dotnet add package Nethereum.EVM
```

## Checking for Reverts

After executing a transaction, check `Success` first:

```csharp
var executor = new TransactionExecutor(HardforkConfig.Default);
var execResult = await executor.ExecuteAsync(ctx);

if (!execResult.Success)
{
    // Simple revert reason (if available)
    Console.WriteLine($"Revert: {execResult.RevertReason}");
    Console.WriteLine($"Error: {execResult.Error}");
}
```

`RevertReason` contains the decoded `Error(string)` message when the contract used `require()`. For custom errors, you need the decoder.

## Decoding Custom Errors

The `ProgramResultDecoder` resolves custom error selectors against the ABI:

```csharp
var decoder = new ProgramResultDecoder(abiStorage);
var decoded = decoder.Decode(execResult, callInput, chainId);

if (decoded.IsRevert && decoded.RevertReason != null)
{
    var error = decoded.RevertReason;
    Console.WriteLine($"Error name: {error.GetErrorName()}");
    Console.WriteLine($"Message: {error.GetDisplayMessage()}");

    if (error.Parameters != null)
    {
        foreach (var param in error.Parameters)
        {
            Console.WriteLine($"  {param.Parameter.Name}: {param.Result}");
        }
    }
}
```

For example, an ERC-20 insufficient balance error decodes to:
```
Error name: ERC20InsufficientBalance
Message: ERC20InsufficientBalance(sender: 0xYour..., balance: 100, needed: 1000)
```

## Decoding Revert Data Directly

You can also decode revert data from any source (not just simulation results):

```csharp
var decoder = new ProgramResultDecoder(abiStorage);
var decodedError = decoder.DecodeRevert(revertData, chainId, contractAddress);

Console.WriteLine(decodedError.GetDisplayMessage());
```

This works with revert data from `eth_call` failures, `eth_estimateGas` errors, or transaction receipts.

## DecodedError Properties

| Property | Description |
|----------|-------------|
| `Error` | The `ErrorABI` with name, selector, and parameter types |
| `Parameters` | Decoded error parameters |
| `Message` | Human-readable message (for standard `Error(string)`) |
| `IsStandardError` | `true` for `Error(string)` and `Panic(uint256)` |
| `IsDecoded` | `true` when the ABI was found and error was decoded |
| `RawData` | Original hex data (always available as fallback) |

The `GetDisplayMessage()` method returns the best available description: the decoded message, error name, or raw data as fallback.

## Common Error Selectors

These are the most common error selectors you will encounter:

| Selector | Error | Meaning |
|----------|-------|---------|
| `0x08c379a0` | `Error(string)` | `require()` with message |
| `0x4e487b71` | `Panic(uint256)` | Arithmetic overflow, division by zero |
| `0xe450d38c` | `ERC20InsufficientBalance` | Not enough tokens |
| `0xfb8f41b2` | `ERC20InsufficientAllowance` | Approval too low |
| `0xf4d678b8` | `InsufficientBalance()` | Generic balance error |
| `0x098fb561` | `InsufficientInputAmount()` | DEX slippage |
| `0x42301c23` | `InsufficientOutputAmount()` | DEX slippage |
| `0xbb55fd27` | `InsufficientLiquidity()` | No liquidity in pool |
| `0x203d82d8` | `Expired()` | Deadline passed |

## Handling Errors in the Full Pipeline

In the complete simulation pipeline, check for errors at multiple levels:

```csharp
// 1. Execution-level error (e.g., out of gas)
if (execResult.IsValidationError)
{
    Console.WriteLine($"Validation error: {execResult.Error}");
    return;
}

// 2. EVM revert with decoded error
if (!execResult.Success)
{
    var decoded = decoder.Decode(execResult, callInput, chainId);

    if (decoded.RevertReason != null)
    {
        Console.WriteLine($"Custom error: {decoded.RevertReason.GetDisplayMessage()}");
    }
    else
    {
        Console.WriteLine($"Revert: {execResult.RevertReason ?? execResult.Error ?? "Unknown"}");
    }
    return;
}

// 3. Success — extract state changes
var stateChanges = extractor.ExtractFromDecodedResult(decoded, executionState, userAddress);
```

Validation errors (`IsValidationError = true`) indicate pre-execution failures like insufficient balance for gas or nonce issues. These do not produce revert data — just an error string.

## Panic Codes Reference

When the error selector is `0x4e487b71`, the single `uint256` parameter is a panic code:

| Code | Meaning |
|------|---------|
| `0x00` | Generic compiler panic |
| `0x01` | Assert failure |
| `0x11` | Arithmetic overflow/underflow |
| `0x12` | Division or modulo by zero |
| `0x21` | Invalid enum conversion |
| `0x22` | Incorrectly encoded storage byte array |
| `0x31` | `.pop()` on empty array |
| `0x32` | Array index out of bounds |
| `0x41` | Too much memory allocated |
| `0x51` | Calling zero-initialized function variable |

The decoder handles panic codes automatically — `GetDisplayMessage()` returns a description like "Arithmetic overflow" rather than the raw code.

## Next Steps

- [Transaction Simulation](guide-transaction-simulation) — the full pipeline that produces execution results
- [Call Tree Decoding](guide-call-tree-decoding) — inspect which sub-call caused the revert
- [ERC-20 Simulation](guide-erc20-simulation) — simulate token operations with built-in error handling
