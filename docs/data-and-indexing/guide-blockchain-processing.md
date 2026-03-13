---
title: Blockchain Processing Pipeline
sidebar_label: Blockchain Processing
sidebar_position: 2
description: Crawl blocks, transactions, and event logs with progress tracking and reorg handling
---

# Blockchain Processing Pipeline

Nethereum.BlockchainProcessing provides a pipeline for crawling blockchain data — blocks, transactions, receipts, logs, and contract creations. You configure which steps you care about, attach handlers, and the processor takes care of fetching, batching, progress tracking, and chain reorganisation detection.

**Package:** `Nethereum.BlockchainProcessing`

```bash
dotnet add package Nethereum.BlockchainProcessing
```

---

## Processing Event Logs

The most common use case is processing typed event logs from contracts. The processor fetches logs in batches, decodes them, and invokes your handler:

```csharp
using Nethereum.Web3;
using Nethereum.RPC.Eth.DTOs;

var web3 = new Web3("https://eth.llamarpc.com");
var cts = new CancellationTokenSource();

var processor = web3.Processing.Logs.CreateProcessor<TransferEventDTO>(
    action: log =>
    {
        Console.WriteLine($"Transfer: {log.Event.From} -> {log.Event.To}, Amount: {log.Event.Value}");
        return Task.CompletedTask;
    },
    minimumBlockConfirmations: 12,
    contractAddresses: new[] { "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" } // USDC
);

await processor.ExecuteAsync(
    startAtBlockNumberIfNotProcessed: 18000000,
    cancellationToken: cts.Token
);
```

For a single contract:

```csharp
var processor = web3.Processing.Logs.CreateProcessorForContract<TransferEventDTO>(
    contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    action: log =>
    {
        Console.WriteLine($"{log.Event.From} -> {log.Event.To}: {log.Event.Value}");
        return Task.CompletedTask;
    }
);
```

For multiple contracts:

```csharp
var processor = web3.Processing.Logs.CreateProcessorForContracts<TransferEventDTO>(
    contractAddresses: new[] { usdcAddress, daiAddress, usdtAddress },
    action: log =>
    {
        Console.WriteLine($"[{log.Log.Address}] {log.Event.From} -> {log.Event.To}: {log.Event.Value}");
        return Task.CompletedTask;
    }
);
```

---

## Full Block Processing

When you need blocks, transactions, receipts, and logs together, use the block processor. Each pipeline step can have match criteria and handlers:

```csharp
var processor = web3.Processing.Blocks.CreateBlockProcessor(
    steps =>
    {
        // Handle every block
        steps.BlockStep.AddSynchronousProcessorHandler(block =>
        {
            Console.WriteLine($"Block {block.Number}: {block.TransactionCount()} txs");
        });

        // Only process transactions to empty addresses (contract deployments)
        steps.TransactionStep.SetMatchCriteria(tx => tx.Transaction.IsToAnEmptyAddress());
        steps.TransactionStep.AddSynchronousProcessorHandler(tx =>
        {
            Console.WriteLine($"Deploy tx: {tx.Transaction.TransactionHash}");
        });

        // Handle successful receipts
        steps.TransactionReceiptStep.SetMatchCriteria(receipt => receipt.Succeeded());
        steps.TransactionReceiptStep.AddProcessorHandler(async receipt =>
        {
            await SaveReceiptAsync(receipt);
        });

        // Handle all logs
        steps.FilterLogStep.AddProcessorHandler(async log =>
        {
            await ProcessLogAsync(log);
        });
    },
    minimumBlockConfirmations: 6
);

await processor.ExecuteAsync(cancellationToken: cts.Token);
```

### Pipeline Steps

| Step | Type | What It Receives |
|------|------|-----------------|
| `BlockStep` | `Processor<BlockWithTransactions>` | Full block with embedded transactions |
| `TransactionStep` | `Processor<TransactionVO>` | Individual transaction |
| `TransactionReceiptStep` | `Processor<TransactionReceiptVO>` | Transaction receipt (logs, status, gas) |
| `FilterLogStep` | `Processor<FilterLogVO>` | Individual event log |
| `ContractCreationStep` | `Processor<ContractCreationVO>` | Contract deployment (address, code) |

Each step supports:
- `AddSynchronousProcessorHandler(Action<T>)` — sync handler
- `AddProcessorHandler(Func<T, Task>)` — async handler
- `SetMatchCriteria(Func<T, bool>)` — filter which items reach handlers

---

## Progress Tracking

Without progress tracking, the processor starts from the beginning every time. Implement `IBlockProgressRepository` to resume where you left off:

```csharp
public interface IBlockProgressRepository
{
    Task UpsertProgressAsync(BigInteger blockNumber);
    Task<BigInteger?> GetLastBlockNumberProcessedAsync();
}
```

### Built-in implementations

**JSON file** — simple persistence for single-process scenarios:

```csharp
var progressRepo = new JsonBlockProgressRepository("progress.json");

var processor = web3.Processing.Blocks.CreateBlockProcessor(
    progressRepository: progressRepo,
    configureSteps: steps =>
    {
        steps.BlockStep.AddSynchronousProcessorHandler(block =>
            Console.WriteLine($"Block {block.Number}"));
    },
    minimumBlockConfirmations: 12
);

await processor.ExecuteAsync(cancellationToken: cts.Token);
// On restart, resumes from last saved block
```

**In-memory** — for testing:

```csharp
var progressRepo = new InMemoryBlockchainProgressRepository();
```

**Database** — the EF Core storage packages provide `IBlockProgressRepository` implementations automatically. See the [Database Storage](./guide-database-storage) guide.

### Reorg-safe progress

Wrap any progress repository with a reorg buffer to re-check recent blocks:

```csharp
var safeProgress = new ReorgBufferedBlockProgressRepository(
    inner: progressRepo,
    reorgBuffer: 12  // re-process last 12 blocks on restart
);
```

---

## Chain Reorganisation Handling

The processor detects reorgs by comparing block hashes against previously stored values. When a reorg is detected:

1. `ChainConsistencyValidationService` compares the current chain's block hashes with stored `ChainState`
2. If hashes differ, it throws `ReorgDetectedException` with the rewind point
3. `IReorgHandler` marks affected records as non-canonical (`IsCanonical = false`)
4. Processing resumes from the rewind point

All entity models include an `IsCanonical` flag so queries can filter out orphaned data.

Configure the reorg buffer:

```csharp
// In appsettings.json (when using hosted services)
{
  "BlockchainProcessing": {
    "ReorgBuffer": 12,
    "MinimumBlockConfirmations": 12
  }
}
```

---

## Orchestrator Types

The processor delegates data fetching to an orchestrator. Three built-in strategies:

| Orchestrator | Use Case | How It Works |
|-------------|----------|-------------|
| `BlockCrawlOrchestrator` | Full data | Fetches each block, then transactions, receipts, logs per-block |
| `LogOrchestrator` | Events only | Batch `eth_getLogs` across large block ranges (up to 1M blocks per request) |
| `InternalTransactionOrchestrator` | Call traces | `debug_traceTransaction` with call tracer |

The `web3.Processing.Blocks` extensions use `BlockCrawlOrchestrator`. The `web3.Processing.Logs` extensions use `LogOrchestrator`.

### Log Orchestrator tuning

```csharp
// The LogOrchestrator automatically adjusts batch sizes on error
// and retries with exponential backoff
var processor = web3.Processing.Logs.CreateProcessor<TransferEventDTO>(
    action: async log => await HandleTransferAsync(log),
    minimumBlockConfirmations: 12
);

// Process a specific block range
await processor.ExecuteAsync(
    startAtBlockNumberIfNotProcessed: 18000000,
    toBlockNumber: 19000000,
    cancellationToken: cts.Token
);
```

---

## ERC-20/721 Processing Services

Built-in services for common token queries without full indexing:

```csharp
// Get all ERC-20 transfers for a token contract
var erc20Service = new ERC20LogProcessingService(web3);
var transfers = await erc20Service.GetAllTransferEventsForContract(
    contractAddress: usdcAddress,
    fromBlockNumber: 18000000,
    toBlockNumber: 18100000,
    cancellationToken: cts.Token
);

// Get transfers involving a specific account
var accountTransfers = await erc20Service.GetAllTransferEventsFromAndToAccount(
    contractAddresses: new[] { usdcAddress, daiAddress },
    account: walletAddress,
    fromBlockNumber: 18000000,
    toBlockNumber: 18100000
);
```

```csharp
// Get current NFT owners for a collection
var erc721Service = new ERC721LogProcessingService(web3);
var owners = await erc721Service.GetAllCurrentOwnersProcessingAllTransferEvents(
    contractAddress: nftAddress,
    fromBlockNumber: 0,
    toBlockNumber: null  // latest
);

// Get NFTs owned by a specific account
var myNfts = await erc721Service.GetErc721OwnedByAccountUsingAllTransfers(
    contractAddress: nftAddress,
    account: walletAddress,
    fromBlockNumber: 0,
    toBlockNumber: null
);
```

---

## Next Steps

- [Database Storage](./guide-database-storage) — Persist indexed data to PostgreSQL, SQL Server, or SQLite
- [Token Indexing](./guide-token-indexing) — Index ERC-20/721/1155 transfers and aggregate balances
- [Explorer](./guide-explorer) — Embed a blockchain explorer UI over your indexed data
