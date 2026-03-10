---
title: Stream Real-Time Blockchain Data
sidebar_label: "Real-Time Streaming"
sidebar_position: 13
description: Subscribe to blocks, transactions, and event logs using WebSocket and Rx
---

# Stream Real-Time Blockchain Data

Subscribe to new blocks, pending transactions, and event logs in real time using WebSocket subscriptions or polling-based Rx streams.

## Installation

```bash
dotnet add package Nethereum.RPC.Reactive
dotnet add package Nethereum.JsonRpc.WebSocketStreamingClient
```

## WebSocket Subscriptions

### Connect to a WebSocket Node

```csharp
using Nethereum.JsonRpc.WebSocketStreamingClient;
using Nethereum.RPC.Reactive.Eth.Subscriptions;

var client = new StreamingWebSocketClient("wss://mainnet.infura.io/ws/v3/YOUR_KEY");
await client.StartAsync();
```

### Subscribe to New Block Headers

```csharp
var subscription = new EthNewBlockHeadersObservableSubscription(client);

subscription.GetSubscriptionDataResponsesAsObservable()
    .Subscribe(block =>
    {
        Console.WriteLine($"Block {block.Number} — {block.Timestamp}");
        Console.WriteLine($"  Gas used: {block.GasUsed}");
        Console.WriteLine($"  Tx count: {block.TransactionCount}");
    });

await subscription.SubscribeAsync();
```

### Subscribe to Pending Transactions

```csharp
var subscription = new EthNewPendingTransactionObservableSubscription(client);

subscription.GetSubscriptionDataResponsesAsObservable()
    .Subscribe(txHash =>
    {
        Console.WriteLine($"Pending tx: {txHash}");
    });

await subscription.SubscribeAsync();
```

### Subscribe to Event Logs

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

## ERC20 Transfer Event Streaming

Stream decoded ERC20 `Transfer` events from a specific contract (e.g. DAI) using typed event filters:

```csharp
using Nethereum.Contracts;
using Nethereum.Contracts.Standards.ERC20.ContractDefinition;
using Nethereum.RPC.Reactive.Eth.Subscriptions;

// Create a typed filter for Transfer events on the DAI contract
var filterTransfers = Event<TransferEventDTO>.GetEventABI()
    .CreateFilterInput("0x6B175474E89094C44Da98b954EedeAC495271d0F");

var ethLogsTokenTransfer = new EthLogsObservableSubscription(client);

ethLogsTokenTransfer.GetSubscriptionDataResponsesAsObservable()
    .Subscribe(log =>
    {
        var decoded = Event<TransferEventDTO>.DecodeEvent(log);
        if (decoded != null)
        {
            Console.WriteLine($"Transfer from: {decoded.Event.From}");
            Console.WriteLine($"Transfer to: {decoded.Event.To}");
            Console.WriteLine($"Value: {decoded.Event.Value}");
        }
    });

await ethLogsTokenTransfer.SubscribeAsync(filterTransfers);
```


## DEX Trade Monitoring (Uniswap Swaps)

Monitor real-time Uniswap swap events with price calculation:

```csharp
// Define the Swap event DTO
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
        var amount0Out = UnitConversion.Convert.FromWei(swap.Event.Amount0Out);
        var amount1In  = UnitConversion.Convert.FromWei(swap.Event.Amount1In);

        if (swap.Event.Amount0In == 0 && swap.Event.Amount1Out == 0)
        {
            var price = amount0Out / amount1In;
            Console.WriteLine($"Sell ETH — Price: {price:F4}");
        }
    });

await subscription.SubscribeAsync(filter);
```


## Pending Transaction Enrichment

Subscribe to pending transaction hashes, then fetch the full transaction details:

```csharp
using Nethereum.RPC.Reactive.Eth.Subscriptions;
using Nethereum.RPC.Reactive.Eth.Transactions;

var pendingSubscription = new EthNewPendingTransactionObservableSubscription(client);

pendingSubscription.GetSubscriptionDataResponsesAsObservable()
    .Subscribe(txHash =>
    {
        var txByHash = new EthGetTransactionByHashObservableHandler(client);
        txByHash.GetResponseAsObservable().Subscribe(tx =>
        {
            if (tx != null)
                Console.WriteLine($"Pending: {tx.TransactionHash} from {tx.From} to {tx.To}");
        });
        txByHash.SendRequestAsync(txHash).Wait();
    });

await pendingSubscription.SubscribeAsync();
```


## Reconnection Pattern

All streaming examples use an error handler that stops the client and re-subscribes automatically:

```csharp
client.Error += async (sender, ex) =>
{
    Console.WriteLine("Client error, restarting...");
    ((StreamingWebSocketClient)sender).StopAsync().Wait();
    // Re-run subscription setup
    await SubscribeAndRunAsync();
};
```

## Keep-Alive Pinging

For hosted providers like Infura, send periodic `eth_blockNumber` calls to keep the WebSocket alive:

```csharp
while (true)
{
    var handler = new EthBlockNumberObservableHandler(client);
    handler.GetResponseAsObservable()
        .Subscribe(x => Console.WriteLine($"Block: {x.Value}"));
    await handler.SendRequestAsync();
    Thread.Sleep(30000); // ping every 30 seconds
}
```


## Polling-Based Streams (HTTP)

If your node doesn't support WebSocket, use polling-based Rx streams over HTTP.

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

## Rx Operators for Filtering

Combine with standard Rx operators to filter and transform streams:

```csharp
using System.Reactive.Linq;

subscription.GetSubscriptionDataResponsesAsObservable()
    .Where(block => block.GasUsed > 15_000_000)
    .Select(block => new { block.Number, block.GasUsed })
    .Subscribe(b => Console.WriteLine($"High-gas block: {b.Number}"));
```

## Error Handling and Reconnection

```csharp
subscription.GetSubscriptionDataResponsesAsObservable()
    .Subscribe(
        onNext: block => ProcessBlock(block),
        onError: ex =>
        {
            Console.WriteLine($"Subscription error: {ex.Message}");
            // Reconnect logic here
        });
```

## Choosing Between WebSocket and Polling

| Feature | WebSocket | Polling |
|---------|-----------|---------|
| Latency | Sub-second | Polling interval |
| Node requirement | WSS endpoint | HTTP endpoint |
| Missed events | No (server pushes) | Possible between polls |
| Connection overhead | Single persistent | New request per poll |

Use **WebSocket** when your provider supports it and you need instant notifications. Use **polling** as a fallback for HTTP-only providers.

## Next Steps

- [Choose an RPC Transport](guide-rpc-transport) — pick the right connection method
- [Query Blocks & Transactions](guide-query-blocks) — one-off queries

## Related Packages

- [Nethereum.RPC.Reactive](nethereum-rpc-reactive) — full Rx API reference
- [JSON-RPC Transport](/docs/json-rpc-transport/overview) — transport options
