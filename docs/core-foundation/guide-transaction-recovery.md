---
title: Transaction Signing and Recovery
sidebar_label: "Transaction Recovery"
sidebar_position: 9
description: Recover the sender address from a signed Ethereum transaction using ECDSA signature recovery
---

# Transaction Signing and Recovery

Given a transaction from the blockchain, you can recover the sender's address from its cryptographic signature -- even without knowing the private key. This is how block explorers show the "From" address.

Ethereum uses ECDSA signatures (elliptic curve cryptography). The signature contains enough information to mathematically derive the public key, and from that, the address.

```bash
dotnet add package Nethereum.Web3
```

## Recover the Sender from a Transaction Hash

The simplest case: you have a transaction hash and want to know who sent it.

```csharp
using Nethereum.Web3;
using Nethereum.Signer;

var web3 = new Web3("http://localhost:8545");

var tx = await web3.Eth.Transactions.GetTransactionByHash
    .SendRequestAsync("0xYOUR_TRANSACTION_HASH");

var sender = TransactionVerificationAndRecovery
    .GetSenderAddress(tx);

Console.WriteLine("Sender: " + sender);
```

`TransactionVerificationAndRecovery.GetSenderAddress` handles all transaction types (Legacy, EIP-1559, EIP-2930) and chain ID extraction automatically.

## Understanding V, R, S

Every Ethereum transaction includes three signature components:

- **R** and **S** are the two values produced by the ECDSA signing algorithm.
- **V** is the recovery ID -- it indicates which of two mathematically possible public keys is the correct one. For legacy transactions, V also encodes the chain ID (per EIP-155).

These are visible on any transaction object returned by an RPC node:

```csharp
Console.WriteLine("V: " + tx.V.Value);
Console.WriteLine("R: " + tx.R);
Console.WriteLine("S: " + tx.S);
```

## Full Round-Trip: Sign, Send, and Recover

This example signs a transaction locally, sends it, retrieves it back from the chain, and recovers the sender to verify the round-trip.

:::caution
The private key below is for local testing only. Never hardcode private keys in production code. See [Keys and Accounts](../signing-and-key-management/guide-keys-accounts) for secure key management patterns.
:::

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Nethereum.Hex.HexConvertors.Extensions;
using Nethereum.RPC.TransactionManagers;
using Nethereum.Signer;

var privateKey = "0xb5b1870957d373ef0eeffecc6e4812c0fd08f554b37b233526acc331bf1544f7";
var account = new Account(privateKey, 1);
var web3 = new Web3(account, "http://localhost:8545");

var toAddress = "0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe";

var txnInput = EtherTransferTransactionInputBuilder
    .CreateTransactionInput(account.Address, toAddress, 1.11m, 2);
var signedRaw = await web3.Eth.TransactionManager
    .SignTransactionAsync(txnInput);
var txnHash = await web3.Eth.Transactions.SendRawTransaction
    .SendRequestAsync(signedRaw);

var txFromChain = await web3.Eth.Transactions.GetTransactionByHash
    .SendRequestAsync(txnHash);

var recoveredSender = TransactionVerificationAndRecovery
    .GetSenderAddress(txFromChain);

Console.WriteLine("Original sender:  " + account.Address);
Console.WriteLine("Recovered sender: " + recoveredSender);
```

## Rebuilding the Raw Transaction

If you need to reconstruct the RLP-encoded signed transaction from on-chain data (for example, to re-broadcast or verify the raw bytes):

```csharp
var transaction = TransactionFactory.CreateLegacyTransaction(
    txFromChain.To, txFromChain.Gas, txFromChain.GasPrice,
    txFromChain.Value, txFromChain.Input, txFromChain.Nonce,
    txFromChain.R, txFromChain.S, txFromChain.V);

var rawRecovered = transaction.GetRLPEncoded().ToHex();
Console.WriteLine("Recovered raw: " + rawRecovered);
```

## Next Steps

- [Keys and Accounts](../signing-and-key-management/guide-keys-accounts) -- how Ethereum addresses derive from public keys
- [Transaction Models](guide-transaction-models) -- Legacy, EIP-1559, and EIP-2930 transaction types
- [Transaction Replacement](guide-transaction-replacement) -- replace a pending transaction with higher fees
- [Calculate Transaction Hash](guide-transaction-hash) -- predict the hash before sending
- [Decode Transactions](guide-decode-transactions) -- decode function calls from transaction input data
