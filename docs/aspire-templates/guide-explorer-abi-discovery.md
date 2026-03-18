---
title: Explorer ABI Discovery
sidebar_label: Explorer ABI Discovery
sidebar_position: 13
description: Auto-discover contract ABIs from Foundry artifacts so the Explorer can decode transactions and provide contract interaction UI.
---

# Explorer ABI Discovery

When you deploy a contract from the [WebApp](guide-webapp-token-interaction) or via [Forge scripts](guide-forge-deploy), the Explorer can automatically match it to its Solidity source and ABI — no manual upload needed. This guide explains how the auto-discovery works and how to configure it.

## How It Works

The Explorer's ABI discovery uses **runtime bytecode matching**:

1. The AppHost tells the Explorer where the Foundry build artifacts are (`contracts/out/`)
2. On startup, the Explorer's `FileSystemABIInfoStorage` loads all `*.json` files from that directory
3. For each file, it detects the Foundry artifact format (ABI + deployed bytecode + source map)
4. When you navigate to a contract address, the Explorer fetches the on-chain bytecode via `eth_getCode`
5. It compares the on-chain bytecode against all loaded artifacts (stripping metadata suffixes)
6. If a match is found, the ABI, function names, event signatures, and Solidity source are all available

This means: deploy a contract, navigate to its address in the Explorer, and you immediately get decoded function calls, a contract interaction UI, and source code viewing.

## AppHost Configuration

The dApp template's `AppHost/Program.cs` configures the paths:

```csharp
var contractsOutPath = Path.GetFullPath(
    Path.Combine(builder.AppHostDirectory, "..", "contracts", "out"));
var contractsSrcPath = Path.GetFullPath(
    Path.Combine(builder.AppHostDirectory, "..", "contracts"));

var explorer = builder.AddProject<Projects.Explorer>("explorer")
    .WithReference(postgres)
    .WithReference(devchain)
    .WaitFor(indexer)
    .WithEnvironment("Explorer__AbiSources__LocalStorageEnabled", "true")
    .WithEnvironment("Explorer__AbiSources__LocalStoragePath", contractsOutPath)
    .WithEnvironment("Explorer__AbiSources__SourceBasePath", contractsSrcPath);
```

Three environment variables control the feature:

| Variable | Value | Purpose |
|----------|-------|---------|
| `Explorer__AbiSources__LocalStorageEnabled` | `true` | Enable local artifact scanning |
| `Explorer__AbiSources__LocalStoragePath` | `contracts/out/` | Path to Foundry compiled output |
| `Explorer__AbiSources__SourceBasePath` | `contracts/` | Root path for resolving Solidity source files |

## What the Explorer Shows

When a contract is matched, the Explorer's contract detail page displays:

- **Contract name** — e.g., "MyToken"
- **ABI** — the full JSON ABI
- **Read functions** — call any view/pure function directly (no wallet needed)
- **Write functions** — call state-changing functions through the connected wallet
- **Decoded transactions** — all past transactions to this contract show decoded function names and parameters
- **Event logs** — decoded event names and parameters
- **Bytecode** — the deployed bytecode with expandable view

## Foundry Artifact Format

The Explorer recognises Foundry artifacts by checking for `abi` (as JSON array) and `deployedBytecode.sourceMap`. A typical artifact at `contracts/out/MyToken.sol/MyToken.json` contains:

```json
{
  "abi": [...],
  "bytecode": { "object": "0x608060..." },
  "deployedBytecode": {
    "object": "0x608060...",
    "sourceMap": "..."
  },
  "rawMetadata": "...",
  "id": 42
}
```

The `deployedBytecode.object` is what gets compared against on-chain code. The `rawMetadata` and `sourceMap` enable source mapping for debugging.

## Bytecode Matching Details

The matching is prefix-based with metadata stripping:

1. Both bytecodes are normalised (remove `0x` prefix, lowercase)
2. Solidity appends a metadata hash (CBOR-encoded) at the end — the Explorer strips everything after the `a264` marker
3. If the on-chain bytecode starts with the artifact's bytecode (or vice versa), it's a match

This handles minor differences from constructor arguments, immutables, and metadata variations.

## Adding More Contracts

When you [add a new Solidity contract](guide-solidity-contracts) and compile with `forge build`, the new artifact appears in `contracts/out/`. The Explorer picks it up automatically on the next contract address lookup — no restart needed (artifacts are loaded lazily and cached).

## Disabling Auto-Discovery

If you don't want local ABI scanning (e.g., production deployments), simply omit the environment variables or set:

```
Explorer__AbiSources__LocalStorageEnabled=false
```

The Explorer will fall back to other ABI sources like Sourcify (enabled by default for known networks).

## What You've Built

Congratulations — you've completed the full dApp development journey:

1. **Infrastructure** — DevChain + Indexer + Explorer + PostgreSQL, all orchestrated by Aspire
2. **Smart contracts** — Solidity ERC-20 with OpenZeppelin, compiled and tested with Foundry
3. **C# integration** — Typed contract services, fast unit tests, full E2E integration tests
4. **User-facing dApp** — Blazor WebApp with EIP-6963 wallet connection, chain switching, and token interaction
5. **Developer tools** — Explorer with auto-discovered ABIs, decoded transactions, and contract interaction UI

## Next Steps

- **[Overview](overview)** — Return to the template overview to explore specific topics in more depth
- **[DevChain Quickstart](../devchain/devchain-quickstart)** — Dive deeper into DevChain configuration, storage modes, forking, and RPC methods
- **[Smart Contract Interaction](../smart-contracts/guide-smart-contract-interaction)** — Learn more about Nethereum's contract interaction patterns beyond the template
