---
title: JSON-RPC Transport
sidebar_label: Overview
sidebar_position: 1
description: Connecting to Ethereum nodes via HTTP, WebSocket, IPC, or in-process DevChain
---

# JSON-RPC Transport

Ethereum nodes communicate with applications through a JSON-RPC API — a stateless, transport-agnostic protocol. Nethereum wraps every standard JSON-RPC method into typed C# methods so you rarely need to think about the raw protocol.

## Connecting to Ethereum

### HTTP (Most Common)

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

// Read-only (no signing)
var web3 = new Web3("https://mainnet.infura.io/v3/YOUR_API_KEY");

// With signing account
var account = new Account("YOUR_PRIVATE_KEY");
var web3 = new Web3(account, "https://mainnet.infura.io/v3/YOUR_API_KEY");
```

### In-Process DevChain (No External Node)

```csharp
using Nethereum.DevChain;
using Nethereum.Web3.Accounts;

var account = new Account("0xb5b1870957d373ef0eeffecc6e4812c0fd08f554b37b233526acc331bf1544f7");
var devChain = new DevChainNode();
await devChain.StartAsync(account);
var web3 = devChain.CreateWeb3(account);
```

### WebSocket (Real-Time Subscriptions)

```csharp
using Nethereum.JsonRpc.WebSocketStreamingClient;
using Nethereum.RPC.Reactive.Eth.Subscriptions;

var client = new StreamingWebSocketClient("wss://mainnet.infura.io/ws/v3/YOUR_API_KEY");
await client.StartAsync();

var subscription = new EthNewBlockHeadersObservableSubscription(client);
subscription.GetSubscriptionDataResponsesAsObservable().Subscribe(block =>
{
    Console.WriteLine($"New block: {block.BlockHash}");
});
await subscription.SubscribeAsync();
```

### IPC (Local Node)

```csharp
using Nethereum.JsonRpc.IpcClient;

var ipcClient = new IpcClient("./geth.ipc");
var web3 = new Web3(ipcClient);
```

## Choosing a Provider

| Provider | Use Case | Package |
|---|---|---|
| HTTP | Most applications, hosted nodes | `Nethereum.JsonRpc.RpcClient` (included in Web3) |
| DevChain | Local development and testing | `Nethereum.DevChain` |
| WebSocket | Real-time subscriptions | `Nethereum.JsonRpc.WebSocketStreamingClient` |
| IPC | Local node, lowest latency | `Nethereum.JsonRpc.IpcClient` |
| System.Text.Json HTTP | AOT-friendly / trimmed apps | `Nethereum.JsonRpc.SystemTextJsonRpcClient` |

## Nethereum's RPC Abstraction

| JSON-RPC Method | Nethereum API |
|---|---|
| `eth_getBalance` | `web3.Eth.GetBalance.SendRequestAsync(address)` |
| `eth_blockNumber` | `web3.Eth.Blocks.GetBlockNumber.SendRequestAsync()` |
| `eth_call` | `web3.Eth.Transactions.Call.SendRequestAsync(callInput)` |
| `eth_sendRawTransaction` | `web3.Eth.Transactions.SendRawTransaction.SendRequestAsync(signedTx)` |
| `eth_getTransactionReceipt` | `web3.Eth.Transactions.GetTransactionReceipt.SendRequestAsync(txHash)` |
| `eth_getLogs` | `web3.Eth.Filters.GetLogs.SendRequestAsync(filterInput)` |

## Finding RPC Endpoints

Use [Chainlist](https://chainlist.org/) to find RPC endpoints for any EVM-compatible network. For production use:

- [Infura](https://infura.io) — Ethereum, L2s, and testnets
- [Alchemy](https://alchemy.com) — Ethereum, L2s, and enhanced APIs
- [QuickNode](https://quicknode.com) — Multi-chain with global edge network
- [Ankr](https://ankr.com) — Decentralised RPC with public and premium tiers

## Error Handling

```csharp
try
{
    var receipt = await web3.Eth.Transactions.GetTransactionReceipt
        .SendRequestAsync("0xInvalidHash");
}
catch (RpcResponseException ex)
{
    Console.WriteLine($"RPC Error {ex.RpcError.Code}: {ex.RpcError.Message}");
}
```
