---
title: Sourcify API
sidebar_label: Sourcify API
sidebar_position: 6
description: Look up verified contracts, resolve ABIs, decode function selectors, verify contracts via Etherscan import, and sync bulk Parquet exports with Nethereum.DataServices
---

# Sourcify API

Sourcify is a decentralised contract verification registry — an open, free alternative to Etherscan's proprietary verification database. When a contract is verified on Sourcify, its full source code, ABI, and compilation metadata become publicly available. Nethereum provides three Sourcify clients covering different use cases: the V2 REST API for individual contract lookups, the 4Byte signature service for decoding unknown calldata, and the Parquet export service for bulk data access.

**When you need this guide:**

- Looking up a contract's ABI or source code without an Etherscan API key
- Verifying a contract on Sourcify (importing from Etherscan or uploading source)
- Decoding unknown function selectors or event signatures in transaction traces
- Building a local contract verification database from Sourcify's bulk exports

If you just need ABI lookup with automatic fallback across multiple providers (Sourcify, Etherscan, 4Byte), start with the [ABI Retrieval guide](guide-abi-retrieval) instead — it uses Sourcify under the hood as one provider in a composite chain.

## Prerequisites

```bash
dotnet add package Nethereum.DataServices
```

For local PostgreSQL storage of Sourcify data:

```bash
dotnet add package Nethereum.Sourcify.Database
```

No API key is required — Sourcify is free and open.

## Sourcify V2 API

The `SourcifyApiServiceV2` provides direct access to Sourcify's verification database. Unlike the composite `SourcifyABIInfoStorage` from the [ABI Retrieval guide](guide-abi-retrieval), this gives you the full contract response including compilation metadata, source code, bytecode transformations, and proxy resolution.

### Contract Lookup

The core operation is fetching a verified contract by chain ID and address. The `fields` parameter controls what data comes back — omit it to get everything, or specify specific fields to reduce payload size:

```csharp
using Nethereum.DataServices.Sourcify;

var sourcify = new SourcifyApiServiceV2();

// Full contract info (ABI, sources, compilation, bytecode)
var contract = await sourcify.GetContractAsync(
    chainId: 1,
    address: "0x00000000219ab540356cBB839Cbe05303d7705Fa");

Console.WriteLine($"Chain: {contract.ChainId}");
Console.WriteLine($"Match: {contract.Match}");
```

To get just the ABI as a JSON string (smallest payload for the most common use case):

```csharp
string abi = await sourcify.GetContractAbiAsync(
    chainId: 1,
    address: "0x00000000219ab540356cBB839Cbe05303d7705Fa");
```

You can also request specific fields like compilation metadata alongside the ABI:

```csharp
var contract = await sourcify.GetContractAsync(
    chainId: 1,
    address: "0x00000000219ab540356cBB839Cbe05303d7705Fa",
    fields: "abi,compilation");

Console.WriteLine($"Compiler: {contract.Compilation.CompilerVersion}");
```

### Check Verification Status

Before fetching full data, you can check whether a contract is verified on a given chain:

```csharp
var check = await sourcify.GetCheckByAddressAsync(
    chainId: 1,
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
```

### Cross-Chain Lookup

If you have an address but don't know which chains it's verified on, search across all chains at once:

```csharp
var allChains = await sourcify.GetContractAllChainsAsync(
    "0x00000000219ab540356cBB839Cbe05303d7705Fa");

foreach (var result in allChains.Results)
    Console.WriteLine($"Verified on chain {result.ChainId}: {result.Match}");
```

### List Verified Contracts on a Chain

Browse recently verified contracts on a chain with pagination:

```csharp
var contracts = await sourcify.GetContractsAsync(
    chainId: 1,
    limit: 10,
    sort: "desc");

foreach (var entry in contracts.Results)
    Console.WriteLine($"{entry.Address} — matched at {entry.MatchId}");
```

Use the `afterMatchId` parameter from the last result to paginate through more contracts.

## Verifying Contracts

### Import from Etherscan

The simplest way to verify a contract on Sourcify is to import it from Etherscan. This pulls the source code and compilation settings from Etherscan and submits them to Sourcify:

```csharp
var result = await sourcify.VerifyFromEtherscanAsync(
    chainId: 1,
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    apiKey: "YOUR_ETHERSCAN_KEY"); // optional

Console.WriteLine($"Status: {result.Status}");
```

This is useful for cross-verifying contracts or making them available on Sourcify for the broader ecosystem.

### Upload Source Files

For contracts not on Etherscan, you can upload source files directly:

```csharp
var sourceFiles = new Dictionary<string, string>
{
    ["contracts/MyToken.sol"] = solSourceCode,
    ["metadata.json"] = metadataJson
};

var result = await sourcify.PostVerifyAsync(
    chainId: 1,
    address: "0xYourContractAddress",
    sourceFiles: sourceFiles);
```

You can also submit just the metadata for verification:

```csharp
var metadata = await sourcify.PostMetadataAsync(
    chainId: 1,
    address: "0xYourContractAddress",
    sourceFiles: sourceFiles);
```

## 4Byte Signature Service

When a contract is not verified anywhere, you can still decode function selectors and event signatures using Sourcify's signature database at `api.4byte.sourcify.dev`. This is the same data used by the `Sourcify4ByteABIInfoStorage` in the [ABI Retrieval](guide-abi-retrieval) composite chain.

### Lookup a Function Selector

Given a 4-byte function selector (the first 4 bytes of calldata), look up matching function signatures:

```csharp
var sigService = new Sourcify4ByteSignatureService();

var response = await sigService.LookupFunctionAsync("0xa9059cbb");
var signatures = response.Result.Function["0xa9059cbb"];

foreach (var sig in signatures)
    Console.WriteLine($"{sig.Name}"); // "transfer(address,uint256)"
```

### Lookup an Event Signature

Event topics are 32-byte keccak256 hashes. Look them up the same way:

```csharp
var transferEventHash = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
var response = await sigService.LookupEventAsync(transferEventHash);
var signatures = response.Result.Event[transferEventHash];

foreach (var sig in signatures)
    Console.WriteLine($"{sig.Name}"); // "Transfer(address,address,uint256)"
```

### Batch Lookup

When decoding a full transaction trace, you typically have multiple selectors and event topics. The batch API handles them in a single request:

```csharp
var response = await sigService.LookupAsync(
    functionSignatures: new[] { "0xa9059cbb", "0x095ea7b3" },
    eventSignatures: new[] {
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925"
    });

// Functions
foreach (var (selector, sigs) in response.Result.Function)
    Console.WriteLine($"{selector}: {sigs.First().Name}");

// Events
foreach (var (topic, sigs) in response.Result.Event)
    Console.WriteLine($"{topic}: {sigs.First().Name}");
```

### Search by Name

If you know part of a function or event name but not the selector:

```csharp
var response = await sigService.SearchAsync("transfer");
```

## Parquet Bulk Exports

Sourcify publishes its entire database of verified contracts as Parquet files, updated regularly. This is useful for analytics pipelines, local search indexes, or bulk ABI imports — scenarios where calling the REST API per-contract would be too slow.

### List Available Files

The `SourcifyParquetExportService` lists and downloads from Sourcify's S3-compatible export bucket. Each table is split into multiple Parquet files:

```csharp
var parquet = new SourcifyParquetExportService();

var files = await parquet.ListTableFilesAsync("verified_contracts");
Console.WriteLine($"Verified contracts files: {files.Count}");

foreach (var file in files.Take(3))
    Console.WriteLine($"  {file.Key} ({file.Size} bytes)");
```

### Download Individual Files

Download a specific Parquet file as a stream:

```csharp
var allFiles = await parquet.ListTableFilesAsync("signatures");
var firstFile = allFiles.First();

using var stream = await parquet.DownloadFileAsync(firstFile.Key);
// Stream contains Parquet-format data (header bytes: PAR1)
```

Or download directly to a local path:

```csharp
await parquet.DownloadFileToPathAsync(
    firstFile.Key,
    "/data/sourcify/signatures/part-0.parquet");
```

### Sync an Entire Table

For keeping a local mirror up to date, the sync method downloads only files that have changed (using ETags for change detection):

```csharp
var syncResult = await parquet.SyncTableToDirectoryAsync(
    "verified_contracts",
    "/data/sourcify-export");

Console.WriteLine($"Downloaded: {syncResult.FilesDownloaded}");
Console.WriteLine($"Skipped (unchanged): {syncResult.FilesSkipped}");
Console.WriteLine($"Bytes: {syncResult.BytesDownloaded}");
```

You can also sync all tables at once with progress reporting:

```csharp
var progress = new Progress<SourcifyParquetSyncProgress>(p =>
    Console.WriteLine($"[{p.FilesProcessed}/{p.TotalFiles}] {p.CurrentFile}"));

var syncResult = await parquet.SyncToDirectoryAsync(
    "/data/sourcify-full",
    progress: progress);
```

### Available Tables

Sourcify organizes its export into ten tables covering the full verification pipeline:

```csharp
string[] tables = SourcifyParquetExportService.AvailableTables;
// "sourcify_matches", "verified_contracts", "sources",
// "compiled_contracts_sources", "compiled_contracts",
// "contract_deployments", "contracts", "code",
// "compiled_contracts_signatures", "signatures"
```

## Local PostgreSQL Database

For production applications that cannot tolerate external API latency or rate limits, you can import Sourcify data into a local PostgreSQL database. The `Nethereum.Sourcify.Database` package provides an EF Core implementation of `ISourcifyRepository` with a relational schema mirroring Sourcify's data model.

### Setup

```csharp
using Microsoft.EntityFrameworkCore;
using Nethereum.Sourcify.Database;

services.AddDbContext<SourcifyDbContext>(options =>
    options.UseNpgsql(connectionString));
services.AddScoped<ISourcifyRepository, EFCoreSourcifyRepository>();
```

### Query Verified Contracts

```csharp
var repo = serviceProvider.GetRequiredService<ISourcifyRepository>();

var verified = await repo.GetVerifiedContractAsync(
    chainId: 1,
    addressBytes);

if (verified != null)
{
    Console.WriteLine($"Creation match: {verified.CreationMatch}");
    Console.WriteLine($"Runtime match: {verified.RuntimeMatch}");
}
```

### Signature Lookups

The signature table is indexed by 4-byte selector for fast lookups:

```csharp
byte[] selector = new byte[] { 0xa9, 0x05, 0x9c, 0xbb };
var sig = await repo.GetSignatureByHash4Async(selector);
Console.WriteLine(sig?.SignatureText); // "transfer(address,uint256)"
```

### Import from Parquet Exports

Combine the Parquet export service with the database for a complete local mirror:

```csharp
// 1. Download the latest Parquet files
var parquet = new SourcifyParquetExportService();
await parquet.SyncTableToDirectoryAsync("verified_contracts", "/data/sourcify");

// 2. Parse and bulk insert (using your preferred Parquet reader)
var verifiedContracts = ParseParquetFile<VerifiedContract>("/data/sourcify/verified_contracts.parquet");
await repo.BulkInsertAsync(verifiedContracts);
```

All `Add*Async` methods are idempotent — safe to call multiple times with the same data. `BulkInsertAsync` is faster but does not check for duplicates.

See the [Nethereum.Sourcify.Database](nethereum-sourcify-database) package reference for the full schema, entity relationships, and all repository methods.

## Common Gotchas

**Chain ID matters.** Sourcify indexes contracts per chain. A contract verified on Ethereum mainnet (chain 1) will not be found when you query with chain 137 (Polygon), even if the same bytecode is deployed at the same address on both chains. Use `GetContractAllChainsAsync` if you need to search across chains.

**Multiple signature matches are common.** The 4Byte database may return several signatures for the same selector — different functions can have the same 4-byte prefix. When decoding, prefer signatures that match the parameter count from your calldata length.

**Proxy contracts are resolved automatically** by `SourcifyABIInfoStorage` (the composite provider from [ABI Retrieval](guide-abi-retrieval)). When using `SourcifyApiServiceV2` directly, you get the contract at the address you specify — resolve the implementation address yourself if needed.

**No rate limits, but be respectful.** Sourcify is a free public good. For high-throughput workloads (block explorers, indexers), use the Parquet exports and local database instead of hitting the API per-contract.

## Next Steps

- **[ABI Retrieval](guide-abi-retrieval)** — composite ABI lookup using Sourcify as one provider in a fallback chain
- **[Etherscan API](guide-etherscan-api)** — complementary ABI source when Sourcify coverage is limited
- **[Nethereum.Sourcify.Database](nethereum-sourcify-database)** — full database schema and repository API reference
- **[Nethereum.DataServices](nethereum-dataservices)** — full package API reference
