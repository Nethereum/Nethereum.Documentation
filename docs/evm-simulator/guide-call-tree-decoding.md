---
title: Call Tree Decoding
sidebar_label: Call Tree Decoding
sidebar_position: 3
description: Decode the full call hierarchy with function names, parameters, and sub-calls
---

# Call Tree Decoding

When a smart contract calls other contracts, the execution forms a tree of calls. After [simulating a transaction](guide-transaction-simulation), you can decode this tree to see every function invocation — with resolved names and decoded parameters.

This is essential for understanding complex DeFi transactions where a single user call triggers multiple internal calls across contracts.

## How It Works

The `ProgramResultDecoder` takes raw execution results and resolves:
- **Function selectors** to human-readable names (e.g., `0xa9059cbb` to `transfer(address,uint256)`)
- **Input data** to decoded parameters with names and types
- **Sub-calls** to DecodedCall objects listed in RootCall.InnerCalls (every call the execution made, flattened, each at Depth 1)
- **Call types** to Call, or Create when the call has no To. The other CallType members exist on the enum but the decoder does not assign them.

The decoder needs an `IABIInfoStorage` to look up ABIs. Without it, calls appear as raw hex data.

## Prerequisites

```bash
dotnet add package Nethereum.EVM
```

## Decoding After Execution

After executing a transaction with `TransactionExecutor` (see [Transaction Simulation](guide-transaction-simulation)), decode the result:

```csharp
using Nethereum.EVM.Decoding;

var decoder = new ProgramResultDecoder(abiStorage);
var decoded = decoder.Decode(execResult, callInput, chainId);
```

The `decoded.RootCall` is the entry point — the function your transaction called. Its `InnerCalls` list contains all sub-calls made by that function.

## Walking the Call Tree

Each `DecodedCall` has a list of `InnerCalls`, forming a recursive tree. Here is how to walk it:

```csharp
void PrintCallTree(DecodedCall call, int indent = 0)
{
    var prefix = new string(' ', indent * 2);
    var name = call.GetDisplayName();  // "ContractName.FunctionName", "FunctionName", "call(0x...)" or "unknown"
    var value = call.Value > 0 ? $" [{Web3.Convert.FromWei(call.Value)} ETH]" : "";

    Console.WriteLine($"{prefix}{call.CallType}: {name}{value}");

    // Print decoded input parameters
    if (call.InputParameters != null)
    {
        foreach (var param in call.InputParameters)
        {
            Console.WriteLine($"{prefix}  {param.Parameter.Name}: {param.Result}");
        }
    }

    // Recurse into sub-calls
    if (call.InnerCalls != null)
    {
        foreach (var inner in call.InnerCalls)
        {
            PrintCallTree(inner, indent + 1);
        }
    }
}

PrintCallTree(decoded.RootCall);
```

For a Uniswap swap, this might output (inner calls are flattened under the root):

```
Call: UniswapV2Router.swapExactTokensForTokens
  amountIn: 1000000000000000000
  amountOutMin: 990000000
  path: [0xC02...DAI, 0xA0b...USDC]
  Call: DAI.transferFrom
    from: 0xYourAddress
    to: 0xPairAddress
    amount: 1000000000000000000
  Call: UniswapV2Pair.swap
    amount0Out: 0
    amount1Out: 995000000
  Call: USDC.transfer
    to: 0xYourAddress
    amount: 995000000
```

`GasUsed` is not populated by `ProgramResultDecoder`.

## Quick Summary with ToHumanReadableString

For a quick overview without writing a tree walker, use the built-in formatter:

```csharp
Console.WriteLine(decoded.ToHumanReadableString());
```

This prints the call tree, events, return values, and revert reason in a structured text format.

## Inspecting Individual Calls

Each `DecodedCall` provides rich information:

```csharp
var rootCall = decoded.RootCall;

// Basic info
Console.WriteLine($"From: {rootCall.From}");
Console.WriteLine($"To: {rootCall.To}");
Console.WriteLine($"Function: {rootCall.GetFunctionName()}");
Console.WriteLine($"Signature: {rootCall.GetFunctionSignature()}");
Console.WriteLine($"Call type: {rootCall.CallType}");
Console.WriteLine($"Depth: {rootCall.Depth}");
Console.WriteLine($"Decoded: {rootCall.IsDecoded}");

// If not decoded, raw data is available
if (!rootCall.IsDecoded)
{
    Console.WriteLine($"Raw input: {rootCall.RawInput}");
}

// Check whether the execution reverted
if (decoded.IsRevert && decoded.RevertReason != null)
{
    Console.WriteLine($"Reverted: {decoded.RevertReason.GetDisplayMessage()}");
}
```

`IsDecoded` is `true` when the ABI was found and the function signature was matched. When `false`, `RawInput` contains the hex-encoded data.

## Decoding a Single Call

You can also decode individual calls without a full execution:

```csharp
var decoder = new ProgramResultDecoder(abiStorage);
var decodedCall = decoder.DecodeCall(callInput, chainId, depth: 0);

Console.WriteLine($"Function: {decodedCall.GetFunctionName()}");
foreach (var param in decodedCall.InputParameters ?? new List<ParameterOutput>())
{
    Console.WriteLine($"  {param.Parameter.Name}: {param.Result}");
}
```

This is useful when you have a `CallInput` but have not executed it yet — for example, decoding a pending transaction's input data.

## Call Types

The `CallType` enum distinguishes how contracts interact:

| CallType | Description | Storage Context |
|----------|-------------|-----------------|
| `Call` | Standard external call | Target contract's storage |
| `DelegateCall` | Execute target code in caller's context | Caller's storage |
| `StaticCall` | Read-only call (no state changes) | Target contract's storage |
| `CallCode` | Legacy version of DelegateCall | Caller's storage |
| `Create` | Deploy new contract | New contract's storage |
| `Create2` | Deterministic contract deployment | New contract's storage |

Understanding `DelegateCall` is important for proxy contracts — the call tree shows the target (implementation) address, but storage changes affect the proxy.

## Next Steps

- [Log Extraction](guide-log-extraction) — extract and decode events emitted at each call level
- [Revert Decoding](guide-revert-decoding) — decode errors when calls fail
- [Transaction Simulation](guide-transaction-simulation) — the full simulation pipeline that produces the data for decoding
