---
title: Smart Contracts & Code Generation
sidebar_label: Overview
sidebar_position: 1
description: Smart contract interaction, ABI, typed services, code generation, and token standards
---

# Smart Contracts & Code Generation

A smart contract is a program deployed on the blockchain. Once deployed, its code is immutable and its functions can be called by anyone. `Nethereum.Contracts` is the main package for smart contract interaction and includes typed services for all major standards.

## Two Ways to Interact

### 1. Code-Generated Typed Services (Recommended)

Generate C# classes from the ABI:

```bash
dotnet tool install -g Nethereum.Generator.Console
Nethereum.Generator.Console generate from-abi -abi MyContract.abi -o Generated
```

```csharp
var service = new MyContractService(web3, contractAddress);
var balance = await service.BalanceOfQueryAsync(userAddress);
var receipt = await service.TransferRequestAndWaitForReceiptAsync(
    new TransferFunction { To = recipient, Value = amount });
```

### 2. Dynamic Interaction (No Code Generation)

```csharp
var contract = web3.Eth.GetContract(abi, contractAddress);
var function = contract.GetFunction("balanceOf");
var balance = await function.CallAsync<BigInteger>(userAddress);
```

Or use built-in typed services for standard contracts:

```csharp
var erc20 = web3.Eth.ERC20.GetContractService(contractAddress);
var name = await erc20.NameQueryAsync();
var balance = await erc20.BalanceOfQueryAsync(userAddress);
```

## Token Standards

### ERC-20 (Fungible Tokens)

```csharp
var erc20 = web3.Eth.ERC20.GetContractService(contractAddress);
var name = await erc20.NameQueryAsync();
var symbol = await erc20.SymbolQueryAsync();
var decimals = await erc20.DecimalsQueryAsync();
var balance = await erc20.BalanceOfQueryAsync(myAddress);
```

### ERC-721 (Non-Fungible Tokens)

```csharp
var erc721 = web3.Eth.ERC721.GetContractService(contractAddress);
var owner = await erc721.OwnerOfQueryAsync(tokenId);
var tokenUri = await erc721.TokenURIQueryAsync(tokenId);
```

### ERC-1155 (Multi-Token)

```csharp
var erc1155 = web3.Eth.ERC1155.GetContractService(contractAddress);
var balance = await erc1155.BalanceOfQueryAsync(myAddress, tokenId);
```

## Query vs Transaction

| Operation | Gas Cost | State Change | Returns |
|---|---|---|---|
| **Query** (`call`) | Free | No | Function return value |
| **Transaction** (`sendTransaction`) | Yes | Yes | Transaction receipt |

Functions marked `view` or `pure` in Solidity are queries. Everything else is a transaction.
