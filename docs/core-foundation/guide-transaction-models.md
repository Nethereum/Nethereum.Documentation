---
title: Understand Transaction Types
sidebar_label: "Transaction Types"
sidebar_position: 7
description: Legacy, EIP-1559, EIP-2930, EIP-7702 transaction models and recovery
---

# Understand Transaction Types

Ethereum has evolved through several transaction formats. Most of the time, Nethereum picks the right type automatically — you only need this guide when constructing raw transactions, decoding on-chain data, or working with newer features like EIP-7702 delegation.

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

## Legacy Transaction (Type 0)

The original format. Still used on some L2s and when interacting with older contracts that expect a single `gasPrice` field.

<!-- tag:ModelDocExampleTests:LegacyTransaction_CreateWithProperties -->

```csharp
var tx = new LegacyTransaction(to, amount, nonce, gasPrice, gasLimit);

Console.WriteLine($"Transaction type: {tx.TransactionType}");
// Output: Transaction type: LegacyTransaction
```

Legacy transactions do not include a chain ID in the body — replay protection relies on the signature's `v` value (EIP-155).

## EIP-1559 Transaction (Type 2)

The current default. Separates base fee from priority tip for more predictable pricing. You set `maxFeePerGas` (the ceiling you're willing to pay) and `maxPriorityFeePerGas` (the tip to validators). The actual fee depends on the block's base fee — see [Fee Estimation](guide-fee-estimation) for how to choose good values.

<!-- tag:ModelDocExampleTests:Transaction1559_CreateAndEncode -->

```csharp
var tx = new Transaction1559(chainId, nonce, maxPriorityFeePerGas, maxFeePerGas,
    gasLimit, receiverAddress, amount, data, accessList: null);

Console.WriteLine($"Transaction type: {tx.TransactionType}");
// Output: Transaction type: EIP1559
```

## EIP-2930 Access List Transaction (Type 1)

Reduces gas by pre-declaring which storage slots you'll touch. This is useful for cross-contract calls where the EVM would otherwise charge cold-access penalties for each storage read.

<!-- tag:ModelDocExampleTests:Transaction2930_CreateWithAccessList -->

```csharp
// Declare which contract addresses and storage slots will be accessed
var storageKey = new byte[32];
storageKey[31] = 0x01;
var accessList = new List<AccessListItem>
{
    new AccessListItem(contractAddress, new List<byte[]> { storageKey })
};

var tx = new Transaction2930(chainId, nonce, gasPrice, gasLimit,
    receiverAddress, amount, data: null, accessList);

Console.WriteLine($"Transaction type: {tx.TransactionType}");
Console.WriteLine($"Access list entries: {tx.AccessList.Count}");
// Output: Transaction type: LegacyEIP2930
// Output: Access list entries: 1
```

EIP-2930 uses `gasPrice` (like legacy) but adds an access list and requires a `chainId`.

## EIP-7702 Authorization Transaction (Type 4)

Lets an EOA temporarily delegate to a smart contract — enables account abstraction features without deploying a new contract wallet. The EOA signs an authorization tuple specifying which contract to delegate to.

<!-- tag:ModelDocExampleTests:Transaction7702_CreateWithAuthorisation -->

```csharp
// Create and sign the authorization
var authorisation = new Authorisation7702(chainId, contractAddress, nonce);

var authSigner = new Authorisation7702Signer();
var signedAuth = authSigner.SignAuthorisation(ecKey, authorisation);

// Build the transaction with the signed authorization
var tx = new Transaction7702(
    chainId, nonce, maxPriorityFeePerGas, maxFeePerGas,
    gasLimit, receiverAddress, amount, data: null,
    new List<AccessListItem>(), new List<Authorisation7702Signed> { signedAuth });

Console.WriteLine($"Transaction type: {tx.TransactionType}");
Console.WriteLine($"Authorization list entries: {tx.AuthorisationList.Count}");
// Output: Transaction type: EIP7702
// Output: Authorization list entries: 1
```

EIP-7702 uses the same fee model as EIP-1559 (`maxFeePerGas` + `maxPriorityFeePerGas`) and adds an authorization list.

## Transaction Recovery

You can recover the sender address from any signed transaction or verify that a signature is valid. Both methods accept a signed RLP hex string and work with all transaction types.

RLP (Recursive Length Prefix) is Ethereum's binary encoding format — see [RLP Encoding](guide-rlp-encoding) for details.

<!-- tag:SignerDocExampleTests:ShouldRecoverSenderFromSignedLegacy -->

```csharp
// Recover sender from a signed transaction's RLP encoding
var senderAddress = TransactionVerificationAndRecovery.GetSenderAddress(signedRlpHex);
Console.WriteLine($"Sender: {senderAddress}");
```

<!-- tag:SignerDocExampleTests:ShouldVerifySignedTransaction -->

```csharp
// Verify the signature is valid
var isValid = TransactionVerificationAndRecovery.VerifyTransaction(signedRlpHex);
Console.WriteLine($"Signature valid: {isValid}");
```

## Decoding Transactions with TransactionFactory

When you receive raw transaction bytes (from a node, mempool, or external source), use `TransactionFactory` to auto-detect the type and decode it. The factory reads the type prefix byte: `0x01` = EIP-2930, `0x02` = EIP-1559, `0x05` = EIP-7702, no prefix = Legacy.

<!-- tag:ModelDocExampleTests:TransactionFactory_Detects1559And2930 -->

```csharp
var decoded = TransactionFactory.CreateTransaction(signedRlpHex);
Console.WriteLine($"Detected type: {decoded.TransactionType}");
```

You can also decode a legacy transaction directly from RLP bytes:

```csharp
var tx = new LegacyTransaction(rlpBytes);
Console.WriteLine($"Has signature: {tx.Signature != null}");
```

## Next Steps

- [Calculate Transaction Hash](guide-transaction-hash) -- sign and predict the hash before sending
- [Fee Estimation](guide-fee-estimation) -- estimate gas and choose fee parameters
- [RLP Encoding](guide-rlp-encoding) -- understand Ethereum's binary format
- [Send Ether](guide-send-eth) -- send transactions using Web3

## Further Reading

- [Nethereum.Model Package](nethereum-model)
