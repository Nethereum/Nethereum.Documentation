---
title: Choose an RPC Transport
sidebar_label: "RPC Transport"
sidebar_position: 19
description: Pick the right JSON-RPC transport for your application
---

# Choose an RPC Transport

Nethereum supports multiple JSON-RPC transports. Choose based on your platform, performance needs, and whether you need streaming.

## Transport Comparison

| Transport | Package | Protocol | Streaming | AOT | Best For |
|-----------|---------|----------|-----------|-----|----------|
| HTTP (default) | `Nethereum.JsonRpc.RpcClient` | HTTP/HTTPS | No | No | General-purpose, server apps |
| SystemTextJson HTTP | `Nethereum.JsonRpc.SystemTextJsonRpcClient` | HTTP/HTTPS | No | **Yes** | AOT, Native AOT, trimming |

Nethereum provides two HTTP client packages because they serve different ecosystems: `Nethereum.JsonRpc.RpcClient` uses Newtonsoft.Json (the original, broadest compatibility); `Nethereum.JsonRpc.SystemTextJsonRpcClient` uses System.Text.Json (faster, AOT-compatible). Choose based on your deployment target.
| WebSocket | `Nethereum.JsonRpc.WebSocketClient` | WS/WSS | **Yes** | No | Subscriptions, low latency |
| WebSocket Streaming | `Nethereum.JsonRpc.WebSocketStreamingClient` | WS/WSS | **Yes** | No | Real-time event streams |
| IPC | `Nethereum.JsonRpc.IpcClient` | Unix/Named pipe | No | No | Local node, lowest latency |

## HTTP Transport (Default)

The standard choice for most applications. Uses `HttpClient` internally with Newtonsoft.Json serialization.

```bash
dotnet add package Nethereum.Web3
```

```csharp
using Nethereum.Web3;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR_KEY");
```

## SystemTextJson HTTP Transport (AOT-Compatible)

Drop-in replacement using `System.Text.Json`. Required for Native AOT and trimmed deployments. Requires .NET 7.0+.

```bash
dotnet add package Nethereum.JsonRpc.SystemTextJsonRpcClient
```

This package provides two client classes (both in the `Nethereum.JsonRpc.SystemTextJsonRpcClient` namespace):

- **`SimpleRpcClient`** — zero-config, uses built-in source-generated JSON context. Best for most cases.
- **`RpcClient`** — full-featured, supports custom `HttpClient`, logging, auth headers, and custom `JsonSerializerContext`.

:::caution Namespace matters
Both this package and the default Newtonsoft package have a class called `RpcClient`. The `using` directive determines which one you get:
- `using Nethereum.JsonRpc.Client;` → Newtonsoft `RpcClient`
- `using Nethereum.JsonRpc.SystemTextJsonRpcClient;` → System.Text.Json `RpcClient`
:::

```csharp
using Nethereum.JsonRpc.SystemTextJsonRpcClient;
using Nethereum.Web3;

// Simple — zero config, built-in JSON context
var client = new SimpleRpcClient("https://mainnet.infura.io/v3/YOUR_KEY");
var web3 = new Web3(client);

// Full-featured — custom HttpClient, logging, auth
var rpcClient = new RpcClient(
    new Uri("https://mainnet.infura.io/v3/YOUR_KEY"),
    logger: myLogger);
var web3Full = new Web3(rpcClient);
```

## WebSocket Transport

Use for Ethereum subscriptions (`eth_subscribe`) — new blocks, pending transactions, and event logs in real time.

```bash
dotnet add package Nethereum.JsonRpc.WebSocketStreamingClient
```

```csharp
using Nethereum.JsonRpc.WebSocketStreamingClient;

var client = new StreamingWebSocketClient("wss://mainnet.infura.io/ws/v3/YOUR_KEY");
await client.StartAsync();
```

See [Real-Time Streaming](guide-realtime-streaming) for subscription patterns.

## IPC Transport

Connects directly to a local node's IPC socket. Lowest latency, no network overhead.

```bash
dotnet add package Nethereum.JsonRpc.IpcClient
```

```csharp
using Nethereum.JsonRpc.IpcClient;
using Nethereum.Web3;

// Linux/Mac
var client = new IpcClient("/home/user/.ethereum/geth.ipc");

// Windows
var client = new IpcClient(@"\\.\pipe\geth.ipc");

var web3 = new Web3(client);
```

## WebSocket for Normal RPC Calls

You can use a WebSocket connection for standard (non-subscription) RPC calls using observable handlers:

```csharp
using Nethereum.JsonRpc.WebSocketStreamingClient;
using Nethereum.RPC.Reactive.Eth;

var client = new StreamingWebSocketClient("wss://mainnet.infura.io/ws/v3/YOUR_KEY");
await client.StartAsync();

// Get balance via WebSocket
var ethGetBalance = new EthGetBalanceObservableHandler(client);
ethGetBalance.GetResponseAsObservable()
    .Subscribe(balance => Console.WriteLine($"Balance: {balance.Value}"));
// BlockParameter specifies which block state to query — CreateLatest() for current
// state, or pass a specific block number for historical queries.
await ethGetBalance.SendRequestAsync("0x742d35cc6634c0532925a3b844bc454e4438f44e",
    BlockParameter.CreateLatest());

// Get block number via WebSocket
var ethBlockNumber = new EthBlockNumberObservableHandler(client);
ethBlockNumber.GetResponseAsObservable()
    .Subscribe(block => Console.WriteLine($"Block: {block.Value}"));
await ethBlockNumber.SendRequestAsync();
```


## SystemTextJson Concrete Example (AOT-Compatible)

A complete working example using `SimpleRpcClient` for AOT-compatible applications:

```csharp
using Nethereum.JsonRpc.SystemTextJsonRpcClient;
using Nethereum.Web3;

var client = new SimpleRpcClient("https://eth.drpc.org");
var web3 = new Web3(client);

// Standard RPC calls work identically
var balance = await web3.Eth.GetBalance
    .SendRequestAsync("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
Console.WriteLine($"Balance: {balance}");

var block = await web3.Eth.Blocks.GetBlockWithTransactionsByNumber
    .SendRequestAsync(BlockParameter.CreateLatest());
Console.WriteLine($"Block {block.Number} — {block.Transactions.Length} txs");

// ERC20 typed service also works with SystemTextJson
var tokenBalance = await web3.Eth.ERC20
    .GetContractService("0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2")
    .BalanceOfQueryAsync("0x8ee7d9235e01e6b42345120b5d270bdb763624c7");
// See [Unit Conversion](guide-unit-conversion) for FromWei / ToWei helpers
Console.WriteLine(Web3.Convert.FromWei(tokenBalance, 18));
```


## Decision Guide

**Use HTTP** when:
- Building server-side APIs or backend services
- You don't need real-time notifications
- Working with hosted node providers (Infura, Alchemy)

**Use SystemTextJson HTTP** when:
- Targeting Native AOT or trimmed deployments
- Running on .NET 7.0+ and want `System.Text.Json` consistency
- Building Unity WebGL or Blazor WASM apps

**Use WebSocket** when:
- You need `eth_subscribe` for new blocks or pending transactions
- Building real-time dashboards or monitoring tools
- Low-latency event processing is critical

**Use IPC** when:
- Running your own local node (Geth, Nethermind)
- Maximum throughput for batch operations
- Security: no network exposure needed

## Next Steps

- [Real-Time Streaming](guide-realtime-streaming) — subscribe to blockchain events
- [Query Blocks & Transactions](guide-query-blocks) — read on-chain data

## Related Packages

- [JSON-RPC Transport](/docs/json-rpc-transport/overview) — detailed package documentation
