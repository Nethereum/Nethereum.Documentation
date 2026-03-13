---
title: ABI Retrieval & Contract Lookup
sidebar_label: ABI Retrieval
sidebar_position: 2
description: Look up contract ABIs from Sourcify, Etherscan, and 4Byte Directory with automatic fallback using Nethereum.DataServices
---

# ABI Retrieval & Contract Lookup

You have a contract address on-chain but no source code, no ABI, and no idea what its functions do. This is the most common starting point when building block explorers, decoding transaction calldata, or interacting with contracts you did not deploy yourself. Nethereum.DataServices gives you a single unified API that queries multiple ABI sources automatically so you never have to wire up fallback logic by hand.

This guide walks you through the composite lookup system, from one-line quick starts through batch decoding and offline production setups.

## Prerequisites

Install the DataServices package, which pulls in all the ABI lookup providers:

```bash
dotnet add package Nethereum.DataServices
```

If you plan to store Sourcify data locally in PostgreSQL, you will also need:

```bash
dotnet add package Nethereum.Sourcify.Database
```

## Mental model: the composite fallback chain

Before writing any code, it helps to understand how the lookup system is structured. `ABIInfoStorageFactory` creates a composite storage that tries multiple sources in order. When one source fails or returns nothing, the next one is tried automatically. Successful results are cached so repeated lookups are instant.

The default chain looks like this:

```
Request → In-Memory Cache
              ↓ (miss)
          Sourcify (full ABI from verified source)
              ↓ (miss)
          Etherscan (full ABI from verified source)
              ↓ (miss)
          Sourcify 4Byte (function/event signatures only)
              ↓ (miss)
          4Byte Directory (function/event signatures only)
```

The first two sources (Sourcify and Etherscan) return complete ABIs with parameter names and types. The last two (Sourcify 4Byte and 4Byte Directory) are signature databases that only return function names and parameter types -- useful when the contract is not verified anywhere but you still want to decode calldata.

## Quick start: simplest possible lookup

The fastest way to look up a contract ABI is with `CreateDefault`, which wires up the full fallback chain for you. Here we look up the USDC contract on Ethereum mainnet:

```csharp
using Nethereum.DataServices.ABIInfoStorage;

var storage = ABIInfoStorageFactory.CreateDefault(etherscanApiKey: "YOUR_ETHERSCAN_KEY");

var abiInfo = await storage.GetABIInfoAsync(
    chainId: 1,
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"); // USDC

Console.WriteLine($"Contract: {abiInfo.ContractName}");
Console.WriteLine($"Functions: {abiInfo.FunctionABIs.Count}");
Console.WriteLine($"Events: {abiInfo.EventABIs.Count}");
```

The returned `ABIInfo` object contains the contract name, a list of `FunctionABI` definitions, and a list of `EventABI` definitions. From here you can decode any transaction or log that targets this contract.

## Choosing a factory preset

Not every application needs the full fallback chain. The factory provides several presets so you can match your setup to your constraints.

| Method | Sources included | When to use |
|--------|-----------------|-------------|
| `CreateDefault(etherscanApiKey, cache?)` | Cache, Sourcify, Etherscan, Sourcify4Byte, FourByte | Production apps that need maximum coverage |
| `CreateWithSourcifyOnly(cache?)` | Cache, Sourcify, Sourcify4Byte, FourByte | No Etherscan API key available; open-source projects |
| `CreateWithEtherscanOnly(apiKey, cache?)` | Cache, Etherscan, Sourcify4Byte, FourByte | Chains with poor Sourcify coverage but good Etherscan support |
| `CreateLocalOnly(cache?)` | Cache only | Air-gapped environments; offline use with pre-warmed cache |
| `CreateCustom(cache, storages...)` | Whatever you provide | Full control over fallback order and providers |

If you do not have an Etherscan API key, `CreateWithSourcifyOnly` is the best starting point because Sourcify is free and covers most verified contracts:

```csharp
var storage = ABIInfoStorageFactory.CreateWithSourcifyOnly();

var abiInfo = await storage.GetABIInfoAsync(
    chainId: 1,
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
```

This returns the same `ABIInfo` as the full chain, but skips the Etherscan step entirely.

When you need full control, `CreateCustom` lets you pick exactly which providers to include and in what order:

```csharp
var myStorage = ABIInfoStorageFactory.CreateCustom(
    cache: new ABIInfoInMemoryStorage(),
    new SourcifyABIInfoStorage(),
    new EtherscanABIInfoStorage("YOUR_KEY"),
    new Sourcify4ByteABIInfoStorage(),
    new FourByteDirectoryABIInfoStorage());
```

This is equivalent to `CreateDefault`, but you could remove or reorder any of these providers to suit your needs.

## Finding functions and events from selectors

When you have raw transaction input data or log topics and need to figure out what they mean, use the selector-based lookup methods. These work even when the full ABI is not available, falling back to the 4Byte signature databases.

To identify which function a transaction is calling, pass the full input data (the 4-byte selector plus encoded parameters):

```csharp
var functionAbi = await storage.FindFunctionABIFromInputDataAsync(
    chainId: 1,
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "0xa9059cbb000000000000000000000000d8dA6BF26964aF9D7eEd9e03E53415D37aA96045000000000000000000000000000000000000000000000000000000003B9ACA00");

Console.WriteLine($"Function: {functionAbi.Name}"); // "transfer"
```

The method extracts the first 4 bytes (`0xa9059cbb`) as the selector, then looks up the matching function definition.

For log events, pass the topic0 hash to identify the event type:

```csharp
var eventAbi = await storage.FindEventABIAsync(
    chainId: 1,
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef");

Console.WriteLine($"Event: {eventAbi.Name}"); // "Transfer"
```

For revert data, use the error selector (first 4 bytes of the revert data):

```csharp
var errorAbi = await storage.FindErrorABIAsync(
    chainId: 1,
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "0x08c379a0"); // Error(string) selector
```

All three methods follow the same fallback chain: they first try to find the selector in the full ABI (if cached), then fall through to the signature databases.

## Batch lookups

When you are processing blocks, traces, or large sets of transactions, looking up selectors one at a time is slow. Batch methods let you resolve many selectors in a single call, which is significantly faster because the signature databases support batch queries natively.

To resolve multiple function selectors at once:

```csharp
var functions = await storage.FindFunctionABIsBatchAsync(
    new[] { "0xa9059cbb", "0x095ea7b3", "0x23b872dd" });

foreach (var kvp in functions)
    Console.WriteLine($"{kvp.Key} → {kvp.Value.Name}");
// 0xa9059cbb → transfer
// 0x095ea7b3 → approve
// 0x23b872dd → transferFrom
```

The return type is `IDictionary<string, FunctionABI>`, keyed by selector. Any selectors that could not be resolved are simply absent from the dictionary.

Similarly, for event topic hashes:

```csharp
var events = await storage.FindEventABIsBatchAsync(
    new[] {
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925"
    });
// Transfer, Approval
```

These batch methods are the right choice whenever you have more than two or three selectors to resolve.

## Going deeper: direct API access

The composite storage is convenient, but sometimes you need to call a specific provider directly -- for example, to verify a contract on Sourcify or to access Etherscan metadata that is not part of the ABI.

### Sourcify V2 API

The `SourcifyApiServiceV2` provides direct access to Sourcify's verification database, including full source code, compilation metadata, and proxy resolution:

```csharp
using Nethereum.DataServices.Sourcify;

var sourcify = new SourcifyApiServiceV2();

// Get full contract info including ABI, sources, and compilation metadata
var contract = await sourcify.GetContractAsync(
    chainId: 1,
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");

// Get just the ABI as a JSON string
string abi = await sourcify.GetContractAbiAsync(
    chainId: 1,
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");

// Check verification status
var check = await sourcify.GetCheckByAddressAsync(
    chainId: 1,
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
```

You can also use Sourcify to verify a contract by importing its already-verified source from Etherscan:

```csharp
var result = await sourcify.VerifyFromEtherscanAsync(
    chainId: 1,
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    apiKey: "YOUR_ETHERSCAN_KEY");
```

This is useful for cross-verifying contracts or making them available on Sourcify for the broader ecosystem.

### Etherscan API

For chains where Sourcify coverage is limited, Etherscan often has verified ABIs. The `EtherscanApiService` gives you direct access:

```csharp
using Nethereum.DataServices.Etherscan;

var etherscan = new EtherscanApiService(chain: 1, apiKey: "YOUR_KEY");

// Get ABI JSON string
var response = await etherscan.Contracts.GetAbiAsync(
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
string abi = response.Result;

// Get full source code and compilation metadata
var source = await etherscan.Contracts.GetSourceCodeAsync(
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
var info = source.Result.First();
Console.WriteLine($"Name: {info.ContractName}, Compiler: {info.CompilerVersion}");
```

The source code endpoint returns additional metadata (compiler version, optimization settings, constructor arguments) that is not available through the composite storage.

### 4Byte Directory services

Two services provide function and event signature lookups from community-maintained databases. These are the last resort when a contract is not verified anywhere.

The `FourByteDirectoryService` queries [4byte.directory](https://www.4byte.directory):

```csharp
using Nethereum.DataServices.FourByteDirectory;

var fourByte = new FourByteDirectoryService();

var result = await fourByte.GetFunctionSignatureByHexSignatureAsync("0xa9059cbb");
foreach (var sig in result.Results)
    Console.WriteLine(sig.TextSignature); // "transfer(address,uint256)"
```

The `Sourcify4ByteSignatureService` uses Sourcify's own signature database with built-in batch support:

```csharp
using Nethereum.DataServices.Sourcify;

var sigService = new Sourcify4ByteSignatureService();

var batch = await sigService.LookupAsync(
    functionSignatures: new[] { "0xa9059cbb", "0x095ea7b3" },
    eventSignatures: new[] { "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" });
```

Both services may return multiple matches for a single selector (hash collisions are possible). In practice, the first result is almost always correct for well-known selectors.

## EVM trace decoding

When you run transactions through Nethereum's EVM simulator, the resulting traces contain raw opcodes and data. The `ProgramResultDecoderExtensions` connect the ABI lookup system to the trace decoder so you can see human-readable function names and parameter values in your traces.

The simplest approach uses `DecodeWithSourcify`, which requires no API key:

```csharp
using Nethereum.DataServices.ABIInfoStorage;

var decoded = program.DecodeWithSourcify(callInput, chainId: 1);
```

For full coverage including Etherscan, use `Decode`:

```csharp
var decoded = program.Decode(callInput, chainId: 1, etherscanApiKey: "YOUR_KEY");
```

If you already have a configured storage instance (recommended to avoid creating multiple caches), pass it directly:

```csharp
var storage = ABIInfoStorageFactory.CreateDefault("YOUR_KEY");
var decoded = programResult.DecodeWithStorage(trace, callInput, chainId: 1, storage);
```

Using a shared storage instance is the best practice because it means all your lookups share the same cache, reducing duplicate API calls.

## Local Sourcify database

For production applications that cannot tolerate external API latency or rate limits, you can sync Sourcify's entire verified contract dataset into a local PostgreSQL database. The `EFCoreSourcifyRepository` implements `ISourcifyRepository` and provides indexed lookups.

Register the database context and repository in your DI container:

```csharp
using Microsoft.EntityFrameworkCore;
using Nethereum.Sourcify.Database;

services.AddDbContext<SourcifyDbContext>(options =>
    options.UseNpgsql(connectionString));
services.AddScoped<ISourcifyRepository, EFCoreSourcifyRepository>();
```

Once configured, you can query locally with no network calls:

```csharp
var repo = serviceProvider.GetRequiredService<ISourcifyRepository>();

// Fast indexed lookup by 4-byte selector
var sig = await repo.GetSignatureByHash4Async(new byte[] { 0xa9, 0x05, 0x9c, 0xbb });
Console.WriteLine(sig?.SignatureText); // "transfer(address,uint256)"

// Full-text search across all known signatures
var results = await repo.SearchSignaturesAsync("approve");
```

To populate the database, sync Sourcify's Parquet exports:

```csharp
using Nethereum.DataServices.Sourcify;

var parquet = new SourcifyParquetExportService();
var syncResult = await parquet.SyncToDirectoryAsync("/data/sourcify-export");
await repo.BulkInsertAsync(parsedVerifiedContracts);
```

The sync is incremental (using ETags), so subsequent runs only download new data. See the [Nethereum.Sourcify.Database](nethereum-sourcify-database) package reference for the full schema and import API.

## Common gotchas

**Rate limits on Etherscan.** Free Etherscan API keys are limited to 5 requests per second. If you are processing blocks with many transactions, use `CreateWithSourcifyOnly` for the main lookup chain and fall back to Etherscan only when Sourcify misses. Better yet, use the local Sourcify database for high-throughput workloads.

**Unverified contracts return partial results.** When a contract is not verified on either Sourcify or Etherscan, the composite storage falls through to the 4Byte signature databases. These return function signatures (e.g., `transfer(address,uint256)`) but not parameter names or the full contract ABI. Your code should handle `null` returns from `GetABIInfoAsync` gracefully.

**Proxy contracts need special handling.** The `SourcifyABIInfoStorage` automatically resolves proxy contracts (UUPS, Transparent Proxy) and returns the implementation ABI. However, the Etherscan provider returns the proxy's ABI (which is usually just `fallback()` and `upgradeTo()`). If you are using `CreateWithEtherscanOnly`, you may need to resolve the implementation address manually.

**Cache is in-memory by default.** The built-in cache (`ABIInfoInMemoryStorage`) does not persist across application restarts. For long-running services, consider the local Sourcify database or implement your own `IABIInfoStorage` backed by Redis or a database.

**4Byte hash collisions.** A 4-byte selector has only 2^32 possible values, so collisions exist. The `transfer(address,uint256)` selector `0xa9059cbb` could theoretically match other functions. In practice, the first result from 4Byte Directory is almost always correct, but be aware of this when decoding calldata for security-critical applications.

**Chain ID matters.** Sourcify indexes contracts per chain. A contract verified on Ethereum mainnet (chain 1) will not be found when you query with chain 137 (Polygon), even if the same bytecode is deployed at the same address on both chains.

## Next steps

- **[Token Portfolio](guide-token-portfolio)** -- Use the token discovery and pricing APIs to build portfolio views, building on the ABI retrieval covered here
- **[Chain Metadata](guide-chain-metadata)** -- Query gas prices and discover RPC endpoints for any chain
- **[Nethereum.DataServices](nethereum-dataservices)** -- Full package API reference
- **[Nethereum.Sourcify.Database](nethereum-sourcify-database)** -- Database schema and import API reference
