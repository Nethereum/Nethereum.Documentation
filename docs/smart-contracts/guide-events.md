---
title: Filter & Query Events
sidebar_label: "Events"
sidebar_position: 6
description: Listen for and decode smart contract events using Nethereum
---

# Filter & Query Events

Smart contracts emit events (logs) to signal that something happened on-chain. Nethereum lets you define strongly-typed DTOs for events, create filters with block ranges and indexed parameters, and decode logs from transaction receipts or historical queries.

```bash
dotnet add package Nethereum.Web3
```

## Define an Event DTO

Use the `[Event]` attribute to map a Solidity event and `[Parameter]` to map each field. The fourth argument (`true`) marks indexed (topic) parameters.

```csharp
using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;

[Event("Transfer")]
public class TransferEventDTO : IEventDTO
{
    [Parameter("address", "_from", 1, true)]
    public string From { get; set; }

    [Parameter("address", "_to", 2, true)]
    public string To { get; set; }

    [Parameter("uint256", "_value", 3, false)]
    public BigInteger Value { get; set; }
}
```

Nethereum already ships `TransferEventDTO` and `ApprovalEventDTO` for ERC-20 in `Nethereum.Contracts.Standards.ERC20.ContractDefinition` -- you can use those directly instead of defining your own.

## Get an Event Handler

Obtain a typed event handler from a Web3 instance:

```csharp
var web3 = new Web3("https://mainnet.infura.io/v3/YOUR_KEY");
var contractAddress = "0xYourContractAddress";

var transferEvent = web3.Eth.GetEvent<TransferEventDTO>(contractAddress);
```

You can also get the event handler from a contract handler:

```csharp
var contractHandler = web3.Eth.GetContractHandler(contractAddress);
var transferEvent = contractHandler.GetEvent<TransferEventDTO>();
```

## Query All Historical Events

Create a filter input with a block range and retrieve all matching logs:

```csharp
var filterInput = transferEvent.CreateFilterInput(
    BlockParameter.CreateEarliest(),
    BlockParameter.CreateLatest());

var allTransfers = await transferEvent.GetAllChangesAsync(filterInput);

foreach (var transfer in allTransfers)
{
    Console.WriteLine(
        $"From: {transfer.Event.From} To: {transfer.Event.To} Value: {transfer.Event.Value}");
}
```

## Filter by Indexed Parameters

Indexed parameters (`true` in the `[Parameter]` attribute) become topics that the node can filter server-side.

### Filter by sender (first indexed param)

```csharp
var fromAddress = "0xSenderAddress";
var filterByFrom = transferEvent.CreateFilterInput(fromAddress);
var results = await transferEvent.GetAllChangesAsync(filterByFrom);
```

### Filter by recipient (second indexed param)

Pass `null` for the first topic to skip it:

```csharp
var toAddress = "0xRecipientAddress";
var filterByTo = transferEvent.CreateFilterInput<string, string>(null, toAddress);
var results = await transferEvent.GetAllChangesAsync(filterByTo);
```

### Filter by both sender and recipient

```csharp
var filterBoth = transferEvent.CreateFilterInput(fromAddress, toAddress);
var results = await transferEvent.GetAllChangesAsync(filterBoth);
```

### Filter by multiple addresses (array)

```csharp
var filterFromArray = transferEvent.CreateFilterInput(
    new[] { address1, address2 });

var filterToArray = transferEvent.CreateFilterInput(
    null,
    new[] { recipientA, recipientB });

var filterBothArrays = transferEvent.CreateFilterInput(
    new[] { address1, address2 },
    new[] { recipientA, recipientB });
```

## Use a Live Filter (Poll for New Events)

Instead of querying history, install a filter and poll for new events:

```csharp
var contractHandler = web3.Eth.GetContractHandler(contractAddress);
var eventFilter = contractHandler.GetEvent<TransferEventDTO>();

var filterId = await eventFilter.CreateFilterAsync();

// ... transactions happen ...

var newEvents = await eventFilter.GetFilterChangesAsync(filterId);
foreach (var evt in newEvents)
{
    Console.WriteLine($"New transfer: {evt.Event.Value}");
}
```

## Decode Events from a Transaction Receipt

After sending a transaction, decode events directly from the receipt logs:

```csharp
var receipt = await web3.Eth.GetTransactionReceipt
    .SendRequestAsync(transactionHash);

// Decode all Transfer events from the receipt
var transfers = receipt.DecodeAllEvents<TransferEventDTO>();

foreach (var transfer in transfers)
{
    Console.WriteLine(
        $"From: {transfer.Event.From} To: {transfer.Event.To} Value: {transfer.Event.Value}");
}
```

You can also decode from a `JArray` of logs:

```csharp
var decoded = receipt.Logs.DecodeAllEvents<TransferEventDTO>();
```

## Decode Custom Events from Receipt

For custom events, the same pattern applies:

```csharp
[Event("ItemCreated")]
public class ItemCreatedEventDTO : IEventDTO
{
    [Parameter("uint256", "itemId", 1, true)]
    public BigInteger ItemId { get; set; }

    [Parameter("address", "result", 2, false)]
    public string Result { get; set; }
}

// After a transaction that emits ItemCreated
var items = receipt.DecodeAllEvents<ItemCreatedEventDTO>();
```

## Query Events Without a Specific Contract

You can query events across all contracts by constructing the `Event<T>` directly with just the client:

```csharp
var eventForAnyContract = new Event<TransferEventDTO>(web3.Client);
var filterInput = eventForAnyContract.CreateFilterInput();
var allTransfers = await eventForAnyContract.GetAllChangesAsync(filterInput);
```

Or scope to a specific contract:

```csharp
var eventForContract = new Event<TransferEventDTO>(web3.Client, contractAddress);
var filterInput = eventForContract.CreateFilterInput();
var results = await eventForContract.GetAllChangesAsync(filterInput);
```

## Built-in ERC-20 Event DTOs

Nethereum provides pre-built DTOs for standard ERC-20 events:

```csharp
using Nethereum.Contracts.Standards.ERC20.ContractDefinition;

// TransferEventDTO - Transfer(address indexed _from, address indexed _to, uint256 _value)
// ApprovalEventDTO - Approval(address indexed _owner, address indexed _spender, uint256 _value)

var transfers = receipt.DecodeAllEvents<TransferEventDTO>();
var approvals = receipt.DecodeAllEvents<ApprovalEventDTO>();
```

## Typed Topic Filtering with FilterInputBuilder

`FilterInputBuilder<T>` provides a fluent, lambda-based API for building event filters. Instead of positional topic arguments, you reference indexed properties directly by name -- fully type-safe with compile-time checking.

```csharp
using Nethereum.Contracts;

// Build a filter using lambda expressions on the DTO properties
var filter = new FilterInputBuilder<TransferEventDTO>()
    .AddTopic(t => t.From, "0xSenderAddress")
    .Build(contractAddress);

var results = await transferEvent.GetAllChangesAsync(filter);
```

### Filter by multiple values (OR matching)

```csharp
var filter = new FilterInputBuilder<TransferEventDTO>()
    .AddTopic(t => t.From, new[] { "0xAddress1", "0xAddress2" })
    .Build(contractAddress);
```

### Filter by multiple indexed parameters

```csharp
var filter = new FilterInputBuilder<TransferEventDTO>()
    .AddTopic(t => t.From, "0xSenderAddress")
    .AddTopic(t => t.To, "0xRecipientAddress")
    .Build(contractAddress);
```

### With block range

```csharp
var filter = new FilterInputBuilder<TransferEventDTO>()
    .AddTopic(t => t.To, "0xRecipientAddress")
    .Build(contractAddress,
        BlockParameter.CreateEarliest(),
        BlockParameter.CreateLatest());

// Or using BlockRange
var filter = new FilterInputBuilder<TransferEventDTO>()
    .AddTopic(t => t.From, "0xSenderAddress")
    .Build(contractAddress, new BlockRange(fromBlock, toBlock));
```

### Multiple contracts

```csharp
var filter = new FilterInputBuilder<TransferEventDTO>()
    .AddTopic(t => t.From, "0xSenderAddress")
    .Build(new[] { contractAddress1, contractAddress2 });
```

The builder only includes topics for indexed parameters (those marked `true` in the `[Parameter]` attribute). Non-indexed parameters are ignored.
## Playground Samples

Try interactive event examples in the [Nethereum Playground](http://playground.nethereum.com):

- **Sample 1008** -- Querying events with filters and indexed parameters
- **Sample 1009** -- Subscribing to event logs

## Next Steps

- [ERC-20 Tokens](./erc20.md) -- Query balances and transfer tokens using built-in typed services
- [Real-Time Streaming](../core-foundation/nethereum-rpc-reactive.md) -- Subscribe to events over WebSocket with Rx observables
