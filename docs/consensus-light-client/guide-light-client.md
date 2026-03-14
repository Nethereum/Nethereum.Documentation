---
title: Beacon Chain Light Client
sidebar_label: Beacon Chain Light Client
sidebar_position: 2
description: Initialize, update, and manage the Ethereum beacon chain light client for trustless header tracking
---

# Beacon Chain Light Client

After learning to query verified state in the [Verified State Queries](guide-verified-state) guide, this guide explains the light client protocol itself -- how sync committees work, how BLS signatures secure the chain, and how to customize the client's behavior. For most developers, the Verified State Queries guide is sufficient -- read this guide when you need to understand or control the light client directly.

## Prerequisites

Install the required packages:

```
dotnet add package Nethereum.Beaconchain
dotnet add package Nethereum.Consensus.LightClient
dotnet add package Nethereum.Signer.Bls.Herumi
```

You also need access to a Beacon Chain API endpoint. Public options include `https://ethereum-beacon-api.publicnode.com` for mainnet.

## How the Protocol Works

Ethereum's beacon chain organizes validators into **sync committees** of 512 members. Each committee is responsible for signing recent block headers using BLS aggregate signatures. Committees rotate every **sync committee period** -- approximately 27 hours (256 epochs times 32 slots times 12 seconds per slot).

A light client tracks the chain by verifying these aggregate signatures rather than downloading and executing every block. When a sufficient number of committee members (the participation threshold) sign a header, the light client can trust that header is canonical.

The protocol requires a starting point called a **weak subjectivity checkpoint** -- a recent finalized block root that the client trusts as correct. From that checkpoint, the client bootstraps its initial sync committee and then follows the chain forward through periodic updates. This is fundamentally different from a full node, which validates every transaction from genesis.

There are three levels of confidence in the headers the light client tracks:

- **Finalized headers** have been confirmed by the Casper FFG finality gadget. They cannot be reverted without slashing at least one-third of all validators. Finalized headers lag the chain head by approximately 12 minutes.
- **Optimistic headers** are the most recent headers attested by the current sync committee. They are typically seconds behind the chain head but carry weaker security guarantees.
- **Sync committee period updates** rotate the committee itself, allowing the client to continue verifying headers across period boundaries.

## Configuration

The `LightClientConfig` class holds the chain-specific parameters needed to initialize the light client.

```csharp
var config = new LightClientConfig
{
    GenesisValidatorsRoot = "0x4b363db94e286120d76eb905340fdd4e54bfe9f06bf33ff6cf5ad27f511bfe95".HexToByteArray(),
    CurrentForkVersion = currentForkVersion,
    SlotsPerEpoch = 32,
    SecondsPerSlot = 12,
    WeakSubjectivityRoot = weakSubjectivityRoot
};
```

The `GenesisValidatorsRoot` is a fixed constant for each chain -- it identifies which Ethereum network the client is syncing with. The `CurrentForkVersion` identifies the current consensus fork and should be fetched dynamically from the beacon API since it changes with hard forks. The `WeakSubjectivityRoot` is a recent finalized block root that serves as the bootstrap starting point.

`SlotsPerEpoch` and `SecondsPerSlot` default to the mainnet values of 32 and 12 respectively. These values determine how the client computes sync committee periods: a period spans `SlotsPerEpoch * 256` slots.

Here are the genesis validators roots for the supported networks:

| Chain | Chain ID | Genesis Validators Root |
|-------|----------|------------------------|
| Mainnet | 1 | `0x4b363db94e286120d76eb905340fdd4e54bfe9f06bf33ff6cf5ad27f511bfe95` |
| Sepolia | 11155111 | `0xd8ea171f3c94aea21ebc42a1ed61052acf3f9209c00e4efbaaddac09ed9b8078` |
| Holesky | 17000 | `0x9143aa7c615a7f7115e2b6aac319c03529df8242ae705fba9df39b79c59fa8b1` |

## Initialization

Bootstrapping the light client requires three steps: obtaining a weak subjectivity root, initializing BLS signature verification, and creating the service.

The weak subjectivity root comes from the most recent finality update on the beacon chain. The following code fetches it, creates the config, and initializes the light client.

```csharp
using Nethereum.Beaconchain;
using Nethereum.Beaconchain.LightClient;
using Nethereum.Consensus.LightClient;
using Nethereum.Consensus.Ssz;
using Nethereum.Hex.HexConvertors.Extensions;
using Nethereum.Signer.Bls;
using Nethereum.Signer.Bls.Herumi;

var beaconClient = new BeaconApiClient("https://ethereum-beacon-api.publicnode.com");

var response = await beaconClient.LightClient.GetFinalityUpdateAsync();
var finalityUpdate = LightClientResponseMapper.ToDomain(response);
var weakSubjectivityRoot = finalityUpdate.FinalizedHeader.Beacon.HashTreeRoot();

Console.WriteLine("Weak subjectivity root: " + weakSubjectivityRoot.ToHex(true));

var config = new LightClientConfig
{
    GenesisValidatorsRoot = "0x4b363db94e286120d76eb905340fdd4e54bfe9f06bf33ff6cf5ad27f511bfe95".HexToByteArray(),
    CurrentForkVersion = "0x06000000".HexToByteArray(),
    SlotsPerEpoch = 32,
    SecondsPerSlot = 12,
    WeakSubjectivityRoot = weakSubjectivityRoot
};

var nativeBls = new NativeBls(new HerumiNativeBindings());
await nativeBls.InitializeAsync();

var store = new InMemoryLightClientStore();
var lightClient = new LightClientService(beaconClient.LightClient, nativeBls, config, store);

await lightClient.InitializeAsync();

var state = lightClient.GetState();
Console.WriteLine("Initialized at slot: " + state.FinalizedSlot);
Console.WriteLine("Block number: " + state.FinalizedExecutionPayload.BlockNumber);
Console.WriteLine("Block hash: " + state.FinalizedExecutionPayload.BlockHash.ToHex(true));
```

During initialization, the service fetches a bootstrap response from the beacon API using the weak subjectivity root. This response contains the beacon header, execution payload, and the current sync committee. If a previously saved state exists in the store, `InitializeAsync` loads it instead of bootstrapping from scratch.

## Update Lifecycle

After initialization, the light client needs periodic updates to track the chain. There are three update methods, each serving a different purpose.

### Full Update

`UpdateAsync` fetches sync committee period updates from the beacon API. It processes up to 4 updates at a time, advancing through committee rotations. This is the method to call when the client has been offline and needs to catch up across multiple sync committee periods.

```csharp
var updated = await lightClient.UpdateAsync();
Console.WriteLine("Full update applied: " + updated);

var state = lightClient.GetState();
Console.WriteLine("Current period: " + state.CurrentPeriod);
Console.WriteLine("Finalized slot: " + state.FinalizedSlot);
```

Each update in the batch is verified independently: the BLS aggregate signature is checked against the current sync committee, the execution branch Merkle proof is verified against the beacon body root, and the finality branch proof is verified against the attested state root. If the update crosses a period boundary, the current sync committee rotates to the next.

### Finality Update

`UpdateFinalityAsync` fetches the latest finality update, which advances the finalized header without changing the sync committee. Use this when you want to get the most recent finalized block.

```csharp
var finalityUpdated = await lightClient.UpdateFinalityAsync();
Console.WriteLine("Finality update applied: " + finalityUpdated);

var state = lightClient.GetState();
Console.WriteLine("Finalized block: " + state.FinalizedExecutionPayload.BlockNumber);
```

This method verifies both the sync aggregate signature and two Merkle proofs: the execution branch (proving the execution payload is part of the beacon block body) and the finality branch (proving the finalized header is committed in the attested state).

### Optimistic Update

`UpdateOptimisticAsync` fetches the most recent optimistic header, which is typically only seconds behind the chain head. Use this when you need fresher data and can accept weaker security guarantees.

```csharp
var optimisticUpdated = await lightClient.UpdateOptimisticAsync();
Console.WriteLine("Optimistic update applied: " + optimisticUpdated);

var state = lightClient.GetState();
Console.WriteLine("Optimistic block: " + state.OptimisticExecutionPayload.BlockNumber);
```

Optimistic updates verify the sync aggregate signature and the execution branch proof but do not require a finality branch proof, since the header has not been finalized yet.

### Choosing an Update Strategy

For a continuously running application, call `UpdateFinalityAsync` every few minutes and `UpdateOptimisticAsync` every 12 seconds (once per slot) if you need near-head data. Call `UpdateAsync` at startup or after the client has been offline for more than one sync committee period (approximately 27 hours).

## State Inspection

The `GetState` method returns the full `LightClientState` object, which contains everything the light client has learned about the chain.

```csharp
var state = lightClient.GetState();

Console.WriteLine("Finalized slot: " + state.FinalizedSlot);
Console.WriteLine("Finalized block number: " + state.FinalizedExecutionPayload.BlockNumber);
Console.WriteLine("Finalized block hash: " + state.FinalizedExecutionPayload.BlockHash.ToHex(true));

Console.WriteLine("Optimistic slot: " + state.OptimisticSlot);
Console.WriteLine("Current period: " + state.CurrentPeriod);
Console.WriteLine("Last updated: " + state.LastUpdated);
Console.WriteLine("Optimistic last updated: " + state.OptimisticLastUpdated);
Console.WriteLine("Block hash history entries: " + state.BlockHashHistory.Count);
```

The state tracks the finalized and optimistic headers separately, along with their execution payloads. It also maintains a `BlockHashHistory` dictionary mapping block numbers to block hashes, capped at 256 entries. The history is pruned automatically, keeping entries near the current finalized block.

The `CurrentSyncCommittee` and `NextSyncCommittee` properties hold the BLS public keys used for signature verification. Each committee contains 512 public keys.

## TrustedHeaderProvider

The `TrustedHeaderProvider` wraps a `LightClientService` and provides a simpler interface for accessing trusted execution-layer headers. It implements `ITrustedHeaderProvider`, which is the interface consumed by `VerifiedStateService` for state proof verification.

```csharp
var trustedProvider = new TrustedHeaderProvider(lightClient);

var finalizedHeader = trustedProvider.GetLatestFinalized();
Console.WriteLine("Finalized block: " + finalizedHeader.BlockNumber);
Console.WriteLine("State root: " + finalizedHeader.StateRoot.ToHex(true));
Console.WriteLine("Timestamp: " + finalizedHeader.Timestamp);

var optimisticHeader = trustedProvider.GetLatestOptimistic();
Console.WriteLine("Optimistic block: " + optimisticHeader.BlockNumber);
```

The `TrustedExecutionHeader` returned by these methods contains the `BlockHash`, `BlockNumber`, `StateRoot`, `ReceiptsRoot`, and `Timestamp` extracted from the beacon chain's execution payload.

### Block Hash Lookup

The provider can also look up historical block hashes from the light client's block hash history.

```csharp
var blockHash = trustedProvider.GetBlockHash(finalizedHeader.BlockNumber);
if (blockHash != null)
{
    Console.WriteLine("Block hash: " + blockHash.ToHex(true));
}
```

This returns `null` if the block number is not in the history window (the most recent 256 finalized and optimistic blocks).

### Staleness Detection

The provider monitors how fresh its headers are. If too much time passes without an update, the headers become stale.

```csharp
var trustedProvider = new TrustedHeaderProvider(lightClient);

trustedProvider.FinalizedStalenessThreshold = TimeSpan.FromMinutes(30);
trustedProvider.OptimisticStalenessThreshold = TimeSpan.FromMinutes(5);

trustedProvider.StaleHeaderDetected += (sender, args) =>
{
    Console.WriteLine(args.HeaderType + " header is stale");
    Console.WriteLine("Age: " + args.Age.TotalMinutes + " minutes");
    Console.WriteLine("Threshold: " + args.Threshold.TotalMinutes + " minutes");
};
```

By default, the provider fires the `StaleHeaderDetected` event but still returns the stale header. Set `ThrowOnStaleHeader` to `true` to throw a `StaleHeaderException` instead.

```csharp
trustedProvider.ThrowOnStaleHeader = true;

try
{
    var header = trustedProvider.GetLatestFinalized();
}
catch (StaleHeaderException ex)
{
    Console.WriteLine("Header age: " + ex.Age.TotalMinutes + " minutes");
    Console.WriteLine("Threshold: " + ex.Threshold.TotalMinutes + " minutes");
}
```

The `StaleHeaderException` includes `Age` and `Threshold` properties so you can decide whether to force an update or fall back to a different data source.

## State Persistence

The `ILightClientStore` interface controls how the light client persists its state between updates and across restarts.

```csharp
public interface ILightClientStore
{
    Task<LightClientState?> LoadAsync();
    Task SaveAsync(LightClientState state);
}
```

The library ships with `InMemoryLightClientStore`, which holds state in memory and is suitable for testing and short-lived applications. For production use, implement a persistent store to avoid re-bootstrapping on every restart.

Here is a minimal file-based store implementation:

```csharp
using System.IO;
using System.Text.Json;

public class FileLightClientStore : ILightClientStore
{
    private readonly string _filePath;

    public FileLightClientStore(string filePath)
    {
        _filePath = filePath;
    }

    public async Task<LightClientState?> LoadAsync()
    {
        if (!File.Exists(_filePath))
            return null;

        var json = await File.ReadAllTextAsync(_filePath);
        return JsonSerializer.Deserialize<LightClientState>(json);
    }

    public async Task SaveAsync(LightClientState state)
    {
        var json = JsonSerializer.Serialize(state);
        await File.WriteAllTextAsync(_filePath, json);
    }
}
```

Persistence matters because bootstrapping requires fetching a fresh weak subjectivity root and a full bootstrap response from the beacon API. A persisted state lets `InitializeAsync` skip this network round-trip entirely -- it loads the saved state and resumes where it left off.

Pass your custom store to the `LightClientService` constructor:

```csharp
var store = new FileLightClientStore("light-client-state.json");
var lightClient = new LightClientService(beaconClient.LightClient, nativeBls, config, store);
await lightClient.InitializeAsync();
```

## BLS Signature Verification

The light client verifies sync committee aggregate signatures using BLS12-381 cryptography. Nethereum uses the Herumi native library for BLS operations through `NativeBls`.

```csharp
var nativeBls = new NativeBls(new HerumiNativeBindings());
await nativeBls.InitializeAsync();
```

The `HerumiNativeBindings` class loads a platform-specific native library (`bls_eth.dll` on Windows, `libbls_eth.so` on Linux, `libbls_eth.dylib` on macOS). The native library must be available in the application's runtime directory. The `Nethereum.Signer.Bls.Herumi` NuGet package includes the native binaries for common platforms under the `runtimes` folder.

During verification, the light client extracts the participating public keys from the sync committee based on the participation bitfield, computes the signing root from the attested beacon header and a domain separator, and then verifies the aggregate BLS signature against all participating keys.

## Common Gotchas

**Staleness after inactivity.** If the light client has not been updated for more than one sync committee period (approximately 27 hours), `UpdateAsync` may need to process multiple period transitions before finality and optimistic updates will work again.

**Native library loading failures.** The Herumi BLS library is a native binary that must match your platform and architecture. If you get a `TypeInitializationException` during `NativeBls` creation, verify that the native library is present in your output directory. On CI systems, ensure the appropriate runtime identifier is included in your build.

**Archive node requirements.** State proof verification (`eth_getProof`) requires the execution node to have the state trie at the specific block referenced by the light client header. Standard pruned nodes only keep recent state. If you see errors about "missing trie node" or "old data not available due to pruning," you need an archive node or a node with a wider proof window.

**Fork version changes.** The `CurrentForkVersion` changes with each consensus hard fork. Rather than hardcoding it, fetch it dynamically from the beacon API's state fork endpoint to ensure your config stays correct across network upgrades.

## Next Steps

- [Verified State Queries](guide-verified-state) -- use the light client to verify account balances, nonces, storage, and contract code
- [Nethereum.Beaconchain](nethereum-beaconchain) -- beacon chain API client reference
- [Nethereum.Consensus.LightClient](../consensus-and-cryptography/nethereum-consensus-lightclient) -- package reference
- [Nethereum.Consensus.Ssz](../consensus-and-cryptography/nethereum-consensus-ssz) -- SSZ serialization reference
