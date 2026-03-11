---
title: Decode Function Calls from Transaction Input
sidebar_label: "Decode Transactions"
sidebar_position: 12
description: Validate and decode smart contract function calls from transaction input data
---

# Decode Function Calls from Transaction Input

When you retrieve a transaction from the blockchain (as in [Query Blocks](guide-query-blocks)), its `Input` field contains the raw ABI-encoded function call. This guide shows how to check if a transaction calls a specific function and decode its parameters into typed C# objects.

```bash
dotnet add package Nethereum.Web3
dotnet add package Nethereum.Contracts
```

## Define the Function Message

The first 4 bytes of a transaction's input data identify which function is being called. This selector is the Keccak-256 hash of the function signature (e.g., `transfer(address,uint256)` produces `a9059cbb`). The remaining bytes are the ABI-encoded parameters.

To decode that data, define a C# class that mirrors the Solidity function signature. The `[Function]` and `[Parameter]` attributes tell Nethereum how to map the ABI-encoded bytes back to typed properties:

```csharp
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;
using System.Numerics;

[Function("transfer", "bool")]
public class TransferFunction : FunctionMessage
{
    [Parameter("address", "_to", 1)]
    public string To { get; set; }

    [Parameter("uint256", "_value", 2)]
    public BigInteger TokenAmount { get; set; }
}
```

## Check and Decode the Transaction

`IsTransactionForFunctionMessage<T>()` compares the first 4 bytes of the transaction input against the function selector derived from `TransferFunction`. If the selector matches, `DecodeTransaction` ABI-decodes the remaining bytes into the typed message. If the selector does not match, the transaction is for a different function and is skipped.

```csharp
using Nethereum.Web3;
using Nethereum.Contracts.Extensions;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR-PROJECT-ID");

var txn = await web3.Eth.Transactions.GetTransactionByHash
    .SendRequestAsync(
        "0x0404a0517a7443db1787b5461b9d5fc18546809419c0cc6a736599b60677ed71");

if (txn.IsTransactionForFunctionMessage<TransferFunction>())
{
    var transfer = new TransferFunction().DecodeTransaction(txn);
    Console.WriteLine("To: " + transfer.To);
    Console.WriteLine("Amount: " + Web3.Convert.FromWei(transfer.TokenAmount));
}
```

`Web3.Convert.FromWei` converts a raw `BigInteger` value in wei to its ether-unit decimal representation. See [Unit Conversion](guide-unit-conversion) for details.

## Next Steps

- [ABI Encoding](guide-abi-encoding) -- encode and decode smart contract data in depth
- [Query Blocks](guide-query-blocks) -- get block and transaction data
- [Transaction Recovery](guide-transaction-recovery) -- recover the sender from a signed transaction
