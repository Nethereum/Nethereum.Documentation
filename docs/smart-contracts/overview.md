---
title: Smart Contracts & Code Generation
sidebar_label: Overview
sidebar_position: 1
description: Smart contract interaction, ABI, typed services, code generation, and token standards
---

# Smart Contracts & Code Generation

A smart contract is a program deployed on the blockchain. Once deployed, its code is immutable and its functions can be called by anyone. `Nethereum.Contracts` is the main package for smart contract interaction and includes typed services for all major standards.

## The Simple Path

For standard tokens and common contracts, Nethereum provides built-in typed services — no ABI, no code generation:

| Task | Simple Path |
|------|-------------|
| Get ERC-20 balance | `web3.Eth.ERC20.GetContractService(addr).BalanceOfQueryAsync(owner)` |
| Transfer ERC-20 | `web3.Eth.ERC20.GetContractService(addr).TransferRequestAndWaitForReceiptAsync(to, amount)` |
| Get NFT owner | `web3.Eth.ERC721.GetContractService(addr).OwnerOfQueryAsync(tokenId)` |
| Get ERC-1155 balance | `web3.Eth.ERC1155.GetContractService(addr).BalanceOfQueryAsync(owner, tokenId)` |
| Deploy a contract | `web3.Eth.GetContractDeploymentHandler<T>().SendRequestAndWaitForReceiptAsync(deployment)` |
| Batch queries | `web3.Eth.GetMultiQueryHandler().MultiCallAsync(call1, call2)` |
| Resolve ENS name | `web3.Eth.GetEnsService().ResolveAddressAsync("vitalik.eth")` |
| Detect interface | `web3.Eth.ERC165.GetContractService(addr).SupportsInterfaceQueryAsync(interfaceId)` |
| CREATE2 predict | `web3.Eth.Create2DeterministicDeploymentProxyService.CalculateCreate2Address(deployment, salt)` |

For custom contracts, generate typed C# classes from Solidity ABI with one command and get the same experience.

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

## Guides

| Guide | What You'll Learn |
|---|---|
| [Smart Contract Interaction](guide-smart-contract-interaction) | Define typed DTOs for functions, events, and errors — the foundation for all contract work |
| [Deploy a Contract](deploy-a-contract) | Deploy contracts with typed deployment handlers and constructor parameters |
| [ERC-20 Tokens](erc20) | Query and transfer any ERC-20 token using the built-in typed service |
| [Code Generation](code-generation) | Generate typed C# classes from Solidity ABI — CLI, VS Code, MSBuild, and Foundry workflows |
| [Events & Logs](guide-events) | Filter, query, and decode contract events and transfer logs |
| [Error Handling](guide-error-handling) | Catch and decode Solidity custom error types in C# |
| [Built-in Standards](guide-built-in-standards) | Pre-built typed services for ERC-721, ERC-1155, ENS, EIP-3009, and more |

### Advanced Patterns

| Guide | What You'll Learn |
|---|---|
| [Multicall & Batch Queries](guide-multicall) | Batch multiple reads into a single call for efficiency |
| [CREATE2 Deployment](guide-create2-deployment) | Deploy contracts to deterministic addresses across chains |
