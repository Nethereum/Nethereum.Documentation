---
title: Forking Live Networks
sidebar_label: Forking
sidebar_position: 5
description: Fork state from live Ethereum networks for local testing and simulation
---

# Forking Live Networks

When testing contracts that interact with existing on-chain state — DeFi protocols, token balances, deployed contracts — you need that state available locally. CoreChain's `ForkingNodeDataService` fetches state from a remote Ethereum node on demand, so your local chain starts with the exact state of mainnet (or any network) at a specific block.

This is the same concept as Hardhat's `forking` or Anvil's `--fork-url` — but built into the Nethereum chain infrastructure.

## Prerequisites

```bash
dotnet add package Nethereum.CoreChain
dotnet add package Nethereum.Web3
```

You need an RPC endpoint that supports `eth_getBalance`, `eth_getCode`, `eth_getStorageAt`, and `eth_getBlockByNumber`. Infura, Alchemy, or any full node works.

## Setting Up a Fork

The `ForkingNodeDataService` transparently fetches and caches remote state:

```csharp
using Nethereum.CoreChain.State;
using Nethereum.Web3;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR_KEY");

var forkingService = new ForkingNodeDataService(
    rpcClient: web3.Client,
    blockNumber: 18000000
);
```

When your chain reads an account balance, contract code, or storage slot that hasn't been written locally, the forking service fetches it from the remote node at the pinned block number. Once fetched, the value is cached locally — subsequent reads don't hit the remote node.

## How Forking Works

The forking service implements `INodeDataService`, the same interface used by the EVM simulator:

1. **Read request** comes in (e.g., `SLOAD` needs a storage value)
2. **Check local state** — if the value has been written locally, return it
3. **Fetch from remote** — if not found locally, fetch from the RPC endpoint at the pinned block
4. **Cache locally** — store the fetched value so future reads are instant
5. **Writes go to local state only** — no data is written to the remote node

This means your forked chain starts with the exact state of the remote network but diverges as you make transactions. It's a copy-on-write model.

## Use Cases

### Testing Against Mainnet State

Fork mainnet to test a swap against real Uniswap pools with real liquidity:

```csharp
// Fork mainnet at a specific block
var fork = new ForkingNodeDataService(web3.Client, blockNumber: 18000000);

// Your local chain now has all mainnet state at block 18M
// Deploy and test contracts as if you're on mainnet
```

### Reproducing Bugs

Fork at the block where a bug occurred to replay and debug the exact conditions:

```csharp
// Fork at the block just before the problematic transaction
var fork = new ForkingNodeDataService(web3.Client, blockNumber: bugBlockNumber - 1);

// Replay the transaction locally with full tracing
```

### Integration Testing

Test your contracts against live DeFi protocols without deploying to a testnet:

```csharp
// Fork any network — mainnet, Arbitrum, Optimism, etc.
var fork = new ForkingNodeDataService(
    new Web3("https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY").Client,
    blockNumber: latestBlock
);
```

## Combining with DevChain

The most common pattern is to use forking with DevChain, which adds instant mining and a full RPC server on top:

```csharp
// DevChain with forking is the typical developer setup
// See the DevChain documentation for the full pattern
```

This gives you a local development chain that starts with real network state — similar to `npx hardhat node --fork https://mainnet.infura.io/...`.

## Performance Considerations

- **First access is slow** — fetching state from a remote node adds network latency. Subsequent reads are instant (cached).
- **Pin to a specific block** — always provide a block number. Using "latest" would give inconsistent state as new blocks arrive.
- **Archive node recommended** — for historical blocks, you need an archive node (not all providers support this for free).
- **Storage-heavy contracts** — contracts with many storage slots (like large mappings) may require many RPC calls on first access.

## Next Steps

- [Custom Chain Node](guide-custom-chain-node) — build a chain node that uses the forked state
- [Custom Storage](guide-custom-storage) — persist forked state with RocksDB for faster subsequent runs
- For DevChain with forking, see the [DevChain documentation](/docs/devchain/overview)
