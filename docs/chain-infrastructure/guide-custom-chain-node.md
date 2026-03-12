---
title: Building a Custom Chain Node
sidebar_label: Custom Chain Node
sidebar_position: 2
description: Build a local Ethereum-compatible chain node using CoreChain's block production, transaction processing, and storage components
---

# Building a Custom Chain Node

CoreChain provides all the building blocks for running an Ethereum-compatible execution layer in-process: block production, transaction processing, state management, and JSON-RPC handling. Both [DevChain](/docs/devchain/overview) and [AppChains](/docs/application-chain/overview) are built on top of CoreChain — and you can build your own custom chain node too.

Use CoreChain directly when you need full control over block production timing, custom consensus logic, or specialized storage backends that DevChain doesn't support.

## Prerequisites

```bash
dotnet add package Nethereum.CoreChain
```

## The Core Components

A chain node has four main pieces:

1. **Storage** — where blocks, transactions, state, and logs are kept
2. **TransactionProcessor** — validates and executes transactions through the EVM
3. **BlockProducer** — assembles pending transactions into blocks with state root calculation
4. **RPC Handlers** — expose the chain via JSON-RPC

### Setting Up Storage

CoreChain provides in-memory implementations for all storage interfaces — useful for testing and ephemeral chains:

```csharp
using Nethereum.CoreChain.Storage.InMemory;

var blockStore = new InMemoryBlockStore();
var txStore = new InMemoryTransactionStore(blockStore);
var receiptStore = new InMemoryReceiptStore();
var logStore = new InMemoryLogStore();
var stateStore = new InMemoryStateStore();
var filterStore = new InMemoryFilterStore();
var trieNodeStore = new InMemoryTrieNodeStore();
```

For persistent storage, use `Nethereum.CoreChain.RocksDB` (see [Custom Storage](guide-custom-storage)).

### Producing Blocks

The `BlockProducer` takes pending transactions, executes them through the EVM, and assembles a block with computed state roots:

```csharp
using Nethereum.CoreChain;

var producer = new BlockProducer(
    blockStore, txStore, receiptStore,
    logStore, stateStore, trieNodeStore, chainConfig);

var result = await producer.ProduceBlockAsync(pendingTransactions);
```

The result contains the block header (with state root, receipts root, transactions root), all processed transaction results, gas used, and the logs bloom filter.

### The IChainNode Interface

CoreChain defines `IChainNode` as the unified interface for chain implementations:

```csharp
public interface IChainNode
{
    IBlockStore BlockStore { get; }
    ITransactionStore TransactionStore { get; }
    IReceiptStore ReceiptStore { get; }
    IStateStore StateStore { get; }
    ILogStore LogStore { get; }
    IFilterStore FilterStore { get; }
    ITrieNodeStore TrieNodeStore { get; }

    Task<CallResult> CallAsync(CallInput callInput, string blockParameter = "latest");
    Task<BigInteger> EstimateGasAsync(CallInput callInput);
    Task<byte[]> SendRawTransactionAsync(byte[] signedTransaction);
    // ... block, transaction, and state accessors
}
```

DevChain extends this with instant mining. AppChain extends it with sequencing and P2P. You can extend it with any custom behavior you need.

## Exposing JSON-RPC

Once you have a chain node, expose it over JSON-RPC using the dispatcher:

```csharp
using Nethereum.CoreChain.Rpc;

var registry = new RpcHandlerRegistry();
registry.AddStandardHandlers();

var context = new RpcContext(chainNode, chainId, serviceProvider);
var dispatcher = new RpcDispatcher(registry, context, logger);

// Handle a single RPC request
var response = await dispatcher.DispatchAsync(request);

// Handle a batch
var responses = await dispatcher.DispatchBatchAsync(requests);
```

The standard handlers cover all `eth_*`, `net_*`, `web3_*`, and `debug_trace*` methods. See [Custom RPC Handlers](guide-custom-rpc-handlers) for adding your own methods.

## Chain Configuration

```csharp
var chainConfig = new ChainConfig
{
    ChainId = 1337,
    // ... additional configuration
};
```

The chain config controls the chain ID, and is passed to the block producer and RPC handlers.

## Next Steps

- [Custom Storage](guide-custom-storage) — implement your own storage backend or use RocksDB for persistence
- [Custom RPC Handlers](guide-custom-rpc-handlers) — add custom JSON-RPC methods to your chain
- [Forking](guide-forking) — fork state from live Ethereum networks for local testing
