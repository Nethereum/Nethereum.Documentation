---
title: Chainlist RPC Discovery
sidebar_label: Chainlist RPC
sidebar_position: 4
description: Discover EVM chains, RPC endpoints, native currencies, and block explorers from the Chainlist registry with Nethereum.DataServices
---

# Chainlist RPC Discovery

Chainlist maintains a public registry of every known EVM chain — names, chain IDs, RPC endpoints, native currencies, block explorers, and faucets. It is the data source behind [chainlist.org](https://chainlist.org). The `ChainlistRpcApiService` wraps this registry so you can query it from C# without parsing JSON yourself.

**When you need this guide:**

- Building a chain-selector dropdown that shows available networks and their native currencies
- Auto-configuring RPC connections for a multi-chain application
- Displaying block explorer links for any chain
- Looking up testnet faucets or chain metadata

## Prerequisites

Install the package:

```bash
dotnet add package Nethereum.DataServices
```

Chainlist endpoints are public and keyless — no API keys required.

## Quick Start

Two methods cover the entire API surface:

```csharp
using Nethereum.DataServices.Chainlist;

var chainlist = new ChainlistRpcApiService();

// Get all EVM chains
var allChains = await chainlist.GetAllChainsAsync();
Console.WriteLine($"Total EVM chains known: {allChains.Count}");

// Get a specific chain by ID
var ethereum = await chainlist.GetChainByIdAsync(1);
Console.WriteLine($"{ethereum.Name} (Chain ID: {ethereum.ChainId})");
```

## The ChainlistChainInfo Model

Every chain entry returns a `ChainlistChainInfo` object with these properties:

| Property | Type | Description |
|---|---|---|
| `Name` | `string` | Human-readable chain name (e.g., "Ethereum Mainnet") |
| `Chain` | `string` | Short chain identifier (e.g., "ETH") |
| `ChainId` | `long` | Numeric chain ID |
| `NetworkId` | `long` | Network ID (usually same as ChainId) |
| `Rpc` | `List<ChainlistRpc>` | Available RPC endpoints |
| `NativeCurrency` | `ChainlistNativeCurrency` | Native currency metadata |
| `Explorers` | `List<ChainlistExplorer>` | Block explorers |
| `Faucets` | `List<string>` | Testnet faucet URLs |
| `Features` | `List<ChainlistFeature>` | Supported features (e.g., EIP-1559) |
| `InfoURL` | `string` | Chain information page |
| `ShortName` | `string` | Short name for display |
| `Icon` | `string` | Icon identifier |

## Looking Up a Single Chain

To get details for a specific chain by its ID:

```csharp
var polygon = await chainlist.GetChainByIdAsync(137);

Console.WriteLine($"Name:     {polygon.Name}");
Console.WriteLine($"Chain ID: {polygon.ChainId}");
Console.WriteLine($"Currency: {polygon.NativeCurrency.Symbol} ({polygon.NativeCurrency.Name})");
Console.WriteLine($"Decimals: {polygon.NativeCurrency.Decimals}");
Console.WriteLine($"Info:     {polygon.InfoURL}");
```

The `NativeCurrency` object gives you what you need to display balances correctly — the symbol (e.g., "POL"), the full name, and the decimal precision (almost always 18 for EVM chains).

## RPC Endpoints and Metadata

Each chain has a list of `ChainlistRpc` objects with the URL, tracking policy, and whether the endpoint is open-source:

```csharp
var ethereum = await chainlist.GetChainByIdAsync(1);

foreach (var rpc in ethereum.Rpc)
{
    Console.WriteLine($"  URL: {rpc.Url}");
    Console.WriteLine($"  Tracking: {rpc.Tracking ?? "unknown"}");
    Console.WriteLine($"  Open source: {rpc.IsOpenSource}");
    Console.WriteLine();
}
```

The `Tracking` field indicates the endpoint's privacy policy (e.g., "none", "limited"). This is useful if your application needs to prefer privacy-respecting endpoints.

## Block Explorers

Each chain lists its associated block explorers:

```csharp
var arbitrum = await chainlist.GetChainByIdAsync(42161);

foreach (var explorer in arbitrum.Explorers)
{
    Console.WriteLine($"  {explorer.Name}: {explorer.Url} (Standard: {explorer.Standard})");
}
```

The `Standard` field typically indicates the explorer type (e.g., "EIP3091" for standard block explorers).

## Filtering and Searching Chains

Since `GetAllChainsAsync` returns a standard `List<ChainlistChainInfo>`, use LINQ to filter:

```csharp
var chains = await chainlist.GetAllChainsAsync();

// Find testnets
var testnets = chains
    .Where(c => c.Name.Contains("Sepolia", StringComparison.OrdinalIgnoreCase)
             || c.Name.Contains("Goerli", StringComparison.OrdinalIgnoreCase))
    .ToList();

Console.WriteLine($"Found {testnets.Count} testnet entries");
foreach (var net in testnets.Take(5))
    Console.WriteLine($"  {net.Name} (ID: {net.ChainId})");
```

Other useful filters:

```csharp
// Chains with EIP-1559 support
var eip1559Chains = chains
    .Where(c => c.Features?.Any(f => f.Name == "EIP1559") == true)
    .ToList();

// Chains with faucets (testnets typically)
var withFaucets = chains
    .Where(c => c.Faucets?.Any() == true)
    .ToList();

// Find a chain by native currency symbol
var ethChains = chains
    .Where(c => c.NativeCurrency?.Symbol == "ETH")
    .ToList();
```

## Building a Chain Selector

A common pattern is building a chain-selector UI component. Here is how to structure the data:

```csharp
var chains = await chainlist.GetAllChainsAsync();

// Build a lookup for supported chains
var supportedChainIds = new HashSet<long> { 1, 10, 56, 137, 8453, 42161 };

var chainOptions = chains
    .Where(c => supportedChainIds.Contains(c.ChainId))
    .Select(c => new
    {
        c.ChainId,
        c.Name,
        Currency = c.NativeCurrency?.Symbol ?? "ETH",
        RpcUrl = c.Rpc?.FirstOrDefault(r => r.Url.StartsWith("https://"))?.Url,
        ExplorerUrl = c.Explorers?.FirstOrDefault()?.Url
    })
    .ToList();

foreach (var chain in chainOptions)
{
    Console.WriteLine($"{chain.Name} ({chain.Currency})");
    Console.WriteLine($"  RPC: {chain.RpcUrl}");
    Console.WriteLine($"  Explorer: {chain.ExplorerUrl}");
}
```

## Common Gotchas

**Cache the full registry.** `GetAllChainsAsync` fetches the entire JSON registry from chainlist.org in one call. For repeated queries, cache the result in memory or on disk rather than calling the API each time.

**RPC endpoints vary in quality.** Not all listed RPC endpoints are reliable. Some may be slow, rate-limited, or intermittently down. For production use, test endpoints before relying on them, or use Chainlist as a discovery mechanism and then health-check each URL.

**`GetChainByIdAsync` fetches the full list internally.** It calls `GetAllChainsAsync` and filters by chain ID. If you need multiple chain lookups, call `GetAllChainsAsync` once and filter yourself to avoid repeated downloads.

**Some chains have no HTTPS endpoints.** A few smaller chains only list WebSocket or HTTP (not HTTPS) RPC URLs. Filter by protocol when building production configurations.

**Faucets may be outdated.** Testnet faucet URLs change frequently. The registry may contain dead links. Always verify faucet availability before presenting them to users.

## Next Steps

- **[Data Services Overview](overview)** — return to the section overview for the full picture
- **[Etherscan API](guide-etherscan-api)** — query gas prices, account transactions, and contract data from Etherscan
- **[CoinGecko API](guide-coingecko-api)** — fetch token metadata and prices
- **[Token Portfolio](guide-token-portfolio)** — build wallet portfolio displays with balances and prices
- **[Nethereum.DataServices](nethereum-dataservices)** — full package API reference
