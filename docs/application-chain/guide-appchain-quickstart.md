---
title: AppChain Quickstart
sidebar_label: AppChain Quickstart
sidebar_position: 2
description: Launch a sequencer and follower node, deploy contracts, and interact with your AppChain via standard Ethereum tooling
---

# AppChain Quickstart

> **PREVIEW** — AppChain packages are in preview. APIs may change between releases.

An AppChain is a lightweight, domain-specific chain that extends Ethereum. This guide covers the two ways to launch one: the CLI server (production) and the programmatic AppChainBuilder (embedded/testing). Both give you a full EVM with standard JSON-RPC — deploy contracts with Hardhat, Foundry, or Nethereum, interact with any Ethereum library.

:::tip The Simple Way
```bash
# Launch a sequencer, serving eth/snap over DevP2P so followers can sync from it
nethereum-appchain --chain-id 420420 --genesis-owner-key $KEY --sequencer-key $KEY \
  --enable-devp2p-serve --devp2p-serve-port 30403

# Launch a follower — dial the sequencer's enode, not its JSON-RPC port
nethereum-appchain --chain-id 420420 --genesis-owner-address $ADDR --sequencer-address $SEQ_ADDR \
  --follow-peer enode://<sequencer-id>@<host>:30403
```
That's it. Full EVM, JSON-RPC, WebSocket subscriptions — standard Ethereum interface.
:::

## Prerequisites

```bash
# Install the CLI tool
dotnet tool install --global Nethereum.AppChain.Server

# For programmatic usage
dotnet add package Nethereum.AppChain.Sequencer
```

You need a private key for the sequencer (block signer) and genesis owner (pre-funded account). For local development, generate one or use a test key.

## Launch a Sequencer

The sequencer is the block producer — it accepts transactions, validates them, and produces blocks. Launch one with the CLI:

```bash
nethereum-appchain \
  --port 8546 \
  --chain-id 420420 \
  --name "MyAppChain" \
  --genesis-owner-key 0xYOUR_PRIVATE_KEY \
  --sequencer-key 0xYOUR_PRIVATE_KEY \
  --block-time 1000 \
  --enable-devp2p-serve
```

This starts an HTTP/WebSocket JSON-RPC server on port 8546. The genesis owner address is pre-funded, and the sequencer produces a block every 1000ms, but only when transactions are pending unless `--allow-empty-blocks` is set. By default, persistent storage uses RocksDB at `./appchain-data` — see the [Storage guide](guide-appchain-storage) for configuration options. `--enable-devp2p-serve` makes the sequencer advertise `eth`/`snap` over DevP2P so followers have a peer to dial — see [Launch a Follower](#launch-a-follower) below.

Key CLI options for the sequencer:

| Option | Default | Description |
|--------|---------|-------------|
| `--port` | `8546` | HTTP listen port |
| `--chain-id` | `420420` | Chain ID |
| `--name` | `AppChain` | Chain display name |
| `--genesis-owner-key` | | Private key for genesis owner (pre-funded) |
| `--sequencer-key` | | Private key for block signing |
| `--block-time` | `1000` | Block production interval in milliseconds |
| `--db-path` | `./appchain-data` | RocksDB data directory |
| `--in-memory` | `false` | Use in-memory storage (no persistence) |
| `--deploy-mud-world` | `true` | Deploy MUD World contracts at genesis |
| `--enable-devp2p-serve` | `false` | Serve `eth`/`snap` over DevP2P so followers can sync from this node |
| `--devp2p-serve-port` | `30403` | DevP2P listen port for served followers |

## Launch a Follower

A follower syncs from the sequencer and maintains a verified copy of the chain. Anyone can run one — that's the public verifiability promise:

```bash
nethereum-appchain \
  --port 8547 \
  --chain-id 420420 \
  --name "MyAppChain" \
  --genesis-owner-address 0xOWNER_ADDRESS \
  --sequencer-address 0xSEQUENCER_ADDRESS \
  --follow-peer enode://<sequencer-node-id>@<host>:30403
```

The sequencer must be launched with `--enable-devp2p-serve` so it advertises `eth`/`snap` over DevP2P for followers to dial. The follower connects over RLPx to the sequencer's `--follow-peer` enode (not its JSON-RPC port), snap-syncs the state at the pivot, re-executes blocks to validate state roots, and then follows the chain head live. It serves the same JSON-RPC interface as the sequencer but doesn't produce blocks. See the [Syncing guide](guide-appchain-sync) for how the DevP2P sync stack drives this.

Note the follower uses `--genesis-owner-address` (not `--genesis-owner-key`) because it doesn't need the private key — it just needs to know the address to reconstruct the same genesis state.

## Interact via Nethereum

Once your AppChain is running, connect with Nethereum exactly as you would any Ethereum network:

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

var account = new Account(privateKey, chainId: 420420);
var web3 = new Web3(account, "http://localhost:8546");

// Check balance (genesis owner is pre-funded)
var balance = await web3.Eth.GetBalance.SendRequestAsync(account.Address);

// Deploy a contract
var receipt = await web3.Eth.GetContractDeploymentHandler<MyContractDeployment>()
    .SendRequestAndWaitForReceiptAsync(new MyContractDeployment { ... });

// Call a contract
var service = new MyContractService(web3, receipt.ContractAddress);
await service.MyFunctionRequestAndWaitForReceiptAsync(new MyFunction { ... });
```

All standard `web3.Eth` operations work — balance queries, contract deployment, transaction sending, event filtering, gas estimation. The AppChain handles EIP-1559 fees, nonce management, and transaction signing automatically.

## HTTP Endpoints

The server exposes more than just JSON-RPC:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | JSON-RPC 2.0 (`eth_*`, `web3_*`, `net_*`) |
| WS | `/ws` | WebSocket subscriptions (`eth_subscribe`) |
| GET | `/health` | Health check |
| GET | `/status` | Comprehensive node status |
| GET | `/metrics` | Prometheus metrics (when a metrics port is configured) |
| GET | `/blocks/latest` | Latest block header |

## Programmatic AppChain with AppChainBuilder

For embedded usage, testing, or when you need programmatic control over the chain lifecycle, use `AppChainBuilder`. This creates an in-process AppChain without an HTTP server:

```csharp
using Nethereum.AppChain.Sequencer.Builder;

var chain = await new AppChainBuilder("TestChain", 420420)
    .WithOperator(privateKey)
    .BuildAsync();
```

The builder configures genesis, storage, sequencer, and transaction pool in a single fluent call. `WithOperator` sets both the genesis owner (pre-funded) and the sequencer signer.

### Builder Configuration

The builder supports all the same options as the CLI:

```csharp
var chain = await new AppChainBuilder("MyChain", 420420)
    .WithOperator(privateKey)
    .WithBaseFee(0)
    .WithBlockGasLimit(30_000_000)
    .WithOnDemandBlocks()
    .WithPrefundedAddresses(new[] { addr1, addr2 })
    .BuildAsync();
```

`WithOnDemandBlocks()` produces a block immediately when a transaction is submitted — useful for tests where you don't want to wait for interval-based production.

`AppChainBuilder` runs fully in-memory (its default storage). For persistent RocksDB storage, run the AppChain via the CLI (RocksDB is the default; use `--db-path` to set the location) or inject stores manually — `WithStorage(StorageType.RocksDb, …)` on the builder is not supported and throws `NotSupportedException`.

### Presets

`AppChainPresets` provides pre-configured builders for common scenarios:

```csharp
// Gaming chain — optimized for high-frequency state updates
var chain = await AppChainPresets
    .ForGaming("GameChain", 420420, operatorKey)
    .WithPrefundedAddresses(playerAddresses)
    .BuildAsync();

// Testing — in-memory, on-demand blocks
var chain = await AppChainPresets
    .ForTesting("TestChain", 31337, testKey)
    .BuildAsync();
```

### Interacting with a Programmatic AppChain

The built chain exposes an `AppChainNode` that you can use with an RPC client:

```csharp
// Get the node for RPC interaction
var node = new AppChainNode(chain.AppChain, chain.Sequencer);

// Create an RPC client that talks directly to the node (no HTTP)
var rpcClient = new AppChainRpcClient(node, chainId: 420420);
var web3 = new Web3(new Account(userKey, 420420), rpcClient);

// Now use web3 normally
var balance = await web3.Eth.GetBalance.SendRequestAsync(userAddress);
await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(recipientAddress, 1.0m);
```

The `AppChainRpcClient` routes JSON-RPC calls directly to the in-process node without HTTP overhead — ideal for testing and embedded scenarios.

## MUD World at Genesis

By default, the AppChain deploys MUD World contracts during genesis (controlled by `--deploy-mud-world`). This means you can use the [MUD Framework](../mud-framework/overview) immediately:

```csharp
var chain = await new AppChainBuilder("MyChain", 420420)
    .WithOperator(privateKey)
    .BuildAsync();

// The deployed World address (null if MUD was not deployed at genesis)
var worldAddress = chain.MudResult?.WorldAddress;
```

From there, register namespaces and tables using your MUD-generated namespace and table services — see the [MUD Framework guide](../mud-framework/guide-mud-quickstart). The generated namespace class derives from `NamespaceBase` and exposes `RegisterNamespaceRequestAndWaitForReceiptAsync()` and `Tables.BatchRegisterAllTablesRequestAndWaitForReceiptAsync()`.

## Common Gotchas

- **Same genesis = same chain** — sequencer and followers must use the same genesis owner address and chain ID, otherwise they produce different genesis blocks and can't sync.
- **`--block-time` must be positive** — `--block-time 0` is rejected in interval block production (the CLI default). The default is 1000 ms, and blocks are produced only when transactions are pending unless `--allow-empty-blocks` is set; for instant on-demand blocks, use `AppChainBuilder.WithOnDemandBlocks()` programmatically.
- **RocksDB is the default** — the CLI uses RocksDB at `./appchain-data` unless you pass `--in-memory`. For development without persistence, add `--in-memory`.
- **Port conflicts** — the sequencer defaults to 8546 (not 8545 like Geth). Use `--port` to change it.

## Next Steps

- **[Storage](guide-appchain-storage)** — configure RocksDB for production, understand storage interfaces, tune performance
- **[Syncing Follower Nodes](guide-appchain-sync)** — sync a follower over the shared DevP2P stack (`--follow-peer`), snap bootstrap, forward execution, and independent state-root verification
