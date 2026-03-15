---
title: Token Indexing
sidebar_label: Token Indexing
sidebar_position: 4
description: Index ERC-20/721/1155 token transfers, aggregate balances, and track NFT ownership
---

# Token Indexing

With blocks and transactions [stored in the database](./guide-database-storage), you can layer on token indexing. `Nethereum.BlockchainStorage.Token.Postgres` provides a three-stage pipeline for indexing token activity: capture transfer events, denormalise them into typed records, and aggregate current balances via batched RPC calls. Each stage runs as an independent `BackgroundService` with its own progress checkpoint, so they can run in parallel and resume after restarts.

**Package:** `Nethereum.BlockchainStorage.Token.Postgres`

```bash
dotnet add package Nethereum.BlockchainStorage.Token.Postgres
```

> This package focuses on **indexing the chain** to build a complete picture of all token activity. If you just need to check a wallet's current token balances without indexing, see [Token Portfolio](../data-services/guide-token-portfolio) in the Data Services section — it uses batched multicall over a known token list and requires no database.

---

## Quick Start

```csharp
var builder = Host.CreateApplicationBuilder(args);
var connectionString = "Host=localhost;Database=tokens;Username=postgres;Password=secret";

// Stage 1: Capture Transfer event logs
builder.Services.AddTokenLogPostgresProcessing(builder.Configuration, connectionString);

// Stage 2: Denormalise logs into typed token transfer records
builder.Services.AddTokenDenormalizerProcessing(builder.Configuration, connectionString);

// Stage 3: Aggregate current balances via batched RPC
builder.Services.AddTokenBalanceAggregationProcessing(builder.Configuration, connectionString);

var host = builder.Build();
await host.RunAsync();
```

All three services start automatically as hosted services. Each tracks its own progress independently.

![Token indexing pipeline with PostgreSQL storage for transfers, balances, and NFTs](../screenshots/indexer-postgres-tableview-blockchain-tokens-mud-tables.png)

---

## Three-Stage Pipeline

### Stage 1 — Capture Transfer Logs

`TokenLogPostgresProcessingService` scans the chain for Transfer events (ERC-20, ERC-721, ERC-1155) using `eth_getLogs` in batch ranges. Raw logs are stored in the `transactionlogs` table (shared schema with the main blockchain processor).

**Configuration** (`TokenLogProcessing` section):

```json
{
  "TokenLogProcessing": {
    "BlockchainUrl": "http://localhost:8545",
    "NumberOfBlocksToProcessPerRequest": 1000,
    "MinimumNumberOfConfirmations": 0,
    "ReorgBuffer": 10,
    "ContractAddresses": null
  }
}
```

| Property | Default | Description |
|----------|---------|-------------|
| `BlockchainUrl` | required | JSON-RPC endpoint |
| `NumberOfBlocksToProcessPerRequest` | 1000 | Blocks per `eth_getLogs` batch |
| `MinimumNumberOfConfirmations` | 0 | Blocks behind head before processing |
| `ReorgBuffer` | 10 | Re-check recent blocks for reorgs |
| `ContractAddresses` | null | Filter to specific tokens (null = all) |

Progress is tracked in the `tokenblockprogress` table.

### Stage 2 — Denormalise Transfers

`TokenDenormalizerService` reads raw logs from the `transactionlogs` table, matches them against known Transfer event signatures (ERC-20, ERC-721, ERC-1155 TransferSingle, ERC-1155 TransferBatch), and decodes them into typed `TokenTransferLog` records.

- ERC-20: `Transfer(address from, address to, uint256 value)`
- ERC-721: `Transfer(address from, address to, uint256 tokenId)`
- ERC-1155: `TransferSingle(address operator, address from, address to, uint256 id, uint256 value)`
- ERC-1155: `TransferBatch(address operator, address from, address to, uint256[] ids, uint256[] values)` — expanded to individual records

**Configuration** (`TokenDenormalizer` section):

```json
{
  "TokenDenormalizer": {
    "BatchSize": 1000
  }
}
```

Progress is tracked in the `denormalizerprogress` table via row index.

### Stage 3 — Aggregate Balances

`TokenBalanceRpcAggregationService` processes new transfer records and queries the chain for current balances via batched RPC calls:

- **ERC-20**: `balanceOf(address)` for each affected account
- **ERC-721**: `balanceOf(address)` + `ownerOf(tokenId)`
- **ERC-1155**: `balanceOf(address, tokenId)`

Calls are batched using `MultiQueryBatchRpcHandler` with `BlockParameter` for point-in-time accuracy.

**Configuration** (`TokenBalanceAggregation` section):

```json
{
  "TokenBalanceAggregation": {
    "RpcUrl": "http://localhost:8545",
    "BatchSize": 1000
  }
}
```

Progress is tracked in the `balanceaggregationprogress` table via row index.

**Reorg recovery**: On startup, the service finds any non-canonical transfer logs and re-queries the affected accounts at the latest block to correct balances.

---

## Database Schema

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `tokentransferlogs` | transactionhash, logindex, blocknumber, contractaddress, fromaddress, toaddress, amount, tokenid, tokentype | Decoded transfer events |
| `tokenbalances` | address + contractaddress (unique) | Current ERC-20 balances per account |
| `nftinventory` | address + contractaddress + tokenid (unique) | Current NFT ownership with amounts |
| `tokenmetadata` | contractaddress (PK) | Token name, symbol, decimals, type |
| `tokenblockprogress` | lastblockprocessed | Stage 1 checkpoint |
| `denormalizerprogress` | lastprocessedrowindex | Stage 2 checkpoint |
| `balanceaggregationprogress` | lastprocessedrowindex | Stage 3 checkpoint |

The `transactionlogs` table is shared with the main blockchain storage — the token log processor writes to it, and the denormalizer reads from it. If you're also running the main `BlockchainProcessingHostedService`, the token log processor can piggyback on logs already captured there.

---

## Supported Token Standards

| Standard | Transfer Event | What Gets Indexed |
|----------|---------------|-------------------|
| ERC-20 | `Transfer(address,address,uint256)` | Fungible token transfers and balances |
| ERC-721 | `Transfer(address,address,uint256)` | NFT transfers, ownership, and inventory |
| ERC-1155 | `TransferSingle(address,address,address,uint256,uint256)` | Multi-token transfers with amounts |
| ERC-1155 | `TransferBatch(address,address,address,uint256[],uint256[])` | Batch transfers (expanded to individual records) |

All three standards are detected automatically by matching the event topic hash. No configuration needed.

---

## Running Alongside the Blockchain Processor

The token pipeline works independently or alongside the main blockchain processor:

```csharp
var builder = Host.CreateApplicationBuilder(args);
var connectionString = "Host=localhost;Database=blockchain;Username=postgres;Password=secret";

// Main blockchain indexer (blocks, transactions, logs)
builder.Services.AddPostgresBlockchainProcessor(builder.Configuration, connectionString);
builder.Services.AddPostgresInternalTransactionProcessor();

// Token pipeline (transfers, balances, NFTs)
builder.Services.AddTokenLogPostgresProcessing(builder.Configuration, connectionString);
builder.Services.AddTokenDenormalizerProcessing(builder.Configuration, connectionString);
builder.Services.AddTokenBalanceAggregationProcessing(builder.Configuration, connectionString);

// Explorer UI over the indexed data
builder.Services.AddExplorerServices(builder.Configuration);

var host = builder.Build();
await host.RunAsync();
```

---

## Repository Interfaces

If you need to query indexed token data programmatically:

| Interface | Key Methods |
|-----------|------------|
| `ITokenTransferLogRepository` | Query decoded transfer events |
| `ITokenBalanceRepository` | Query current token balances by address |
| `INFTInventoryRepository` | Query NFT ownership by address and token ID |
| `ITokenMetadataRepository` | Query token name, symbol, decimals, type |

Register repositories without the full pipeline:

```csharp
builder.Services.AddTokenPostgresRepositories(connectionString);
```

---

## Next Steps

- [Explorer](./guide-explorer) — Embed a blockchain explorer with token pages over your indexed data
- [Token Portfolio](../data-services/guide-token-portfolio) — Check wallet balances without indexing (multicall approach)
- [Blockchain Processing](./guide-blockchain-processing) — Review the core processing pipeline
- [Database Storage](./guide-database-storage) — Review the main blockchain storage setup
