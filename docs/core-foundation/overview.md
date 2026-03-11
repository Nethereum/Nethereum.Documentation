---
title: Core Foundation
sidebar_label: Overview
sidebar_position: 1
description: Ethereum primitives, ABI encoding, transactions, blocks, gas, events, and the Web3 entry point
---

# Core Foundation

The foundation layer provides Ethereum primitives, ABI encoding, RPC communication, and the high-level Web3 entry point. Most users only need `Nethereum.Web3`, which pulls in all core dependencies.

## The Simple Path: `web3.Eth`

`web3.Eth` is designed as a complete entry point for every common Ethereum task. Gas estimation, nonce management, EIP-1559 fee calculation, and transaction signing are all **automatic** — you never need to manage these unless you choose to.

```csharp
var web3 = new Web3(account, "https://mainnet.infura.io/v3/YOUR-PROJECT-ID");

// Send ETH — fees, gas, nonce all handled automatically
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync("0xRecipient", 1.5m);

// Query any balance — read-only, no gas or signing needed
var balance = await web3.Eth.GetBalance.SendRequestAsync("0xAddress");
var ethBalance = Web3.Convert.FromWei(balance.Value);
```

Here's what `web3.Eth` gives you out of the box:

| Task | Simple Path |
|------|-------------|
| Get ETH balance | `web3.Eth.GetBalance.SendRequestAsync(address)` |
| Get ERC-20 balance | `web3.Eth.ERC20.GetContractService(addr).BalanceOfQueryAsync(owner)` |
| Get ERC-721 balance | `web3.Eth.ERC721.GetContractService(addr).BalanceOfQueryAsync(owner)` |
| Send ETH | `web3.Eth.GetEtherTransferService().TransferEtherAndWaitForReceiptAsync(to, amount)` |
| Send transaction with data | `web3.Eth.TransactionManager.SendTransactionAndWaitForReceiptAsync(input)` |
| Get block | `web3.Eth.Blocks.GetBlockWithTransactionsByNumber.SendRequestAsync(num)` |
| Get transaction | `web3.Eth.Transactions.GetTransactionByHash.SendRequestAsync(hash)` |
| Get receipt | `web3.Eth.Transactions.GetTransactionReceipt.SendRequestAsync(hash)` |
| Convert units | `Web3.Convert.FromWei(value)` / `Web3.Convert.ToWei(value)` |
| Resolve ENS | `web3.Eth.GetEnsService().ResolveAddressAsync("vitalik.eth")` |
| Multicall batch | `web3.Eth.GetMultiQueryHandler()` |
| Delegate EOA (EIP-7702) | `web3.Eth.GetEIP7022AuthorisationService().AuthoriseRequestAndWaitForReceiptAsync(contract)` |
| Check if smart account | `web3.Eth.GetEIP7022AuthorisationService().IsDelegatedAccountAsync(address)` |
| Get delegate contract | `web3.Eth.GetEIP7022AuthorisationService().GetDelegatedAccountAddressAsync(address)` |
| Revoke delegation | `web3.Eth.GetEIP7022AuthorisationService().RemoveAuthorisationRequestAndWaitForReceiptAsync()` |

For token standards, Nethereum includes built-in typed services — no ABI needed:
- **`web3.Eth.ERC20`** — balances, transfers, allowances, metadata
- **`web3.Eth.ERC721`** — NFT ownership, metadata, enumeration
- **`web3.Eth.ERC1155`** — multi-token balances and batch operations

For smart account features, EIP-7702 lets any EOA delegate to a contract — batch calls, spending limits, gas sponsorship — all through `web3.Eth.GetEIP7022AuthorisationService()`. Delegate, check if an address has a smart account, get the delegate contract, or revoke — gas overhead is calculated automatically. For sponsored delegation (another account pays gas), use `EIP7022SponsorAuthorisationService`. See the [EIP-7702 guide](guide-eip7702) for details.

Every row in the table above works with zero fee configuration. When you need more control — explicit fees, legacy transactions, custom gas — every guide shows you how. But the simple path is always enough for common tasks.

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

## Guides

Step-by-step guides covering everything from reading balances to advanced transaction handling.

### Essentials

| Guide | What You'll Learn |
|---|---|
| [Query Balance](guide-query-balance) | Read ETH, ERC-20, and ERC-721 balances |
| [Unit Conversion](guide-unit-conversion) | Convert between Wei, Ether, Gwei, and custom decimals |
| [Fee Estimation](guide-fee-estimation) | Understand automatic fees and customize when needed |
| [Transfer Ether](guide-send-eth) | Send ETH with EtherTransferService |
| [Send Transactions](guide-send-transaction) | Send transactions with data using the transaction manager |
| [Query Blocks](guide-query-blocks) | Get blocks, transactions, receipts, and nonces |

### Transaction Deep Dives

| Guide | What You'll Learn |
|---|---|
| [Transaction Types](guide-transaction-models) | Legacy, EIP-1559, Blob, and EIP-7702 transaction models |
| [EIP-7702 Delegation](guide-eip7702) | Delegate EOA to smart contract code — self, sponsored, and batch delegation |
| [Transaction Hash](guide-transaction-hash) | Sign and predict the hash before sending |
| [Transaction Recovery](guide-transaction-recovery) | Recover the sender from a signed transaction |
| [Transaction Replacement](guide-transaction-replacement) | Replace a pending transaction with higher fees |
| [Pending Transactions](guide-pending-transactions) | Retrieve pending transactions from the mempool |
| [Decode Transactions](guide-decode-transactions) | Decode function calls from transaction input data |

### Encoding & Utilities

| Guide | What You'll Learn |
|---|---|
| [ABI Encoding](guide-abi-encoding) | Encode and decode smart contract data |
| [Hex Encoding](guide-hex-encoding) | Work with hex data |
| [Address Utilities](guide-address-utils) | Validate and format addresses |
| [RLP Encoding](guide-rlp-encoding) | Low-level RLP encoding and decoding |

### Transport & Streaming

| Guide | What You'll Learn |
|---|---|
| [RPC Transport](guide-rpc-transport) | Choose the right connection method |
| [Real-Time Streaming](guide-realtime-streaming) | Subscribe to blockchain events via WebSocket |

## Core Packages

| Package | Description |
|---|---|
| `Nethereum.Web3` | High-level entry point aggregating RPC, contracts, accounts, and signing |
| `Nethereum.ABI` | ABI encoding/decoding for functions, events, errors, and complex types |
| `Nethereum.Contracts` | Smart contract interaction, typed services (ERC-20/721/1155/ENS) |
| `Nethereum.Accounts` | Account types, transaction managers, nonce management |
| `Nethereum.Model` | Block headers, transaction types, RLP encoding |
| `Nethereum.RPC` | Typed wrappers for all standard RPC methods |
