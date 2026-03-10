---
title: Deploy a Contract
sidebar_label: Deploy a Contract
sidebar_position: 3
description: Deploy smart contracts to Ethereum using Nethereum's typed deployment handlers
---

# Deploy a Contract

Nethereum provides typed deployment handlers that make deploying smart contracts straightforward and type-safe.

## Prerequisites

```bash
dotnet add package Nethereum.Web3
```

## Using a Code-Generated Deployment Class

The recommended approach is to use Nethereum's code generator to create typed deployment classes from your Solidity ABI and bytecode:

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using System.Numerics;

var account = new Account("0xYOUR_PRIVATE_KEY");
var web3 = new Web3(account, "https://your-rpc-url");

var deploymentMessage = new StandardTokenDeployment
{
    TotalSupply = Web3.Convert.ToWei(1000000),
    GasPrice = Web3.Convert.ToWei(25, Nethereum.Util.UnitConversion.EthUnit.Gwei)
};

var deploymentHandler = web3.Eth.GetContractDeploymentHandler<StandardTokenDeployment>();
var transactionReceipt = await deploymentHandler.SendRequestAndWaitForReceiptAsync(deploymentMessage);

string contractAddress = transactionReceipt.ContractAddress;
Console.WriteLine($"Contract deployed at: {contractAddress}");
```

## Estimating Deployment Gas

```csharp
var estimatedGas = await deploymentHandler.EstimateGasAsync(deploymentMessage);
Console.WriteLine($"Estimated gas: {estimatedGas.Value}");
deploymentMessage.Gas = estimatedGas;
```

## Deploy Without Code-Generated Classes

```csharp
var receipt = await web3.Eth.DeployContract.SendRequestAndWaitForReceiptAsync(
    abi, bytecode, account.Address,
    new Nethereum.Hex.HexTypes.HexBigInteger(3000000),
    null, null, Web3.Convert.ToWei(1000000));
```

## Deploying with Multiple Constructor Parameters

```csharp
var deployment = new MyNFTDeployment
{
    Name = "My NFT Collection",
    Symbol = "MNFT",
    MaxSupply = 10000
};

var handler = web3.Eth.GetContractDeploymentHandler<MyNFTDeployment>();
var receipt = await handler.SendRequestAndWaitForReceiptAsync(deployment);
```

## Checking Deployment Status

```csharp
if (receipt.Status.Value == 1)
{
    Console.WriteLine($"Deployment succeeded at block {receipt.BlockNumber.Value}");
    Console.WriteLine($"Gas used: {receipt.GasUsed.Value}");
    Console.WriteLine($"Contract address: {receipt.ContractAddress}");
}
```
