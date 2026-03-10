---
title: Core Foundation
sidebar_label: Overview
sidebar_position: 1
description: Ethereum primitives, ABI encoding, transactions, blocks, gas, events, and the Web3 entry point
---

# Core Foundation

The foundation layer provides Ethereum primitives, ABI encoding, RPC communication, and the high-level Web3 entry point. Most users only need `Nethereum.Web3`, which pulls in all core dependencies.

## Transactions

Every state change on Ethereum happens through a transaction. Sending ETH, calling a smart contract function, deploying a contract — all transactions.

### Transaction Lifecycle

1. **Build** — set the recipient, value, data, gas limit, and gas price
2. **Sign** — the sender's private key signs the transaction (proves ownership)
3. **Send** — the signed transaction is submitted to a node via JSON-RPC
4. **Mine** — a validator includes the transaction in a block
5. **Receipt** — the network returns a receipt with status, gas used, and logs

### Transaction Types

| Type | EIP | Description |
|---|---|---|
| Legacy (Type 0) | Pre-EIP-2718 | Original format with `gasPrice` |
| Access List (Type 1) | EIP-2930 | Adds access list for gas discounts on storage |
| EIP-1559 (Type 2) | EIP-1559 | `maxFeePerGas` + `maxPriorityFeePerGas` (current default) |
| Blob (Type 3) | EIP-4844 | Carries blob data for L2 rollups |
| Set Code (Type 7) | EIP-7702 | Delegates EOA to smart contract code |

Nethereum automatically uses EIP-1559 (Type 2) transactions when the network supports it.

### Sending Transactions

```csharp
// Simple ETH transfer
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync("0xRecipient", 1.5m);

// Contract function call
var transferHandler = web3.Eth.GetContractTransactionHandler<TransferFunction>();
var receipt = await transferHandler.SendRequestAndWaitForReceiptAsync(
    contractAddress,
    new TransferFunction { To = recipient, Value = amount });
```

## Blocks and the Chain

Ethereum organizes transactions into **blocks** — ordered bundles of transactions that are proposed, validated, and finalized by the network's consensus mechanism.

```csharp
var block = await web3.Eth.Blocks.GetBlockWithTransactionsByNumber
    .SendRequestAsync(new HexBigInteger(18_000_000));

foreach (var tx in block.Transactions)
{
    Console.WriteLine($"{tx.TransactionHash} | From: {tx.From} | To: {tx.To}");
}
```

### Block Parameters

Many RPC calls accept a **block parameter** that specifies which state to query:

| Parameter | Meaning |
|---|---|
| `latest` | Most recent block the node has processed |
| `earliest` | Genesis block (block 0) |
| `pending` | Pending state (transactions in the mempool) |
| `finalized` | Latest block that has achieved finality |
| `safe` | Latest block safe from reorganization |

## Gas & Fees

Every computation on Ethereum costs **gas**. Since the London upgrade, Ethereum uses a two-component fee model (EIP-1559):

| Component | Description |
|---|---|
| **Base Fee** | Set by the protocol based on congestion. Burned. |
| **Priority Fee (Tip)** | Goes to the validator. Incentivizes faster inclusion. |
| **Max Fee** | The absolute maximum you're willing to pay per gas unit. |

Nethereum estimates gas automatically when you don't specify it:

```csharp
var gas = await transferHandler.EstimateGasAsync(contractAddress, transferFunction);
```

## Events & Logs

Events are the primary way smart contracts communicate what happened during a transaction. Indexed parameters become searchable **topics**; non-indexed parameters go into **data**.

```csharp
var transferEvent = web3.Eth.GetEvent<TransferEventDTO>(contractAddress);
var filter = transferEvent.CreateFilterInput(
    BlockParameter.CreateEarliest(),
    BlockParameter.CreateLatest());

var events = await transferEvent.GetAllChangesAsync(filter);
```

For indexing large volumes of events, use `Nethereum.BlockchainProcessing`. See [Data & Indexing](../data-and-indexing/overview).

## ABI Encoding

The Application Binary Interface (ABI) is Ethereum's standard for encoding data when interacting with smart contracts. The easiest way to work with ABI encoding is through code-generated typed classes:

```csharp
var transferFunction = new TransferFunction
{
    To = "0xRecipientAddress",
    Value = 1000
};

var transferHandler = web3.Eth.GetContractTransactionHandler<TransferFunction>();
var receipt = await transferHandler.SendRequestAndWaitForReceiptAsync(contractAddress, transferFunction);
```

For manual encoding, use `ABIEncode`:

```csharp
var abiEncode = new ABIEncode();
byte[] encoded = abiEncode.GetABIEncoded(
    new ABIValue("address", "0x1234..."),
    new ABIValue("uint256", 1000)
);
```

## Core Packages

| Package | Description |
|---|---|
| `Nethereum.Web3` | High-level entry point aggregating RPC, contracts, accounts, and signing |
| `Nethereum.ABI` | ABI encoding/decoding for functions, events, errors, and complex types |
| `Nethereum.Contracts` | Smart contract interaction, typed services (ERC-20/721/1155/ENS) |
| `Nethereum.Accounts` | Account types, transaction managers, nonce management |
| `Nethereum.Model` | Block headers, transaction types, RLP encoding |
| `Nethereum.RPC` | Typed wrappers for all standard RPC methods |
