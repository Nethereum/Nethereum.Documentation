---
title: Run a Mainnet Follower
sidebar_label: "Mainnet Follower"
sidebar_position: 1
description: Sync, validate, and serve Ethereum mainnet from .NET using the nethereum-mainnetchain tool or the MainnetChain library.
---

# Run a Mainnet Follower

A mainnet follower is a node that syncs Ethereum from the peer-to-peer network, re-executes and validates every block, and serves the resulting state over JSON-RPC. Running your own follower gives you a verified view of mainnet from .NET without depending on a third-party RPC provider for the answers. It is read-only: it follows and serves the chain, and does not propose or mine blocks.

This guide shows how to run the follower as a command-line tool, how to query it, and how to host it inside your own .NET application.

:::tip The Simple Way
```bash
dotnet tool install -g Nethereum.MainnetChain.Server
nethereum-mainnetchain --beacon http://127.0.0.1:5052
```
Point `--beacon` at a beacon-node REST endpoint and the follower snap-syncs a recent state snapshot, verifies consensus against the beacon chain, validates each block as it follows the head, and serves JSON-RPC at `http://127.0.0.1:8545`. State is kept in `./mainnet-data`, so running the command again resumes where it left off.
:::

## Install the Tool

`Nethereum.MainnetChain.Server` is distributed as a .NET global tool:

```bash
dotnet tool install -g Nethereum.MainnetChain.Server
```

## Run the Follower

The simplest correct run is one flag — a beacon-node REST endpoint:

```bash
nethereum-mainnetchain --beacon http://127.0.0.1:5052
```

The follower starts a snap sync, which downloads a recent state snapshot from peers instead of replaying the chain from genesis. It then follows the head, re-executing and checking every block against its state root, cross-checks the chain it follows against the beacon-attested chain, and serves JSON-RPC at `http://127.0.0.1:8545`. Because the state directory persists between runs, stopping and restarting the tool resumes the sync rather than starting over.

Under the hood this is a snap-first, three-phase sync — a block-archive backfill, a snap state stream, then a heal pass — with each phase verified against cryptographic commitments so a peer cannot feed the node bad data. To understand the syncing process in depth, see [Nethereum.DevP2P.Sync](../devp2p/nethereum-devp2p-sync), the sync engine that drives it, and [Nethereum.DevP2P](../devp2p/nethereum-devp2p) for the peer networking beneath it.

The follower verifies consensus through a beacon light client, so it **refuses to start without `--beacon`**. Consensus (which chain is canonical) comes from the beacon chain; without it the follower can only trust whatever its peers serve, with no independent way to verify it. Rather than start an unverified follower silently, a missing `--beacon` fails loudly. For a development or otherwise trusted setup, opt out explicitly (not recommended for mainnet):

```bash
nethereum-mainnetchain --allow-unverified-consensus
```

To change the port or the data directory, pass the corresponding options:

```bash
nethereum-mainnetchain --beacon http://127.0.0.1:5052 --port 8546 --data-dir /var/lib/nethereum
```

Run `nethereum-mainnetchain --help` for the full list of options.

## Query the Follower

The follower is a standard Ethereum JSON-RPC endpoint. Point `Web3` at it and use the same APIs covered in [Core Foundation](../core-foundation/overview); there is no special client.

```csharp
using Nethereum.Web3;

var web3 = new Web3("http://127.0.0.1:8545");

var blockNumber = await web3.Eth.Blocks.GetBlockNumber.SendRequestAsync();
var balance = await web3.Eth.GetBalance.SendRequestAsync("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
```

These are ordinary read-only queries. The difference from a hosted provider is that the follower re-executed and checked every block itself, so the values it returns are ones it verified rather than values taken on trust.

## Verify Against the Beacon Chain

The `--beacon` endpoint is a beacon-node REST API, and it drives the follower's consensus verification. The follower always checks each block's state root as it executes; the beacon light client adds the consensus half — it cross-checks the chain the follower is following against the beacon-attested chain:

```bash
nethereum-mainnetchain --beacon http://127.0.0.1:5052
```

With a beacon endpoint configured, the follower rejects any block that disagrees with the beacon-attested chain, and the `finalized` and `safe` block tags become meaningful in JSON-RPC queries. This is why `--beacon` is the one flag the simple run needs: it is how the follower independently verifies what its peers serve, and without it the server refuses to start unless you pass `--allow-unverified-consensus`.

## Host the Follower in Your Application

To run the follower inside an existing .NET application instead of using the tool, add the `Nethereum.MainnetChain` library and register it on a web host:

```csharp
var builder = WebApplication.CreateBuilder(args);

var config = new MainnetChainServerConfig { DataDir = "./mainnet-data", SnapBootstrap = true };
builder.AddMainnetChainServer(config);

var app = builder.Build();
app.MapMainnetChainEndpoints();
app.Run("http://127.0.0.1:8545");
```

`AddMainnetChainServer` registers the full follower graph — block validation, the optional beacon light-client gate, the sync and serving services, and the JSON-RPC dispatcher. `MapMainnetChainEndpoints` maps the JSON-RPC endpoint (`POST /`) and a health endpoint (`GET /`).

## Advanced Options

The options below cover occasional operational needs; the defaults are appropriate for a normal follower.

- **Prometheus metrics.** `--metrics-port 9090` exposes sync progress, peer counts, and operation durations at `/metrics` on a separate port, in Prometheus text format.
- **Clear state, keep the block archive.** `--wipe-state` clears the state and snap-sync metadata but keeps the downloaded headers, bodies, and receipts, so the state sync re-runs without re-downloading the block archive.
- **Serve other peers.** `--listen-port 30303` answers snap and eth requests from other nodes over the peer-to-peer network, not just JSON-RPC.
- **Full sync.** `--no-snap` replays the chain from genesis instead of snap-syncing. This takes days and is rarely needed.

## Next Steps

- [Query Blocks and Transactions](../core-foundation/guide-query-blocks) — read blocks, transactions, receipts, and logs from your node using Web3.

## Further Reading

- [Nethereum.MainnetChain Package](nethereum-mainnetchain)
- [Nethereum.CoreChain Package](nethereum-corechain)
- [Nethereum.DevP2P.Sync Package](../devp2p/nethereum-devp2p-sync) — the snap-first sync engine: block backfill, state stream, and heal.
- [Nethereum.DevP2P Package](../devp2p/nethereum-devp2p) — devp2p peer networking: RLPx, discovery, and the eth/snap protocols.
