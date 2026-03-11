---
title: Multicall & Batch Queries
sidebar_label: "Multicall"
sidebar_position: 7
description: Batch multiple contract queries into a single call with Nethereum Multicall
---

# Multicall & Batch Queries

:::tip The Simple Way
```csharp
var multiQuery = web3.Eth.GetMultiQueryHandler();
var balance1 = multiQuery.AddQueryHandler<BalanceOfFunction, BigInteger>(contract1, balanceMsg1);
var balance2 = multiQuery.AddQueryHandler<BalanceOfFunction, BigInteger>(contract2, balanceMsg2);
await multiQuery.MultiCallAsync();
```
Batch multiple reads into a single call — no gas needed for read-only queries.
:::

When you need to read data from multiple contracts or call the same function with different parameters, sending individual RPC requests is slow and wasteful. Nethereum provides two approaches to batch queries into fewer round-trips:

- **Multicall contract** -- aggregates calls through the on-chain Multicall contract (single `eth_call`)
- **RPC batch** -- sends multiple `eth_call` requests in one JSON-RPC batch (no on-chain contract needed)

## Prerequisites

```bash
dotnet add package Nethereum.Web3
```

## Define DTOs

Both approaches share the same typed function and output DTOs:

```csharp
using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;

[Function("balanceOf", "uint256")]
public class BalanceOfFunction : FunctionMessage
{
    [Parameter("address", "owner", 1)]
    public string Owner { get; set; }
}

[FunctionOutput]
public class BalanceOfOutputDTO : IFunctionOutputDTO
{
    [Parameter("uint256", "balance", 1)]
    public BigInteger Balance { get; set; }
}
```

## Approach 1: Multicall Contract

The Multicall handler routes all calls through the on-chain [Multicall3](https://www.multicall3.com/) contract, returning results in a single `eth_call`.

```csharp
using Nethereum.Web3;
using Nethereum.Contracts.QueryHandlers.MultiCall;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR-PROJECT-ID");

var balanceOfMessage1 = new BalanceOfFunction()
{
    Owner = "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643"
};
var call1 = new MulticallInputOutput<BalanceOfFunction, BalanceOfOutputDTO>(
    balanceOfMessage1,
    "0x6b175474e89094c44da98b954eedeac495271d0f"); // DAI contract

var balanceOfMessage2 = new BalanceOfFunction()
{
    Owner = "0x6c6bc977e13df9b0de53b251522280bb72383700"
};
var call2 = new MulticallInputOutput<BalanceOfFunction, BalanceOfOutputDTO>(
    balanceOfMessage2,
    "0x6b175474e89094c44da98b954eedeac495271d0f"); // DAI contract

// Execute both queries in a single eth_call
await web3.Eth.GetMultiQueryHandler().MultiCallAsync(call1, call2);

Console.WriteLine($"Balance 1: {call1.Output.Balance}");
Console.WriteLine($"Balance 2: {call2.Output.Balance}");
```

### Custom Multicall Address

If you deploy your own Multicall contract or need a different address:

```csharp
var handler = web3.Eth.GetMultiQueryHandler("0xYourMulticallAddress");
await handler.MultiCallV1Async(call1, call2);
```

## Approach 2: RPC Batch

The RPC batch approach sends individual `eth_call` requests bundled into a single JSON-RPC batch. This works with any node and does not require an on-chain Multicall contract.

```csharp
using Nethereum.Contracts.QueryHandlers.MultiCall;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR-PROJECT-ID");

var balanceOfMessage1 = new BalanceOfFunction()
{
    Owner = "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643"
};
var call1 = new MulticallInputOutput<BalanceOfFunction, BalanceOfOutputDTO>(
    balanceOfMessage1,
    "0x6b175474e89094c44da98b954eedeac495271d0f");

var balanceOfMessage2 = new BalanceOfFunction()
{
    Owner = "0x6c6bc977e13df9b0de53b251522280bb72383700"
};
var call2 = new MulticallInputOutput<BalanceOfFunction, BalanceOfOutputDTO>(
    balanceOfMessage2,
    "0x6b175474e89094c44da98b954eedeac495271d0f");

// Send as a JSON-RPC batch
await web3.Eth.GetMultiQueryBatchRpcHandler().MultiCallAsync(call1, call2);

Console.WriteLine($"Balance 1: {call1.Output.Balance}");
Console.WriteLine($"Balance 2: {call2.Output.Balance}");
```

### Manual Batch Items

For advanced scenarios where you want to combine multicall batch items with other RPC requests:

```csharp
var multiQueryBatchRpcHandler = web3.Eth.GetMultiQueryBatchRpcHandler();

var batchItems = multiQueryBatchRpcHandler
    .CreateMulticallInputOutputRpcBatchItems(0, call1, call2);

// batchItems can be combined with other RPC batch requests
// or sent directly through the client
```

## Choosing Between Approaches

| Feature | Multicall Contract | RPC Batch |
|---|---|---|
| Network round-trips | 1 `eth_call` | 1 HTTP request (multiple `eth_call`) |
| On-chain contract required | Yes (Multicall3) | No |
| Works on private chains | Only if Multicall is deployed | Always |
| Max batch size | Gas limit of single call | Node batch limit (default 3000) |

:::tip When to use which
Use the **Multicall contract** approach on public networks where Multicall3 is deployed -- it guarantees atomic reads at the same block. Use the **RPC batch** approach on private chains or when you need to combine with other RPC methods.
:::

## MulticallInput vs MulticallInputOutput

Nethereum provides two wrapper types for multicall items:

- **`MulticallInputOutput<TFunction, TOutput>`** -- use when you need the decoded output (most common). Wraps both the function message and output DTO, so results are decoded automatically into `call.Output`.
- **`MulticallInput<TFunction>`** -- use when you only need to send a call but don't need to decode the output (e.g., for write operations or when you handle decoding separately).

Both implement `IMulticallInput` and work with both the Multicall contract and RPC batch handlers.

## MultiSend (Batched Write Transactions)

Unlike Multicall (read-only batching), **MultiSend** batches multiple **write** transactions through a GnosisSafe-style MultiSend contract:

```csharp
using Nethereum.Contracts.TransactionHandlers.MultiSend;

var input1 = new MultiSendFunctionInput<TransferFunction>(
    new TransferFunction { To = recipient1, Value = amount1 },
    tokenAddress1);

var input2 = new MultiSendFunctionInput<TransferFunction>(
    new TransferFunction { To = recipient2, Value = amount2 },
    tokenAddress2);

var multiSendFunction = new MultiSendFunction(new IMultiSendInput[] { input1, input2 });
```

The `MultiSendEncoder` handles the packed encoding format (operation, target, value, data length, data) for each transaction in the batch.
## Next Steps

- [Error Handling](./guide-error-handling.md) -- handle errors from batched calls and custom reverts
- [Built-in Standards](./guide-built-in-standards.md) -- typed services for ERC-20, ERC-721, ENS, and more
- [Events & Logs](./guide-events.md) -- subscribe to and query contract events
