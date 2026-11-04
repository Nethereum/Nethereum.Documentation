---
title: ENS Name Resolution
sidebar_label: "ENS"
sidebar_position: 8
description: Resolve ENS names with Nethereum through the ENSIP-23 Universal Resolver, including text records, CCIP-Read offchain names, and the ENSIP-21 batch gateway
---

# ENS Name Resolution

:::tip The Simple Way
```csharp
var ensService = web3.Eth.GetEnsService();
var address = await ensService.ResolveAddressAsync("nick.eth");
var name = await ensService.ReverseResolveAsync(address);
```
Resolution routes through the ENSIP-23 Universal Resolver by default, with automatic
EIP-3668 CCIP-Read for offchain and wildcard names.
:::

The [Ethereum Name Service (ENS)](https://ens.domains/) maps human-readable names such as `nick.eth` to
addresses, text records (URL, avatar, social handles), and content hashes. Nethereum resolves names
through the **ENSIP-23 Universal Resolver** — a single onchain contract that finds the right resolver
for a name and, when needed, transparently handles offchain (CCIP-Read) resolution.

ENS is one of the [built-in contract standards](./guide-built-in-standards.md) Nethereum ships with. The
full API lives in the [`Nethereum.Contracts` package reference](/docs/core-foundation/nethereum-contracts),
and you can browse other tasks on the [What Do You Want to Do?](/docs/what-do-you-want-to-do) page.

## Prerequisites

```bash
dotnet add package Nethereum.Web3
```

```csharp
using Nethereum.Web3;
using Nethereum.Contracts.Standards.ENS;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR-PROJECT-ID");
```

## Basic resolution

`GetEnsService()` returns a service that defaults to the Universal Resolver.

```csharp
var ensService = web3.Eth.GetEnsService();

// Forward resolution: name -> address
var address = await ensService.ResolveAddressAsync("nick.eth");

// Reverse resolution: address -> name
var name = await ensService.ReverseResolveAsync(address);

// Text records (strongly typed keys)
var url = await ensService.ResolveTextAsync("nick.eth", TextDataKey.url);
var avatar = await ensService.ResolveTextAsync("nick.eth", TextDataKey.avatar);

// Content hash (e.g. IPFS/IPNS for decentralised websites)
var contentHash = await ensService.GetContentHashAsync("nick.eth");
```

`TextDataKey` covers the common ENSIP-5 keys (`url`, `avatar`, `description`, `email`,
`com_twitter`, `com_github`, and more).

## Batched resolution with the Universal Resolver

`GetEnsUniversalResolverService()` exposes the Universal Resolver directly, so you can batch a name's
profile (address + content hash + text records) into a **single onchain round-trip** via the resolver
multicall — the same batching idea as the [Multicall guide](./guide-multicall.md), applied to ENS.

```csharp
var universalResolver = web3.Eth.GetEnsUniversalResolverService();

// Address + content hash + selected text records for one name, single round-trip
var record = await universalResolver.ResolveRecordAsync("nick.eth", TextDataKey.url, TextDataKey.avatar);
Console.WriteLine($"{record.Name} -> {record.Address}");
Console.WriteLine($"url: {record.Texts["url"]}");
```

`ResolveRecordAsync` returns an `EnsRecord`:

| Property | Type | Notes |
|----------|------|-------|
| `Name` | `string` | The resolved name |
| `Address` | `string` | ETH address (coin type 60) |
| `Texts` | `Dictionary<string, string>` | Requested text records that were set |
| `ContentHash` | `byte[]` | Raw content hash, if set |

Resolve multiple text records for one name, or resolve several names in one batch:

```csharp
// Multiple text records for one name
var texts = await universalResolver.ResolveTextsAsync("nick.eth", "url", "avatar");

// Multiple names in one batch (each independently CCIP-capable)
var records = await universalResolver.ResolveRecordsAsync(
    new[] { "nick.eth", "nethereum.eth" }, TextDataKey.url);
```

## CCIP-Read: offchain names (EIP-3668)

Names whose records live offchain (e.g. L2 or database-backed resolvers) resolve transparently. The
Universal Resolver raises an `OffchainLookup` revert; Nethereum fetches the data from the resolver's
gateway and completes the call — no extra code required.

```csharp
var universalResolver = web3.Eth.GetEnsUniversalResolverService();
// Offchain (CCIP-Read) name: the Universal Resolver raises OffchainLookup, routed through the CCIP layer.
var offchainAddress = await universalResolver.ResolveAddressAsync("1.offchainexample.eth");
// offchainAddress -> 0x41563129cDbbD0c5D3e1c86cf9563926b243834d
```

## ENSIP-21 local batch gateway (BGOLP)

When a record for an offchain name batches several sub-lookups, the Universal Resolver bundles them
into an ENSIP-21 batch gateway request (`x-batch-gateway:true`). Nethereum performs that batch
**locally** by default (BGOLP) — decoding the query, running each inner CCIP-Read, and returning the
combined result — rather than calling an external batch service.

```csharp
var universalResolver = web3.Eth.GetEnsUniversalResolverService();

// Resolving a record batches addr + contenthash + text through the resolver multicall. For an
// offchain (CCIP-Read) name the Universal Resolver bundles the sub-lookups into an ENSIP-21 batch
// gateway request (x-batch-gateway:true), which the client performs locally (BGOLP).
var record = await universalResolver.ResolveRecordAsync("1.offchainexample.eth", TextDataKey.url);
// record.Address -> 0x41563129cDbbD0c5D3e1c86cf9563926b243834d
```

## Gateway security (SSRF)

CCIP-Read gateway URLs come from untrusted resolver contracts, so the fetch is hardened against
[SSRF (CWE-918)](https://cwe.mitre.org/data/definitions/918.html) by default. The `EnsCCIPService`
exposes opt-in toggles for local/dev scenarios:

| Property | Default | Effect when enabled |
|----------|---------|---------------------|
| `AllowHttp` | `false` | Permit non-`https` (plain `http`) gateway URLs |
| `AllowPrivateDestinations` | `false` | Permit hosts resolving to private/reserved/loopback/link-local addresses |
| `AllowLocalBatchGateway` | `true` | Handle the ENSIP-21 batch locally instead of via an external service |

By default only `https` gateways are allowed, hosts resolving into private/reserved ranges are refused
(DNS-aware, fail-closed), and HTTP redirect following is disabled. To use a local gateway during
development, inject a configured service:

```csharp
var ccip = new EnsCCIPService { AllowHttp = true, AllowPrivateDestinations = true };
var universalResolver = web3.Eth.GetEnsUniversalResolverService();
// or construct directly: new ENSUniversalResolverService(web3.Eth, universalResolverAddress, ccip);
```

## Legacy registry-walk fallback

On chains without a Universal Resolver (e.g. custom or local test chains), pass a `null` Universal
Resolver address to fall back to the classic registry-walk resolution:

```csharp
using Nethereum.Contracts.Standards.ENS;

var legacyEnsService = new ENSService(web3.Eth, universalResolverAddress: null);
var address = await legacyEnsService.ResolveAddressAsync("nick.eth");
```

## Next Steps

- [Built-in Standards](./guide-built-in-standards.md) -- typed services for ERC-20, ERC-721, and more
- [Multicall & Batch Queries](./guide-multicall.md) -- batch reads across many contracts
- [Error Handling](./guide-error-handling.md) -- custom errors and reverts (CCIP-Read surfaces `OffchainLookup` as a custom error)
- [Smart Contracts Overview](./overview.md) -- the full smart-contract interaction surface
- [Nethereum.Contracts package reference](/docs/core-foundation/nethereum-contracts) -- complete API for the package that ships ENS
- [What Do You Want to Do?](/docs/what-do-you-want-to-do) -- find the right guide and packages for your task
