---
title: Stream Real-Time Blockchain Data
sidebar_label: "Real-Time Streaming"
sidebar_position: 13
description: Subscribe to blocks, transactions, and event logs using WebSocket and Rx
---

# Stream Real-Time Blockchain Data

When you need to react to blockchain events as they happen — new blocks mined, tokens transferred, DEX swaps executed — you subscribe to a stream rather than polling in a loop. Nethereum provides two approaches:

| Approach | Transport | Best for |
|----------|-----------|----------|
| **WebSocket subscriptions** | Persistent WSS connection | Sub-second latency, no missed events |
| **Rx polling** | Standard HTTP | HTTP-only providers, simpler setup |

Both use [Reactive Extensions (Rx)](https://github.com/dotnet/reactive) for a uniform `IObservable<T>` API — you compose streams with `.Where()`, `.Select()`, `.Buffer()`, and other Rx operators.

## Prerequisites

```bash
dotnet add package Nethereum.RPC.Reactive
dotnet add package Nethereum.JsonRpc.WebSocketStreamingClient
```

You need a WebSocket endpoint (starts with `wss://`). Most providers offer one — Infura, Alchemy, Ankr, or a local node with `--ws` enabled. For HTTP-only fallback, see [Polling-Based Streams](#polling-based-streams-http) below.

---

## WebSocket: Connect and Subscribe

### Create the Client

```csharp
using Nethereum.JsonRpc.WebSocketStreamingClient;
using Nethereum.RPC.Reactive.Eth.Subscriptions;

var client = new StreamingWebSocketClient("wss://mainnet.infura.io/ws/v3/YOUR_KEY");
await client.StartAsync();
```

The client maintains a single persistent connection. All subscriptions share it — you don't create a new connection per subscription.

### New Block Headers

The most common subscription. Fires every time a new block is mined (roughly every 12 seconds on mainnet):

<!-- tag:ExampleNewHeaderSubscription:SubscribeAndRunAsync -->

```csharp
var subscription = new EthNewBlockHeadersObservableSubscription(client);

subscription.GetSubscriptionDataResponsesAsObservable()
    .Subscribe(block =>
    {
        Console.WriteLine($"Block {block.Number} — {block.Timestamp}");
        Console.WriteLine($"  Gas used: {block.GasUsed}");
    });

await subscription.SubscribeAsync();
```

Block headers include number, timestamp, gas used/limit, base fee, and miner — but **not** the full transaction list. If you need transactions, fetch the full block by number when a header arrives.

### Pending Transactions

Watch the mempool for transactions before they're mined. Returns transaction hashes only (not full transaction objects):

```csharp
var subscription = new EthNewPendingTransactionObservableSubscription(client);

subscription.GetSubscriptionDataResponsesAsObservable()
    .Subscribe(txHash =>
    {
        Console.WriteLine($"Pending tx: {txHash}");
    });

await subscription.SubscribeAsync();
```

:::warning
Pending transaction streams can be extremely high-volume on mainnet (thousands per second). Always filter or buffer to avoid overwhelming your application.
:::

### Event Logs

Subscribe to specific contract events by address and topic filters. This is the foundation for monitoring token transfers, DEX activity, governance votes, etc.:

```csharp
using Nethereum.RPC.Eth.DTOs;

var filter = new NewFilterInput
{
    Address = new[] { "0xContractAddress..." },
    Topics = new[] { /* event signature hash */ }
};

var subscription = new EthLogsObservableSubscription(client);

subscription.GetSubscriptionDataResponsesAsObservable()
    .Subscribe(log =>
    {
        Console.WriteLine($"Log from {log.Address} in block {log.BlockNumber}");
    });

await subscription.SubscribeAsync(filter);
```

---

## Real-World Example: ERC-20 Transfer Streaming

Rather than building raw topic filters, use the typed event DTO to create the filter automatically:

<!-- tag:ExampleLogsERC20Subscriptions:SubscribeAndRunAsync -->

```csharp
using Nethereum.Contracts;
using Nethereum.Contracts.Standards.ERC20.ContractDefinition;

// Create a typed filter for Transfer events on the DAI contract
var filterTransfers = Event<TransferEventDTO>.GetEventABI()
    .CreateFilterInput("0x6B175474E89094C44Da98b954EedeAC495271d0F");

var subscription = new EthLogsObservableSubscription(client);

subscription.GetSubscriptionDataResponsesAsObservable()
    .Subscribe(log =>
    {
        var decoded = Event<TransferEventDTO>.DecodeEvent(log);
        if (decoded != null)
        {
            Console.WriteLine($"Transfer: {decoded.Event.From} → {decoded.Event.To}");
            Console.WriteLine($"  Value: {Web3.Convert.FromWei(decoded.Event.Value)}");
        }
    });

await subscription.SubscribeAsync(filterTransfers);
```

The `CreateFilterInput` method builds the correct topic hash from the event signature. `DecodeEvent` returns `null` for logs that don't match the type — safe to use on multi-event streams.

---

## Real-World Example: DEX Swap Monitoring

Monitor Uniswap V2 pair swaps with price calculation:

<!-- tag:ExampleLogsUniswapSwapsSubscription:SubscribeAndRunAsync -->

```csharp
[Event("Swap")]
public class SwapEventDTO : IEventDTO
{
    [Parameter("address", "sender", 1, true)] public string Sender { get; set; }
    [Parameter("uint256", "amount0In", 2)]    public BigInteger Amount0In { get; set; }
    [Parameter("uint256", "amount1In", 3)]    public BigInteger Amount1In { get; set; }
    [Parameter("uint256", "amount0Out", 4)]   public BigInteger Amount0Out { get; set; }
    [Parameter("uint256", "amount1Out", 5)]   public BigInteger Amount1Out { get; set; }
    [Parameter("address", "to", 6, true)]     public string To { get; set; }
}

var pairAddress = "0xa478c2975ab1ea89e8196811f51a7b7ade33eb11"; // DAI-ETH
var filter = Event<SwapEventDTO>.GetEventABI().CreateFilterInput(pairAddress);

var subscription = new EthLogsObservableSubscription(client);
subscription.GetSubscriptionDataResponsesAsObservable()
    .Subscribe(log =>
    {
        var swap = log.DecodeEvent<SwapEventDTO>();
        if (swap != null)
        {
            var amount0Out = UnitConversion.Convert.FromWei(swap.Event.Amount0Out);
            var amount1In  = UnitConversion.Convert.FromWei(swap.Event.Amount1In);

            if (swap.Event.Amount0In == 0 && swap.Event.Amount1Out == 0 && amount1In > 0)
            {
                var price = amount0Out / amount1In;
                Console.WriteLine($"Sell ETH — Price: {price:F4} DAI/ETH");
            }
        }
    });

await subscription.SubscribeAsync(filter);
```

---

## Connection Management

WebSocket connections drop — providers timeout idle connections, networks hiccup, and servers restart. Production code needs reconnection logic.

### Error Handling

```csharp
client.Error += async (sender, ex) =>
{
    Console.WriteLine($"WebSocket error: {ex.Message}");
    // Stop and recreate — subscriptions need to be re-established
    await ((StreamingWebSocketClient)sender).StopAsync();
    await ReconnectAndSubscribeAsync();
};
```

### Keep-Alive Pinging

Most hosted providers (Infura, Alchemy) close idle WebSocket connections after 1-2 minutes. Send periodic RPC calls to keep the connection alive:

```csharp
using Nethereum.RPC.Reactive.Eth;

_ = Task.Run(async () =>
{
    while (true)
    {
        var handler = new EthBlockNumberObservableHandler(client);
        handler.GetResponseAsObservable()
            .Subscribe(x => Console.WriteLine($"Keepalive — block {x.Value}"));
        await handler.SendRequestAsync();
        await Task.Delay(30000); // ping every 30 seconds
    }
});
```

### Enriching Pending Transactions

Pending transaction subscriptions only give you hashes. To get the full transaction, fetch it on demand:

<!-- tag:ExamplePendingTransactionsWithTransactionsUsingSameClient:SubscribeAndRunAsync -->

```csharp
using Nethereum.RPC.Reactive.Eth.Transactions;

var pendingSub = new EthNewPendingTransactionObservableSubscription(client);

pendingSub.GetSubscriptionDataResponsesAsObservable()
    .Subscribe(txHash =>
    {
        var txByHash = new EthGetTransactionByHashObservableHandler(client);
        txByHash.GetResponseAsObservable().Subscribe(tx =>
        {
            if (tx != null)
                Console.WriteLine($"Pending: {tx.From} → {tx.To} ({Web3.Convert.FromWei(tx.Value)} ETH)");
        });
        txByHash.SendRequestAsync(txHash).Wait();
    });

await pendingSub.SubscribeAsync();
```

---

## Polling-Based Streams (HTTP)

If your node only supports HTTP, use polling-based Rx streams. Same `IObservable<T>` API, but backed by periodic `eth_getFilterChanges` calls:

```csharp
using Nethereum.RPC.Reactive.Polling;
using Nethereum.Web3;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR_KEY");
```

### Poll for New Blocks

```csharp
var blockStream = web3.Eth.Blocks
    .GetBlockWithTransactionsByNumber
    .CreateObservable(intervalMs: 2000);

blockStream.Subscribe(block =>
{
    Console.WriteLine($"Block {block.Number} with {block.Transactions.Length} txs");
});
```

The polling interval controls the trade-off between latency and request volume. 2 seconds is reasonable for most use cases.

---

## Rx Operators for Stream Processing

Since subscriptions return `IObservable<T>`, you get the full power of Rx LINQ operators:

```csharp
using System.Reactive.Linq;

// Only blocks with gas usage above 15M (near-full blocks)
subscription.GetSubscriptionDataResponsesAsObservable()
    .Where(block => block.GasUsed > 15_000_000)
    .Select(block => new { block.Number, block.GasUsed })
    .Subscribe(b => Console.WriteLine($"High-gas block: {b.Number}"));

// Buffer events into 10-second windows for batch processing
subscription.GetSubscriptionDataResponsesAsObservable()
    .Buffer(TimeSpan.FromSeconds(10))
    .Where(batch => batch.Count > 0)
    .Subscribe(batch => ProcessBatch(batch));
```

---

## Choosing Between WebSocket and Polling

| Feature | WebSocket | Polling |
|---------|-----------|---------|
| Latency | Sub-second | Polling interval |
| Node requirement | WSS endpoint | HTTP endpoint |
| Missed events | None (server pushes) | Possible between polls |
| Connection overhead | Single persistent | New request per poll |
| Provider support | Most (Infura, Alchemy, Ankr) | All |

Use **WebSocket** when you need instant notifications and your provider supports it. Use **polling** as a fallback for HTTP-only environments or when WebSocket stability is a concern.

## Next Steps

- [RPC Transport Options](guide-rpc-transport) — choose the right connection method for your platform
- [Query Blocks & Transactions](guide-query-blocks) — one-off on-demand queries
- [Events & Logs](../smart-contracts/guide-events) — decode and filter contract events

## Package References

- [Nethereum.RPC.Reactive](nethereum-rpc-reactive) — Rx-based streaming API
- [Nethereum.Web3](nethereum-web3) — main entry point
