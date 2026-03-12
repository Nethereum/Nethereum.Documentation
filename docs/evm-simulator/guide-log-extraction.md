---
title: Log & Event Extraction
sidebar_label: Log Extraction
sidebar_position: 4
description: Extract and decode all events and token transfers from simulated transactions
---

# Log & Event Extraction

Every smart contract interaction emits events — `Transfer`, `Approval`, `Swap`, and hundreds of others. After [simulating a transaction](guide-transaction-simulation), you can extract and decode these events to see exactly what happened, including ERC-20/ERC-721/ERC-1155 token movements.

The `StateChangesExtractor` goes further: it consolidates all `Transfer` events into a net balance change per address, giving you a "what changed" summary rather than a raw event list.

## Prerequisites

```bash
dotnet add package Nethereum.EVM
```

## Decoded Events

After decoding a simulation result (see [Call Tree Decoding](guide-call-tree-decoding)), all events are available in `decoded.DecodedLogs`:

```csharp
var decoder = new ProgramResultDecoder(abiStorage);
var decoded = decoder.Decode(execResult, callInput, chainId);

foreach (var log in decoded.DecodedLogs)
{
    Console.WriteLine($"Event: {log.GetDisplayName()}");
    Console.WriteLine($"  Contract: {log.ContractAddress}");

    if (log.IsDecoded && log.Parameters != null)
    {
        foreach (var param in log.Parameters)
        {
            Console.WriteLine($"  {param.Parameter.Name}: {param.Result}");
        }
    }
}
```

Each `DecodedLog` contains:
- `Event` — the `EventABI` with signature and parameter types
- `Parameters` — decoded values for both indexed and non-indexed parameters
- `ContractAddress` / `ContractName` — which contract emitted it
- `IsDecoded` — whether the ABI was found; if `false`, `OriginalLog` has the raw data

## Decoding a Single Log

You can decode individual logs from any source — not just simulation results:

```csharp
var decoder = new ProgramResultDecoder(abiStorage);
var decodedLog = decoder.DecodeLog(filterLog, chainId);

if (decodedLog.IsDecoded)
{
    Console.WriteLine($"{decodedLog.GetEventName()}({string.Join(", ",
        decodedLog.Parameters.Select(p => $"{p.Parameter.Name}={p.Result}"))})");
}
```

This works with any `FilterLog` from `eth_getLogs`, `eth_getTransactionReceipt`, or the simulation trace.

## Extracting Balance Changes

While decoded logs show individual events, the `StateChangesExtractor` consolidates them into net balance changes — the "what is the bottom line" view that wallets display.

```csharp
using Nethereum.EVM.StateChanges;

var extractor = new StateChangesExtractor();
var stateChanges = extractor.ExtractFromDecodedResult(
    decoded, executionStateService, "0xCurrentUserAddress");

foreach (var change in stateChanges.BalanceChanges)
{
    switch (change.Type)
    {
        case BalanceChangeType.Native:
            Console.WriteLine($"{change.Address}: {Web3.Convert.FromWei(change.Change)} ETH");
            break;
        case BalanceChangeType.ERC20:
            Console.WriteLine($"{change.Address}: {change.Change} {change.TokenSymbol ?? change.TokenAddress}");
            break;
        case BalanceChangeType.ERC721:
            Console.WriteLine($"{change.Address}: NFT #{change.TokenId} ({change.TokenAddress})");
            break;
        case BalanceChangeType.ERC1155:
            Console.WriteLine($"{change.Address}: {change.Change}x token #{change.TokenId}");
            break;
    }
}
```

The extractor handles:
- **ERC-20**: `Transfer(from, to, value)` events
- **ERC-721**: `Transfer(from, to, tokenId)` events (detected by indexed `tokenId`)
- **ERC-1155**: `TransferSingle` and `TransferBatch` events
- **Native ETH**: value transfers from the call tree (not from events)

## Balance Change Types

Each `BalanceChange` includes a `Type` that tells you what kind of asset moved:

| Type | Source | Key Properties |
|------|--------|---------------|
| `Native` | Call tree value transfers | `Change` (wei) |
| `ERC20` | `Transfer` events | `Change`, `TokenAddress`, `TokenSymbol`, `TokenDecimals` |
| `ERC721` | `Transfer` events (indexed tokenId) | `TokenId`, `TokenAddress` |
| `ERC1155` | `TransferSingle`/`TransferBatch` | `TokenId`, `Change`, `TokenAddress` |

## Validating Token Balances

Fee-on-transfer tokens and rebasing tokens cause the actual balance change to differ from what the `Transfer` event reports. The extractor can cross-check against actual state:

```csharp
extractor.ValidateTokenBalances(stateChanges, program, executionStateService);

foreach (var change in stateChanges.BalanceChanges)
{
    if (change.ValidationStatus == BalanceValidationStatus.FeeOnTransfer)
    {
        Console.WriteLine($"Warning: {change.TokenSymbol} charges transfer fees");
    }
    else if (change.ValidationStatus == BalanceValidationStatus.Rebasing)
    {
        Console.WriteLine($"Warning: {change.TokenSymbol} is a rebasing token");
    }
}
```

Validation statuses:
- `NotValidated` — not yet checked
- `Verified` — change matches actual state
- `FeeOnTransfer` — actual change is less than expected (token takes a fee)
- `Rebasing` — actual change is more than expected (token rebases)
- `OwnerMismatch` / `Mismatch` — unexpected discrepancy

## Quick Summary

For a text summary of all balance changes, call tree, and events:

```csharp
Console.WriteLine(stateChanges.ToSummaryString());
```

## Next Steps

- [Revert Decoding](guide-revert-decoding) — handle failed transactions and decode error reasons
- [Transaction Simulation](guide-transaction-simulation) — the full pipeline that produces these results
- [Call Tree Decoding](guide-call-tree-decoding) — inspect which calls emitted which events
