---
title: Chain Metadata & Gas Prices
sidebar_label: Chain Metadata
sidebar_position: 4
description: Query gas prices from Etherscan, discover RPC endpoints from Chainlist, and fetch token metadata from CoinGecko with Nethereum.DataServices
---

# Chain Metadata & Gas Prices

Every multi-chain application needs answers to three questions: *How much will gas cost?* *Which RPC endpoint should I connect to?* *What tokens exist on this chain and what are they worth?* Nethereum.DataServices wraps three external APIs -- Etherscan, Chainlist, and CoinGecko -- so you can answer all three from C# without hand-rolling HTTP calls or parsing JSON yourself.

The [Token Portfolio guide](guide-token-portfolio) already introduced CoinGecko pricing through the higher-level `Erc20TokenService`. This guide covers the lower-level `CoinGeckoApiService` directly -- use it when you need raw platform metadata, token lists, or prices outside the balance pipeline.

**When you need this guide:**

- Building a chain-selector dropdown that shows available networks and their native currencies
- Displaying gas price estimates so users can choose speed vs. cost before sending a transaction
- Populating token lists with names, symbols, logos, and live prices for a wallet or portfolio view
- Downloading bulk verified-contract data from Sourcify for analytics or indexing pipelines

## Prerequisites

Install the package:

```bash
dotnet add package Nethereum.DataServices
```

You will also need an Etherscan API key for gas-price queries. The free tier allows 5 calls/second. Chainlist and CoinGecko endpoints are public and keyless, but CoinGecko has strict rate limits (10-30 calls/minute on the free tier).

## Mental Model: Three Data Sources

Before diving into code, understand what each service provides:

| Service | What it knows | Key use case |
|---------|--------------|--------------|
| **Etherscan** | Gas prices, confirmation estimates, account history | Transaction cost UX |
| **Chainlist** | Every EVM chain's name, chain ID, RPC URLs, native currency | Chain selector / multi-chain config |
| **CoinGecko** | Token metadata, prices, platform-to-chain mappings | Portfolio display, price feeds |

Each service is a standalone class with no shared state. You create an instance, call async methods, and get typed response objects back.

## Gas Prices from Etherscan

Nethereum handles gas estimation automatically when sending transactions. The Etherscan gas oracle provides an alternative source of gas pricing data — three price tiers for the target chain representing the gas price (in Gwei) needed to land a transaction at different priority levels.

```csharp
using Nethereum.DataServices.Etherscan;

var etherscan = new EtherscanApiService(chain: 1, apiKey: "YOUR_ETHERSCAN_API_KEY");

var response = await etherscan.GasTracker.GetGasOracleAsync();
var gas = response.Result;

Console.WriteLine($"Safe (slow):     {gas.SafeGasPrice} Gwei");
Console.WriteLine($"Proposed (avg):  {gas.ProposeGasPrice} Gwei");
Console.WriteLine($"Fast:            {gas.FastGasPrice} Gwei");
Console.WriteLine($"Base fee:        {gas.SuggestBaseFee} Gwei");
Console.WriteLine($"Gas used ratio:  {gas.GasUsedRatio}");
```

Here is what each field means:

- **SafeGasPrice** -- the lowest price likely to confirm, but it may take several minutes. Good for non-urgent background transactions.
- **ProposeGasPrice** -- a middle-ground price that typically confirms within a few blocks. This is the default most wallets show.
- **FastGasPrice** -- a premium price for near-immediate inclusion. Use this when speed matters (e.g., DEX trades, time-sensitive mints).
- **SuggestBaseFee** -- the current EIP-1559 base fee. On post-London chains, the actual gas cost is `baseFee + priorityFee`, so this tells you the floor.
- **GasUsedRatio** -- a comma-separated string of ratios showing how full recent blocks were. Values near 1.0 indicate congestion and rising prices.

### Estimating Confirmation Time

If you already know the gas price you plan to use, you can ask Etherscan how long it will take to confirm. The `gasPriceInWei` parameter must be in Wei, not Gwei -- multiply by 10^9.

```csharp
var estimate = await etherscan.GasTracker.GetEstimatedConfirmationTimeAsync(
    gasPriceInWei: 30_000_000_000); // 30 Gwei expressed in Wei

Console.WriteLine($"Estimated seconds to confirm: {estimate.Result}");
```

The returned value is a string representing the estimated number of seconds. This is useful for showing users a "~2 minutes" indicator next to a gas price slider.

### Multi-Chain Gas Queries

The Etherscan V2 API uses the `chain` parameter to target any Etherscan-supported network. The same API key works across chains:

```csharp
var polygonGas = new EtherscanApiService(chain: 137, apiKey: "YOUR_KEY");
var arbGas = new EtherscanApiService(chain: 42161, apiKey: "YOUR_KEY");
var baseGas = new EtherscanApiService(chain: 8453, apiKey: "YOUR_KEY");

var polygonOracle = await polygonGas.GasTracker.GetGasOracleAsync();
Console.WriteLine($"Polygon safe price: {polygonOracle.Result.SafeGasPrice} Gwei");
```

Not all chains support the gas tracker module. If a chain does not, the API returns an error status. Check `response.Status` before accessing `response.Result`.

## Discovering RPC Endpoints with Chainlist

Chainlist maintains a registry of every known EVM chain and its public RPC endpoints. This is the data source behind [chainlist.org](https://chainlist.org). Use it to build chain-selector UIs or to auto-configure RPC connections.

```csharp
using Nethereum.DataServices.Chainlist;

var chainlist = new ChainlistRpcApiService();
```

### Listing All Chains

`GetAllChainsAsync` returns the full registry. Each entry includes the chain name, ID, native currency, RPC URLs, faucets, and block explorers.

```csharp
var allChains = await chainlist.GetAllChainsAsync();
Console.WriteLine($"Total EVM chains known: {allChains.Count}");
```

Because this fetches the entire registry in one call, cache the result if you need to query it repeatedly.

### Looking Up a Single Chain

To get details for a specific chain by its ID:

```csharp
var polygon = await chainlist.GetChainByIdAsync(137);

Console.WriteLine($"Name:     {polygon.Name}");
Console.WriteLine($"Chain ID: {polygon.ChainId}");
Console.WriteLine($"Currency: {polygon.NativeCurrency.Symbol} ({polygon.NativeCurrency.Name})");
Console.WriteLine($"Decimals: {polygon.NativeCurrency.Decimals}");
Console.WriteLine($"Info:     {polygon.InfoURL}");
```

The `NativeCurrency` object gives you what you need to display balances correctly -- the symbol (e.g., "MATIC"), the full name, and the decimal precision (almost always 18 for EVM chains).

### RPC Endpoints and Metadata

Each chain has a list of `Rpc` objects with the URL, tracking policy, and whether the endpoint is open-source:

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

### Filtering Chains

Since `GetAllChainsAsync` returns a standard `List<ChainlistChainInfo>`, use LINQ to filter:

```csharp
var chains = await chainlist.GetAllChainsAsync();

var testnets = chains
    .Where(c => c.Name.Contains("Sepolia", StringComparison.OrdinalIgnoreCase)
             || c.Name.Contains("Goerli", StringComparison.OrdinalIgnoreCase))
    .ToList();

Console.WriteLine($"Found {testnets.Count} testnet entries");
foreach (var net in testnets.Take(5))
    Console.WriteLine($"  {net.Name} (ID: {net.ChainId})");
```

## CoinGecko: Asset Platforms and Token Lists

CoinGecko identifies blockchains by platform IDs (e.g., `"ethereum"`, `"polygon-pos"`) rather than numeric chain IDs. The first step is mapping between them.

```csharp
using Nethereum.DataServices.CoinGecko;

var coingecko = new CoinGeckoApiService();
```

### Mapping Chain IDs to Platform IDs

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

### Fetching Token Lists

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

### Getting the Full Coins List

For cross-chain lookups, `GetCoinsListAsync` returns every coin CoinGecko tracks, along with the platforms (chains) each coin is deployed on:

```csharp
var coins = await coingecko.GetCoinsListAsync();
Console.WriteLine($"Total coins tracked: {coins.Count}");
```

Each coin object has a `Platforms` dictionary mapping platform IDs to contract addresses, which is how `FindCoinGeckoIdAsync` works internally.

## CoinGecko: Token Prices

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

### Cache Configuration

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

## Sourcify Parquet Exports

Sourcify publishes its entire database of verified contracts as Parquet files, updated regularly. This is useful for analytics pipelines, local search indexes, or bulk ABI imports -- scenarios where calling the Sourcify REST API per-contract would be too slow.

```csharp
using Nethereum.DataServices.Sourcify;

var parquet = new SourcifyParquetExportService();
```

### Available Tables

Sourcify organizes its export into ten tables:

```csharp
string[] tables = SourcifyParquetExportService.AvailableTables;
// "sourcify_matches", "verified_contracts", "sources",
// "compiled_contracts_sources", "compiled_contracts",
// "contract_deployments", "contracts", "code",
// "compiled_contracts_signatures", "signatures"
```

The most commonly needed table is `verified_contracts`, which links contract addresses to their source code and compilation metadata.

### Listing and Downloading Files

Each table is split into multiple Parquet files. List the files for a table, then download them:

```csharp
var files = await parquet.ListTableFilesAsync("verified_contracts");
Console.WriteLine($"Verified contracts files: {files.Count}");

foreach (var file in files.Take(3))
    Console.WriteLine($"  {file.Key} ({file.Size} bytes, modified {file.LastModified})");
```

### Syncing an Entire Dataset

For regular updates, use `SyncToDirectoryAsync`. It performs incremental downloads using ETags -- files that have not changed since the last sync are skipped:

```csharp
var result = await parquet.SyncToDirectoryAsync(
    "/data/sourcify-export",
    progress: new Progress<SourcifyParquetSyncProgress>(p =>
        Console.WriteLine($"  {p.FilesProcessed}/{p.TotalFiles}: {p.CurrentFile}")));

Console.WriteLine($"Downloaded: {result.FilesDownloaded}");
Console.WriteLine($"Skipped (unchanged): {result.FilesSkipped}");
Console.WriteLine($"Bytes downloaded: {result.BytesDownloaded}");

if (result.Errors.Any())
    Console.WriteLine($"Errors: {string.Join(", ", result.Errors)}");
```

To sync only a single table:

```csharp
var tableResult = await parquet.SyncTableToDirectoryAsync(
    "verified_contracts", "/data/sourcify-export");
```

## Decision Table: Which Service for Which Task

| I need to... | Use this | Method |
|-------------|----------|--------|
| Show gas price options | Etherscan | `GasTracker.GetGasOracleAsync()` |
| Estimate confirmation time | Etherscan | `GasTracker.GetEstimatedConfirmationTimeAsync()` |
| List all EVM chains | Chainlist | `GetAllChainsAsync()` |
| Get RPC URLs for a chain | Chainlist | `GetChainByIdAsync()` then read `.Rpc` |
| Get native currency info | Chainlist | `GetChainByIdAsync()` then read `.NativeCurrency` |
| List tokens on a chain | CoinGecko | `GetTokenListForChainAsync()` |
| Get token price by address | CoinGecko | `GetTokenPriceByContractAsync()` |
| Get price by CoinGecko ID | CoinGecko | `GetPricesAsync()` |
| Map address to CoinGecko ID | CoinGecko | `FindCoinGeckoIdAsync()` |
| Bulk-download verified contracts | Sourcify Parquet | `SyncToDirectoryAsync()` |

## Common Gotchas

**Etherscan API keys are per-account, not per-chain.** A single free-tier key works across all Etherscan V2 chains, but the rate limit (5 calls/second) is shared across all chains.

**CoinGecko rate limits are strict.** The free tier allows roughly 10-30 calls per minute. The built-in cache and rate-limit delay help, but if you make many different queries in quick succession, you will get HTTP 429 errors. Use the cache configuration to increase the delay if needed.

**Chainlist endpoints vary in quality.** Not all listed RPC endpoints are reliable. Some may be slow, rate-limited, or intermittently down. For production use, test endpoints before relying on them, or use them as a discovery mechanism and then health-check each URL.

**Gas prices can go stale fast.** During periods of congestion, gas prices change block-by-block. Do not cache gas oracle results for more than a few seconds if you are displaying them to users making real-time decisions.

**CoinGecko platform IDs are not chain IDs.** Ethereum mainnet is `"ethereum"`, not `"1"`. Polygon is `"polygon-pos"`, not `"137"`. Always use `GetPlatformIdForChainAsync` to translate.

**Sourcify Parquet files are large.** A full sync can be several gigabytes. Use `SyncTableToDirectoryAsync` to download only the tables you need, and run syncs incrementally to minimize bandwidth.

## Next Steps

- **[Data Services Overview](overview)** -- return to the section overview for the full picture
- **[ABI Retrieval Guide](guide-abi-retrieval)** -- fetch and decode contract ABIs from Sourcify and Etherscan
- **[Token Portfolio Guide](guide-token-portfolio)** -- combine token lists and prices into a wallet portfolio view
- **[Nethereum.DataServices Package](nethereum-dataservices)** -- full package API reference
- **[Data & Indexing](../data-and-indexing/overview)** -- index blockchain data to PostgreSQL and build explorers with the block processing pipeline
