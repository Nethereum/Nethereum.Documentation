---
title: Deploy a Contract
sidebar_label: Deploy a Contract
sidebar_position: 3
description: Deploy smart contracts to Ethereum using Nethereum's typed deployment handlers
---

# Deploy a Contract

:::tip The Simple Way
```csharp
var handler = web3.Eth.GetContractDeploymentHandler<StandardTokenDeployment>();
var receipt = await handler.SendRequestAndWaitForReceiptAsync(
    new StandardTokenDeployment { TotalSupply = Web3.Convert.ToWei(1000000) });
Console.WriteLine($"Deployed at: {receipt.ContractAddress}");
```
Define a deployment message, send it — gas estimation and signing are automatic.
:::

After defining your contract's typed DTOs (as covered in [Contract Interaction](./guide-smart-contract-interaction)), the next step is deploying. Nethereum's typed deployment handlers give you gas estimation, receipt tracking, and constructor parameter encoding out of the box.

## Prerequisites

```bash
dotnet add package Nethereum.Web3
```

You need a funded account to deploy — deployment is a transaction that costs gas.

## Using a Code-Generated Deployment Class

The recommended approach is to use Nethereum's [code generator](./code-generation.md) to create typed deployment classes from your Solidity ABI and bytecode. The generated class inherits from `ContractDeploymentMessage` and contains the bytecode and constructor parameters as properties.

Once you have the deployment class, create a `Web3` instance with your account, populate the constructor parameters, and send:

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

The handler encodes your constructor parameters into the deployment bytecode, estimates gas (unless you set it explicitly), manages the nonce, and waits for the transaction to be mined. The `ContractAddress` on the receipt is the address of your new contract.

## Estimating Deployment Gas

If you want to check the gas cost before committing to the deployment, call `EstimateGasAsync` first. This simulates the deployment against the current chain state without actually sending a transaction:

```csharp
var estimatedGas = await deploymentHandler.EstimateGasAsync(deploymentMessage);
Console.WriteLine($"Estimated gas: {estimatedGas.Value}");
deploymentMessage.Gas = estimatedGas;
```

Note that `SendRequestAndWaitForReceiptAsync` estimates gas automatically if you don't set `Gas` on the message — so this step is only needed when you want to display the cost to a user or set a specific gas limit.

## Deploy Without Code-Generated Classes

When prototyping or working with a raw ABI string, you can deploy without a typed class. Pass the ABI, bytecode, sender address, gas limit, and constructor arguments directly:

```csharp
var receipt = await web3.Eth.DeployContract.SendRequestAndWaitForReceiptAsync(
    abi, bytecode, account.Address,
    new Nethereum.Hex.HexTypes.HexBigInteger(3000000),
    null, null, Web3.Convert.ToWei(1000000));
```

This approach is less safe — constructor argument types aren't checked at compile time, so a mismatch will fail at runtime. Use the typed approach for production code.

## Deploying with Multiple Constructor Parameters

Contracts often take multiple constructor arguments. Each parameter maps to a property on the deployment message class:

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

The `[Parameter]` attributes on the deployment class (defined in [Contract Interaction](./guide-smart-contract-interaction)) control how each property maps to the Solidity constructor signature.

## Checking Deployment Status

The receipt's `Status` field tells you whether the deployment succeeded. A status of `1` means success; `0` means the transaction was mined but the contract creation reverted (often due to a `require` failing in the constructor):

```csharp
if (receipt.Status.Value == 1)
{
    Console.WriteLine($"Deployment succeeded at block {receipt.BlockNumber.Value}");
    Console.WriteLine($"Gas used: {receipt.GasUsed.Value}");
    Console.WriteLine($"Contract address: {receipt.ContractAddress}");
}
```

## Next Steps

- [ERC-20 Tokens](./erc20.md) -- interact with deployed ERC-20 tokens using the built-in typed service
- [Events & Logs](./guide-events.md) -- listen for events emitted during deployment and contract calls
- [Code Generation](./code-generation.md) -- generate typed deployment classes from ABI and bytecode
