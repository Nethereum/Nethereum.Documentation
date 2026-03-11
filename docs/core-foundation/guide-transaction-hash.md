---
title: Calculate Transaction Hash Before Sending
sidebar_label: "Transaction Hash"
sidebar_position: 8
description: Sign a transaction, calculate its hash before sending, and broadcast it later
---

# Calculate Transaction Hash Before Sending

Every signed transaction has a deterministic hash you can calculate before broadcasting. This lets you store the hash in your database for tracking before the transaction is even mined. It also enables air-gapped signing workflows, where you sign on a device with no network connection (like a hardware wallet) and broadcast from a separate machine.

```bash
dotnet add package Nethereum.Web3
```

## Sign and Calculate the Hash

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Nethereum.RPC.Eth.DTOs;
using Nethereum.Hex.HexTypes;
using Nethereum.Util;

// WARNING: Never hardcode private keys in production code.
// Use a secure key store, environment variable, or HSM.
var privateKey = "0x7580e7fb49df1c861f0050fae31c2224c6aba908e116b8da44ee8cd927b990b0";
var chainId = 444444444500;
var account = new Account(privateKey, chainId);
Console.WriteLine("Our account: " + account.Address);

// Replace with your node URL (e.g., http://localhost:8545 for a local dev chain)
var web3 = new Web3(account, "http://localhost:8545");
web3.TransactionManager.UseLegacyAsDefault = true;

var transactionInput = new TransactionInput
{
    From = account.Address,
    To = "0x83F861941E940d47C5D53B20141912f4D13DEe64",
    Value = new HexBigInteger(10000),
    Data = "0x",
    Gas = new HexBigInteger(150000),
    GasPrice = new HexBigInteger(2000000000)
};

// Sign the transaction locally (does not send it)
string txnSigned = await web3.Eth.TransactionManager.SignTransactionAsync(transactionInput);

// Calculate the hash from the signed transaction bytes
string txnHash = TransactionUtils.CalculateTransactionHash(txnSigned);
Console.WriteLine($"Predicted hash: 0x{txnHash}");
```

## Send and Verify the Hash Matches

```csharp
// Send the same transaction
string transactionHash = await web3.Eth.TransactionManager
    .SendTransactionAsync(transactionInput);
Console.WriteLine($"Actual hash: {transactionHash}");

// The hashes match because the hash is derived entirely from the signed data
Console.WriteLine($"Hashes match: {transactionHash == "0x" + txnHash}");
```

The hash is deterministic — it is derived entirely from the signed transaction data. This means you can predict the exact hash before broadcasting and use it for tracking or pre-registration with external services.

## Broadcast a Pre-Signed Transaction

If you already have a signed raw transaction (for example, signed on an air-gapped device with no network connection), broadcast it with `SendRawTransaction`:

```csharp
string txHash = await web3.Eth.Transactions.SendRawTransaction
    .SendRequestAsync("0x" + txnSigned);
```

## Next Steps

- [Transaction Recovery](guide-transaction-recovery) — recover the sender address from a signed transaction
- [Send Transactions](guide-send-transaction) — send transactions using the transaction manager
- [Transaction Replacement](guide-transaction-replacement) — replace a pending transaction
