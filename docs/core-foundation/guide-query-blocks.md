---
title: Query Blocks and Transactions
sidebar_label: "Query Blocks & Txs"
sidebar_position: 11
description: Get blocks, transactions, receipts, and balances using Web3
---

# Query Blocks and Transactions

Every piece of blockchain data is accessible through JSON-RPC calls. Nethereum wraps these as strongly-typed async methods on `Web3`, so you get IntelliSense and compile-time safety instead of raw JSON.

This guide covers the read operations you'll use most often: checking balances, inspecting transactions, reading blocks, and decoding event logs from receipts. These are all **read-only** — they don't send transactions or cost gas.

## Prerequisites

```bash
dotnet add package Nethereum.Web3
```

Connect to any Ethereum node — a local devchain, a public RPC from [chainlist.org](https://chainlist.org), or a provider like [Infura](https://infura.io) or [Alchemy](https://alchemy.com):

```csharp
using Nethereum.Web3;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR_PROJECT_ID");
```

No account or private key needed — all operations here are read-only.

---

## Account Balance

The most common query. Returns the balance in wei (the smallest ETH unit, 10⁻¹⁸ ETH):

<!-- tag:HttpRpcEndToEndTests:GetBalance_ReflectsTransfers -->

```csharp
var balance = await web3.Eth.GetBalance.SendRequestAsync("0xaddress...");

// Convert from Wei to Ether
var etherAmount = Nethereum.Util.UnitConversion.Convert.FromWei(balance.Value);
```

### Historical Balance

Query the balance at a specific block height — useful for snapshots, auditing, or verifying past state. Not all providers support this for old blocks (they may need "archive" mode):

```csharp
using Nethereum.RPC.Eth.DTOs;

var balance = await web3.Eth.GetBalance.SendRequestAsync(
    "0xaddress...",
    new BlockParameter(new HexBigInteger(15000000)));
```

`BlockParameter` also accepts `BlockParameter.CreateLatest()`, `BlockParameter.CreatePending()`, and `BlockParameter.CreateEarliest()`.

---

## Blocks

### Latest Block Number

<!-- tag:HttpRpcEndToEndTests:BlockParentHash_FormsValidChain -->

```csharp
var blockNumber = await web3.Eth.Blocks.GetBlockNumber.SendRequestAsync();
// blockNumber.Value is a BigInteger
```

### Block with Transactions

Fetch a full block including all transaction objects. This is a large response for busy blocks (hundreds of transactions):

<!-- tag:HttpRpcEndToEndTests:GetBlockByNumber_ContainsTransactions -->

```csharp
using Nethereum.Hex.HexTypes;

var block = await web3.Eth.Blocks.GetBlockWithTransactionsByNumber
    .SendRequestAsync(new HexBigInteger(blockNumber));

// block.Number, block.Timestamp, block.Transactions[]
// block.BaseFee (present on EIP-1559 blocks, null on pre-London blocks)
```

If you only need transaction hashes (not full objects), use `GetBlockWithTransactionsHashesByNumber` instead — much lighter.

### Block by Hash

<!-- tag:HttpRpcEndToEndTests:GetBlockByNumber_MatchesGetBlockByHash -->

```csharp
var block = await web3.Eth.Blocks.GetBlockWithTransactionsByHash
    .SendRequestAsync("0xabc123...");
```

---

## Transactions

### Get Transaction by Hash

Returns the transaction as submitted — before execution. Useful for inspecting inputs, gas parameters, and the sender:

<!-- tag:HttpRpcEndToEndTests:GetTransactionByHash_ReturnsCorrectTx -->

```csharp
var tx = await web3.Eth.Transactions.GetTransactionByHash
    .SendRequestAsync("0xtxhash...");

// tx.From, tx.To, tx.Value, tx.GasPrice
// tx.MaxFeePerGas, tx.MaxPriorityFeePerGas (EIP-1559)
// tx.Type (0x0 = legacy, 0x2 = EIP-1559)
```

### Get Transaction Receipt

The receipt is available after a transaction is mined. It tells you whether it succeeded, how much gas it actually used, and what events were emitted:

<!-- tag:HttpRpcEndToEndTests:GetTransactionReceipt_HasAllFields -->

```csharp
var receipt = await web3.Eth.Transactions.GetTransactionReceipt
    .SendRequestAsync("0xtxhash...");

// receipt.Status (1 = success, 0 = revert)
// receipt.GasUsed — actual gas consumed
// receipt.EffectiveGasPrice — actual price paid per gas unit
// receipt.Logs — raw event logs (decode with typed DTOs below)
// receipt.BlockNumber, receipt.TransactionIndex
```

:::tip
`GetTransactionByHash` returns `null` if the transaction is still pending (not yet mined). `GetTransactionReceipt` also returns `null` for unconfirmed transactions. Always null-check the result.
:::

### Transaction Count (Nonce)

The nonce is the number of transactions sent from an address. You need this when manually constructing transactions:

```csharp
var nonce = await web3.Eth.Transactions.GetTransactionCount
    .SendRequestAsync("0xaddress...");
```

---

## Contract Detection

Check whether an address is an EOA (externally owned account) or a smart contract:

<!-- tag:HttpRpcEndToEndTests:GetCode_ReturnsDeployedBytecode -->

```csharp
var code = await web3.Eth.GetCode.SendRequestAsync("0xaddress...");
// Returns "0x" for EOAs, bytecode hex for contracts
var isContract = code != null && code != "0x";
```

---

## Decoding Events from Receipts

After sending a transaction that interacts with a contract, the receipt contains raw log entries. Decode them into typed C# objects using the event DTO classes from `Nethereum.Contracts.Standards`:

<!-- tag:HttpRpcEndToEndTests:EventDecoding_TransferEvent -->

```csharp
using Nethereum.Contracts;
using Nethereum.Contracts.Standards.ERC20.ContractDefinition;

var receipt = await web3.Eth.Transactions.GetTransactionReceipt
    .SendRequestAsync("0x654288d8...");

// Decode all Transfer events from the receipt logs
var events = receipt.DecodeAllEvents<TransferEventDTO>();
Console.WriteLine($"From: {events[0].Event.From}");
Console.WriteLine($"To: {events[0].Event.To}");
Console.WriteLine($"Value: {events[0].Event.Value}");
```

`DecodeAllEvents<T>()` scans all logs in the receipt and returns only those matching the event signature. If the receipt contains logs from multiple contracts (e.g., a DEX swap touching multiple tokens), each matching log is returned.

---

## ERC-20 Token Balances

Query token balances using the built-in typed contract service — no ABI needed:

```csharp
var tokenBalance = await web3.Eth.ERC20
    .GetContractService("0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2")  // MKR token
    .BalanceOfQueryAsync("0x8ee7d9235e01e6b42345120b5d270bdb763624c7");

// Convert from smallest unit to human-readable
Console.WriteLine(Web3.Convert.FromWei(tokenBalance, 18));
```

The same pattern works for `ERC721` and `ERC1155`. See the [Nethereum.Contracts](nethereum-contracts) package for the full typed contract API.

---

## Common Patterns

### Check If a Transaction Succeeded

```csharp
var receipt = await web3.Eth.Transactions.GetTransactionReceipt
    .SendRequestAsync(txHash);

if (receipt == null)
    Console.WriteLine("Transaction not yet mined");
else if (receipt.Status.Value == 1)
    Console.WriteLine("Success");
else
    Console.WriteLine("Reverted");
```

### Calculate Transaction Cost in ETH

```csharp
var costWei = receipt.GasUsed.Value * receipt.EffectiveGasPrice.Value;
var costEth = Nethereum.Util.UnitConversion.Convert.FromWei(costWei);
```

## Next Steps

- [Send ETH](guide-send-eth) — create and send transactions
- [Real-Time Streaming](guide-realtime-streaming) — subscribe to blocks and events via WebSocket
- [Fee Estimation](guide-fee-estimation) — understand gas pricing before sending
- [Unit Conversion](guide-unit-conversion) — convert between ETH, Gwei, and wei

## Package References

- [Nethereum.Web3](nethereum-web3) — main entry point for all queries
- [Nethereum.RPC](nethereum-rpc) — low-level RPC methods and DTOs
