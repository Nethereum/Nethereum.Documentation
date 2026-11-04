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
using Nethereum.Merkle.Patricia.Storage;

var blockStore = new InMemoryBlockStore();
var txStore = new InMemoryTransactionStore(blockStore);
var receiptStore = new InMemoryReceiptStore();
var logStore = new InMemoryLogStore();
var stateStore = new InMemoryStateStore();
var filterStore = new InMemoryFilterStore();
var trieNodeStore = new InMemoryContentNodeStore();
```

For persistent storage, use `Nethereum.CoreChain.RocksDB` (see [Custom Storage](guide-custom-storage)).

### Producing Blocks

The `BlockProducer` takes pending transactions, executes them through the EVM, and assembles a block with computed state roots:

```csharp
using Nethereum.CoreChain;
using Nethereum.CoreChain.Forks;
using Nethereum.EVM;

var stateRootCalculator = new IncrementalStateRootCalculator(stateStore, trieNodeStore);
var engine = new BlockExecutor(
    stateStore,
    blockStore,
    new FixedChainActivations(HardforkName.Prague),
    chainConfigFactory: _ => chainConfig,
    hardforkConfigFactory: _ => chainConfig.GetHardforkConfig(),
    stateRootCalculator: stateRootCalculator,
    rewardPolicy: NoRewardPolicy.Instance,
    trieNodeStore: trieNodeStore);

var producer = new BlockProducer(
    engine,
    blockStore, txStore, receiptStore, logStore, stateStore,
    trieNodeStore, stateRootCalculator);

var result = await producer.ProduceBlockAsync(pendingTransactions, options);
```

`options` is a `BlockProductionOptions`; `pendingTransactions` is a `List<ISignedTransaction>`.

The result contains the block header (with state root, receipts root, transactions root), all processed transaction results, gas used, and the logs bloom filter.

### The IChainNode Interface

CoreChain defines `IChainNode` as the unified interface for chain implementations:

```csharp
public interface IChainNode
{
    ChainConfig Config { get; }
    IBlockStore Blocks { get; }
    ITransactionStore Transactions { get; }
    IUncleStore Uncles { get; }
    IReceiptStore Receipts { get; }
    ILogStore Logs { get; }
    IStateStore State { get; }
    IFilterStore Filters { get; }
    ITrieNodeStore TrieNodes { get; }
    IBlobStore BlobStore { get; }
    IBlockAccessListStore BlockAccessLists { get; }
    IProofService ProofService { get; }

    Task<CallResult> CallAsync(string to, byte[] data, string from = null, BigInteger? value = null,
        BigInteger? gasLimit = null, Dictionary<string, StateOverride> stateOverrides = null,
        List<Authorisation7702Signed> authorisationList = null);
    Task<TransactionExecutionResult> SendTransactionAsync(ISignedTransaction tx);
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

The chain config controls the chain ID, and is passed to the `BlockExecutor` factories and exposed as `IChainNode.Config`.

## Next Steps

- [Custom Storage](guide-custom-storage) — implement your own storage backend or use RocksDB for persistence
- [Custom RPC Handlers](guide-custom-rpc-handlers) — add custom JSON-RPC methods to your chain
- [Forking](../devchain/guide-forking-and-state) — fork state from live Ethereum networks for local testing
