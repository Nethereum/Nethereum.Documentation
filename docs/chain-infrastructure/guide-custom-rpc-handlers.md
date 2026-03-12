---
title: Custom RPC Handlers
sidebar_label: Custom RPC Handlers
sidebar_position: 4
description: Add custom JSON-RPC methods to your chain node using the extensible handler framework
---

# Custom RPC Handlers

CoreChain includes a complete JSON-RPC framework with built-in handlers for all standard `eth_*`, `net_*`, `web3_*`, and `debug_trace*` methods. When you need chain-specific functionality — custom namespaces, admin methods, or domain-specific queries — you can add your own handlers using the same framework.

## Prerequisites

```bash
dotnet add package Nethereum.CoreChain
```

## The RPC Framework

Three components work together:

1. **`RpcHandlerRegistry`** — maps method names to handler instances
2. **`RpcDispatcher`** — routes incoming requests to the right handler
3. **`RpcHandlerBase`** — base class with helper methods for parameter extraction and response creation

### Registering Standard Handlers

```csharp
using Nethereum.CoreChain.Rpc;

var registry = new RpcHandlerRegistry();

// Register all standard Ethereum handlers
registry.AddStandardHandlers();

// The dispatcher routes requests to registered handlers
var context = new RpcContext(chainNode, chainId, serviceProvider);
var dispatcher = new RpcDispatcher(registry, context, logger);
```

This registers 30+ handlers covering the full Ethereum JSON-RPC spec: block queries, transaction submission, state reads, gas estimation, log filtering, proof generation, and debug tracing.

## Writing a Custom Handler

Extend `RpcHandlerBase` and implement `HandleAsync`:

```csharp
using Nethereum.CoreChain.Rpc;
using Nethereum.JsonRpc.Client.RpcMessages;

public class MyCustomHandler : RpcHandlerBase
{
    public override string MethodName => "my_customMethod";

    public override async Task<RpcResponseMessage> HandleAsync(
        RpcRequestMessage request, RpcContext context)
    {
        // Extract parameters (type-safe)
        var address = GetParam<string>(request, 0);
        var blockNumber = GetParam<string>(request, 1) ?? "latest";

        // Access chain state through context
        var balance = await context.Node.StateStore
            .GetAccountAsync(address);

        // Return success response
        return Success(request.Id, new
        {
            address = address,
            balance = balance?.Balance.ToString() ?? "0"
        });
    }
}
```

`RpcHandlerBase` provides helper methods:
- `GetParam<T>(request, index)` — extract a typed parameter by position
- `Success(id, result)` — create a success response
- `Error(id, code, message)` — create an error response

### Registering Custom Handlers

```csharp
var registry = new RpcHandlerRegistry();
registry.AddStandardHandlers();

// Add custom handler
registry.Register(new MyCustomHandler());

// Override an existing handler
registry.Override(new MyCustomEthCallHandler());
```

`Register` adds a new method. `Override` replaces an existing handler for the same method name — useful when you need to customize standard behavior.

## Built-in RPC Methods

The standard handlers cover the complete Ethereum JSON-RPC specification:

| Category | Methods |
|----------|---------|
| **Network** | `web3_clientVersion`, `web3_sha3`, `net_version`, `net_listening`, `net_peerCount`, `eth_chainId`, `eth_syncing`, `eth_mining`, `eth_coinbase` |
| **Blocks** | `eth_blockNumber`, `eth_getBlockByHash`, `eth_getBlockByNumber`, `eth_getBlockTransactionCountByHash`, `eth_getBlockTransactionCountByNumber`, `eth_getBlockReceipts` |
| **Transactions** | `eth_sendRawTransaction`, `eth_getTransactionByHash`, `eth_getTransactionByBlockHashAndIndex`, `eth_getTransactionByBlockNumberAndIndex`, `eth_getTransactionReceipt` |
| **State** | `eth_getBalance`, `eth_getCode`, `eth_getStorageAt`, `eth_getTransactionCount` |
| **Execution** | `eth_call`, `eth_estimateGas`, `eth_createAccessList` |
| **Gas & Fees** | `eth_gasPrice`, `eth_maxPriorityFeePerGas`, `eth_feeHistory` |
| **Logs & Filters** | `eth_getLogs`, `eth_newFilter`, `eth_newBlockFilter`, `eth_getFilterChanges`, `eth_getFilterLogs`, `eth_uninstallFilter` |
| **Proofs** | `eth_getProof` |
| **Debug** | `debug_traceTransaction`, `debug_traceCall` |

## Dispatching Requests

The `RpcDispatcher` handles single and batch requests:

```csharp
// Single request
var response = await dispatcher.DispatchAsync(request);

// Batch request
var responses = await dispatcher.DispatchBatchAsync(requests);
```

For metrics and monitoring, use `InstrumentedRpcDispatcher` which tracks call counts, latencies, and error rates per method.

## Next Steps

- [Custom Chain Node](guide-custom-chain-node) — build a complete chain node that uses your custom handlers
- [Forking](guide-forking) — fork state from live networks for your custom chain
- For the complete handler list, see the [Nethereum.CoreChain package reference](nethereum-corechain)
