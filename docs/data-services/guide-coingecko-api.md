---
title: CoinGecko API
sidebar_label: CoinGecko API
sidebar_position: 6
description: Fetch token metadata, prices by contract address or CoinGecko ID, and asset platform mappings with Nethereum.DataServices
---

# CoinGecko API

CoinGecko provides token metadata and pricing across all major chains. The `CoinGeckoApiService` wraps CoinGecko's REST API with built-in caching and rate-limit management, so you can query asset platforms, token lists, and prices from C# without managing HTTP calls or worrying about throttling.

The [Token Portfolio guide](guide-token-portfolio) uses CoinGecko pricing through the higher-level `Erc20TokenService`. This guide covers the lower-level `CoinGeckoApiService` directly — use it when you need raw platform metadata, token lists, or prices outside the balance pipeline.

**When you need this guide:**

- Mapping chain IDs to CoinGecko platform identifiers
- Fetching token lists with names, symbols, logos, and addresses for a chain
- Getting token prices by contract address or CoinGecko ID
- Building price feeds or portfolio views with direct API control
- Configuring cache behavior for your application's needs

## Prerequisites

Install the package:

```bash
dotnet add package Nethereum.DataServices
```

CoinGecko's free API is keyless but has strict rate limits (10-30 calls/minute). The built-in cache helps stay within limits.

## Creating the Service

```csharp
using Nethereum.DataServices.CoinGecko;

var coingecko = new CoinGeckoApiService();
```

## Asset Platforms: Mapping Chain IDs

CoinGecko identifies blockchains by platform IDs (e.g., `"ethereum"`, `"polygon-pos"`) rather than numeric chain IDs. The first step is mapping between them.

`GetPlatformIdForChainAsync` translates a numeric chain ID to CoinGecko's platform string:

```csharp
string platformId = await coingecko.GetPlatformIdForChainAsync(chainId: 137);
Console.WriteLine(platformId); // "polygon-pos"
```

If you need the full list of platforms CoinGecko supports:

```csharp
var platforms = await coingecko.GetAssetPlatformsAsync();

foreach (var p in platforms.Where(x => x.ChainIdentifier.HasValue).Take(10))
    Console.WriteLine($"  Chain {p.ChainIdentifier}: {p.Id} ({p.Name})");
```

This is useful for building a mapping table once at startup and caching it.

## Token Lists

Once you have a platform ID (or a chain ID), you can fetch the complete token list for that chain. Each token entry includes address, symbol, name, decimals, and a logo URL:

```csharp
var tokenList = await coingecko.GetTokenListForChainAsync(chainId: 1);
Console.WriteLine($"Ethereum tokens: {tokenList.Tokens.Count}");

foreach (var token in tokenList.Tokens.Take(5))
    Console.WriteLine($"  {token.Symbol}: {token.Name} ({token.Address})");
```

You can also fetch by platform ID directly if you already have it:

```csharp
var polygonTokens = await coingecko.GetTokenListForPlatformAsync("polygon-pos");
```

Or get the list of tokens as a flat collection:

```csharp
var tokens = await coingecko.GetTokensForChainAsync(chainId: 1);
```

### Full Coins List

For cross-chain lookups, `GetCoinsListAsync` returns every coin CoinGecko tracks, along with the platforms (chains) each coin is deployed on:

```csharp
var coins = await coingecko.GetCoinsListAsync();
Console.WriteLine($"Total coins tracked: {coins.Count}");
```

Each coin object has a `Platforms` dictionary mapping platform IDs to contract addresses, which is how `FindCoinGeckoIdAsync` works internally.

## Token Prices

### Price by CoinGecko ID

If you know the CoinGecko ID for a token (e.g., `"ethereum"`, `"usd-coin"`), fetch prices directly:

```csharp
var prices = await coingecko.GetPricesAsync(
    new[] { "ethereum", "usd-coin", "matic-network" },
    vsCurrency: "usd");

Console.WriteLine($"ETH:  ${prices["ethereum"]["usd"]}");
Console.WriteLine($"USDC: ${prices["usd-coin"]["usd"]}");
Console.WriteLine($"MATIC: ${prices["matic-network"]["usd"]}");
```

The method batches requests automatically (250 IDs per batch) and respects the configured rate-limit delay between batches.

### Price by Contract Address

More commonly, you have a contract address and want the price without knowing the CoinGecko ID. Use `GetTokenPriceByContractAsync` with the platform ID and contract address:

```csharp
decimal? usdcPrice = await coingecko.GetTokenPriceByContractAsync(
    "ethereum",
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "usd");

if (usdcPrice.HasValue)
    Console.WriteLine($"USDC: ${usdcPrice.Value}");
else
    Console.WriteLine("Price not available");
```

The method returns `null` if the token is not found or CoinGecko does not have pricing data for it.

### Mapping Contract Addresses to CoinGecko IDs

Sometimes you need the CoinGecko ID itself (e.g., to build a detail page URL). `FindCoinGeckoIdAsync` searches the coins list:

```csharp
string geckoId = await coingecko.FindCoinGeckoIdAsync(
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", chainId: 1);
Console.WriteLine(geckoId); // "usd-coin"
```

For batch lookups, use `FindCoinGeckoIdsAsync` to resolve multiple addresses in one pass:

```csharp
var ids = await coingecko.FindCoinGeckoIdsAsync(
    new[] {
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
        "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
        "0x6B175474E89094C44Da98b954EedeAC495271d0F"  // DAI
    },
    chainId: 1);

foreach (var kvp in ids)
    Console.WriteLine($"  {kvp.Key} => {kvp.Value}");
```

## Cache Configuration

CoinGecko's free API has aggressive rate limits. The service caches responses by default to avoid hitting them. You can tune the cache durations:

```csharp
var config = new CoinGeckoCacheConfiguration
{
    Enabled = true,
    PlatformsCacheDuration = TimeSpan.FromHours(24),
    CoinsListCacheDuration = TimeSpan.FromHours(1),
    TokenListCacheDuration = TimeSpan.FromHours(1),
    RateLimitDelay = TimeSpan.FromMilliseconds(1500)
};

var coingecko = new CoinGeckoApiService(config);
```

| Cache | Default Duration | Why |
|-------|-----------------|-----|
| Asset platforms | 24 hours | New chains are added rarely |
| Coins list | 1 hour | New tokens appear frequently |
| Token lists | 1 hour | Token metadata can change |
| Rate limit delay | 1.5 seconds | Between batched API calls |

To disable caching entirely (useful in tests):

```csharp
var testService = new CoinGeckoApiService(CoinGeckoCacheConfiguration.Disabled);
```

To force a refresh of a specific cache, pass `forceRefresh: true` to any method that supports it:

```csharp
var freshPlatforms = await coingecko.GetAssetPlatformsAsync(forceRefresh: true);
```

To clear all cached data:

```csharp
coingecko.ClearCache();
```

## Relationship to TokenServices

`Nethereum.TokenServices` wraps `CoinGeckoApiService` inside `CoinGeckoPriceProvider` for the portfolio pipeline. Use `CoinGeckoApiService` directly when you need:

- Raw platform metadata or token lists for display
- Prices without the full balance pipeline
- Fine-grained cache control
- CoinGecko ID lookups for building URLs or cross-referencing data

Use `Erc20TokenService` (via [Token Portfolio guide](guide-token-portfolio)) when you need balances + prices together, as it handles the full pipeline including multicall batching, discovery, and price resolution.

## Common Gotchas

**Rate limits are strict.** The free tier allows roughly 10-30 calls per minute. The built-in cache and rate-limit delay help, but if you make many different queries in quick succession, you will get HTTP 429 errors. Increase `RateLimitDelay` if needed.

**Platform IDs are not chain IDs.** Ethereum mainnet is `"ethereum"`, not `"1"`. Polygon is `"polygon-pos"`, not `"137"`. Always use `GetPlatformIdForChainAsync` to translate.

**Not all tokens have prices.** CoinGecko tracks major tokens, but obscure or newly launched tokens may not be listed. `GetTokenPriceByContractAsync` returns `null` for untracked tokens.

**The coins list is large.** `GetCoinsListAsync` returns tens of thousands of entries. Cache the result and avoid calling it repeatedly. The built-in cache handles this with a 1-hour default expiry.

**Address casing matters for lookups.** Contract addresses passed to `FindCoinGeckoIdAsync` are matched case-insensitively internally, but the CoinGecko API itself may require lowercase. The service normalizes addresses for you.

**Batch pricing has implicit limits.** `GetPricesAsync` batches at 250 IDs per request. For very large token sets, multiple API calls are made with rate-limit delays between them.

## Next Steps

- **[Data Services Overview](overview)** — return to the section overview for the full picture
- **[Token Portfolio](guide-token-portfolio)** — use CoinGecko pricing within the full balance + price pipeline
- **[Chainlist RPC](guide-chainlist-rpc)** — discover chains and RPC endpoints
- **[Etherscan API](guide-etherscan-api)** — query gas prices, account transactions, and contract data
- **[Nethereum.DataServices](nethereum-dataservices)** — full package API reference
