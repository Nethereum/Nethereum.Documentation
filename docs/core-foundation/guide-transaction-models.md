---
title: Understand Transaction Types
sidebar_label: "Transaction Types"
sidebar_position: 10
description: Legacy, EIP-1559, EIP-2930, EIP-7702 transaction models and recovery
---

# Understand Transaction Types

Understand Ethereum's transaction types — from legacy to EIP-7702 — and how to create, encode, decode, and recover sender addresses.

## Installation

```bash
dotnet add package Nethereum.Model
dotnet add package Nethereum.Signer
```

## Transaction Type Overview

| Type   | Prefix | Name        | Description                          |
|--------|--------|-------------|--------------------------------------|
| Type 0 | none   | Legacy      | Original format with `gasPrice`      |
| Type 1 | 0x01   | AccessList  | EIP-2930: pre-declared storage keys  |
| Type 2 | 0x02   | EIP-1559    | Priority fee + max fee per gas       |
| Type 3 | 0x03   | Blob        | EIP-4844: blob-carrying transactions |
| Type 4 | 0x05   | SetCode     | EIP-7702: delegate code for EOAs     |

## Legacy Transaction

> **Source:** [`ModelDocExampleTests.LegacyTransaction_CreateWithProperties`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Signer.UnitTests/ModelDocExampleTests.cs)

```csharp
var tx = new LegacyTransaction(to, amount, nonce, gasPrice, gasLimit);
Assert.Equal(TransactionType.LegacyTransaction, tx.TransactionType);
```

## EIP-1559 Transaction

> **Source:** [`ModelDocExampleTests.Transaction1559_CreateAndEncode`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Signer.UnitTests/ModelDocExampleTests.cs)

```csharp
var tx = new Transaction1559(chainId, nonce, maxPriorityFeePerGas, maxFeePerGas,
    gasLimit, receiverAddress, amount, data, null);
Assert.Equal(TransactionType.EIP1559, tx.TransactionType);
```

## EIP-2930 Access List Transaction

Pre-declare which contract addresses and storage slots your transaction will access, reducing gas costs for cross-contract calls.

> **Source:** [`ModelDocExampleTests.Transaction2930_CreateWithAccessList`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Signer.UnitTests/ModelDocExampleTests.cs)

```csharp
var storageKey = new byte[32];
storageKey[31] = 0x01;
var accessList = new List<AccessListItem>
{
    new AccessListItem(contractAddress, new List<byte[]> { storageKey })
};

var tx = new Transaction2930(chainId, nonce, gasPrice, gasLimit,
    receiverAddress, amount, null, accessList);

Assert.Equal(TransactionType.LegacyEIP2930, tx.TransactionType);
Assert.Single(tx.AccessList);
```

EIP-2930 uses `gasPrice` (like legacy) but adds an access list and requires a `chainId`.

## EIP-7702 Authorization Transaction

EIP-7702 allows EOAs (externally owned accounts) to temporarily delegate their code execution to a contract. The EOA signs an authorization tuple that specifies the contract address to delegate to.

> **Source:** [`ModelDocExampleTests.Transaction7702_CreateWithAuthorisation`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Signer.UnitTests/ModelDocExampleTests.cs)

```csharp
var authorisation = new Authorisation7702(chainId, contractAddress, nonce);

var authSigner = new Authorisation7702Signer();
var signedAuth = authSigner.SignAuthorisation(ecKey, authorisation);

var tx = new Transaction7702(
    chainId, nonce, maxPriorityFeePerGas, maxFeePerGas,
    gasLimit, receiverAddress, amount, null,
    new List<AccessListItem>(), new List<Authorisation7702Signed> { signedAuth });

Assert.Equal(TransactionType.EIP7702, tx.TransactionType);
Assert.Single(tx.AuthorisationList);
```

EIP-7702 uses the same fee model as EIP-1559 (`maxFeePerGas` + `maxPriorityFeePerGas`) and adds an authorization list.

## Transaction Recovery

Recover the sender address from any signed transaction, or verify that a transaction signature is valid.

> **Source:** [`SignerDocExampleTests.ShouldRecoverSenderFromSignedLegacy`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Signer.UnitTests/SignerDocExampleTests.cs)

```csharp
// Recover sender from signed RLP hex
var senderAddress = TransactionVerificationAndRecovery.GetSenderAddress(signedRlpHex);
```

> **Source:** [`SignerDocExampleTests.ShouldVerifySignedTransaction`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Signer.UnitTests/SignerDocExampleTests.cs)

```csharp
// Verify signature is valid
var isValid = TransactionVerificationAndRecovery.VerifyTransaction(signedRlpHex);
Assert.True(isValid);
```

Both methods accept the signed RLP hex string and work with all transaction types (legacy, EIP-1559, EIP-2930, EIP-7702).

## Decode from RLP

```csharp
var rlpHex = "f86b80...";
var tx = new LegacyTransaction(rlpHex.HexToByteArray());
Assert.NotNull(tx.Signature);
```

## TransactionFactory

Auto-detect the transaction type from encoded bytes:

> **Source:** [`ModelDocExampleTests.TransactionFactory_Detects1559And2930`](https://github.com/nicknethgit/Nethereum/blob/master/tests/Nethereum.Signer.UnitTests/ModelDocExampleTests.cs)

```csharp
var decoded = TransactionFactory.CreateTransaction(signedRlpHex);
// decoded.TransactionType tells you Legacy, EIP1559, EIP2930, etc.
```

The factory reads the type prefix byte: `0x01` = EIP-2930, `0x02` = EIP-1559, `0x05` = EIP-7702, no prefix = Legacy.

## Chain IDs

```csharp
Assert.Equal(1, (int)Chain.MainNet);
Assert.Equal(11155111, (int)Chain.Sepolia);
Assert.Equal(137, (int)Chain.Polygon);
Assert.Equal(8453, (int)Chain.Base);
```

## Access List Items

Access lists pre-declare which storage slots a transaction will access, reducing gas costs for cross-contract calls.

```csharp
var accessList = new List<AccessListItem>
{
    new AccessListItem(contractAddress, new List<byte[]> { storageKey })
};
```

## Block Headers

```csharp
var blockHeader = new BlockHeader
{
    BlockNumber = 1000,
    GasLimit = 8000000,
    GasUsed = 21000,
    BaseFee = 1000000000,
    Coinbase = "0x0000000000000000000000000000000000000000"
};
```

## Next Steps

- [Send Ether](guide-send-eth) — send transactions using Web3
- [Fee Estimation](guide-fee-estimation) — estimate gas and fees
- [Transaction Signing](../signing-and-key-management/nethereum-signer) — sign transactions with different key types

## Further Reading

- [Nethereum.Model Package](nethereum-model)
