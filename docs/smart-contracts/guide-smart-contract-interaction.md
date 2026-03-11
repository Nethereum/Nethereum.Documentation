---
title: Smart Contract Interaction
sidebar_label: "Contract Interaction"
sidebar_position: 2
description: Define typed DTOs, deploy, query, transact, decode events, read historical state, estimate gas, and sign offline with Nethereum
---

# Smart Contract Interaction

:::tip The Simple Way
```csharp
var service = new StandardTokenService(web3, contractAddress);
var balance = await service.BalanceOfQueryAsync(ownerAddress);
var receipt = await service.TransferRequestAndWaitForReceiptAsync(
    new TransferFunction { To = recipient, Value = amount });
```
Define typed DTOs, then query and transact — gas, nonce, and fees are all automatic.
:::

Nethereum uses typed C# classes to represent every part of a smart contract: deployment bytecode, function calls, events, and return values. This page covers the full interaction lifecycle using a standard ERC20 token as the example.

```bash
dotnet add package Nethereum.Web3
```

## Define Contract DTOs

Every smart contract interaction starts with defining C# classes that map to the Solidity contract's constructor, functions, events, and return types. These can be hand-written or [code-generated](./code-generation.md).

### Deployment Message

A class inheriting from `ContractDeploymentMessage` represents the contract constructor. Include the compiled bytecode and any constructor parameters:

```csharp
using Nethereum.Contracts;
using Nethereum.ABI.FunctionEncoding.Attributes;
using System.Numerics;

public class StandardTokenDeployment : ContractDeploymentMessage
{
    public static string BYTECODE = "0x60606040..."; // compiled bytecode

    public StandardTokenDeployment() : base(BYTECODE) { }

    [Parameter("uint256", "totalSupply")]
    public BigInteger TotalSupply { get; set; }
}
```

### Function Messages (Query and Transaction)

Each function is a class inheriting from `FunctionMessage`, decorated with `[Function]`:

```csharp
[Function("balanceOf", "uint256")]
public class BalanceOfFunction : FunctionMessage
{
    [Parameter("address", "_owner", 1)]
    public string Owner { get; set; }
}

[Function("transfer", "bool")]
public class TransferFunction : FunctionMessage
{
    [Parameter("address", "_to", 1)]
    public string To { get; set; }

    [Parameter("uint256", "_value", 2)]
    public BigInteger TokenAmount { get; set; }
}
```

### Event DTOs

Events implement `IEventDTO` and are decorated with `[Event]`. Indexed parameters allow filtered queries:

```csharp
[Event("Transfer")]
public class TransferEventDTO : IEventDTO
{
    [Parameter("address", "_from", 1, true)]
    public string From { get; set; }

    [Parameter("address", "_to", 2, true)]
    public string To { get; set; }

    [Parameter("uint256", "_value", 3, false)]
    public BigInteger Value { get; set; }
}
```

### Function Output DTOs

For functions that return complex values, define an output class implementing `IFunctionOutputDTO`:

```csharp
[FunctionOutput]
public class BalanceOfOutputDTO : IFunctionOutputDTO
{
    [Parameter("uint256", "balance", 1)]
    public BigInteger Balance { get; set; }
}
```

## Deploy a Smart Contract

Create a deployment handler and send the deployment transaction:

```csharp
var web3 = new Web3(account, "http://localhost:8545");

var deploymentMessage = new StandardTokenDeployment
{
    TotalSupply = 100000
};

var deploymentHandler = web3.Eth.GetContractDeploymentHandler<StandardTokenDeployment>();
var receipt = await deploymentHandler.SendRequestAndWaitForReceiptAsync(deploymentMessage);
var contractAddress = receipt.ContractAddress;
```

Gas, gas price, and nonce are estimated automatically. To control them, set properties on the deployment message before sending.

## Query a Smart Contract

Use `GetContractQueryHandler<T>` to call view/pure functions without sending a transaction:

```csharp
var balanceOfMessage = new BalanceOfFunction { Owner = account.Address };
var balanceHandler = web3.Eth.GetContractQueryHandler<BalanceOfFunction>();

// Single return value
var balance = await balanceHandler.QueryAsync<BigInteger>(contractAddress, balanceOfMessage);

// Deserialize to output DTO (for multiple return values)
var output = await balanceHandler.QueryDeserializingToObjectAsync<BalanceOfOutputDTO>(
    balanceOfMessage, contractAddress);
```

## Send a Transaction

Use `GetContractTransactionHandler<T>` to call state-changing functions:

```csharp
var transferHandler = web3.Eth.GetContractTransactionHandler<TransferFunction>();

var transfer = new TransferFunction
{
    To = receiverAddress,
    TokenAmount = 100
};

var receipt = await transferHandler.SendRequestAndWaitForReceiptAsync(contractAddress, transfer);
```

## Decode Events from a Receipt

After a transaction, decode events directly from the receipt:

```csharp
var transferEvents = receipt.DecodeAllEvents<TransferEventDTO>();

var firstTransfer = transferEvents[0];
var from = firstTransfer.Event.From;
var to = firstTransfer.Event.To;
var value = firstTransfer.Event.Value;
```

For advanced event filtering and querying across block ranges, see [Events & Logs](./guide-events.md).

## Query Historical State

All query methods accept an optional `BlockParameter` to read contract state at a specific block:

```csharp
var historicalBalance = await balanceHandler.QueryDeserializingToObjectAsync<BalanceOfOutputDTO>(
    balanceOfMessage, contractAddress,
    new Nethereum.RPC.Eth.DTOs.BlockParameter(deployReceipt.BlockNumber));
```

## Gas Estimation and Gas Price

Nethereum auto-estimates gas and retrieves the current gas price. For manual control:

```csharp
var transferHandler = web3.Eth.GetContractTransactionHandler<TransferFunction>();
var transfer = new TransferFunction { To = receiverAddress, TokenAmount = 100 };

// Estimate gas
var estimate = await transferHandler.EstimateGasAsync(contractAddress, transfer);
transfer.Gas = estimate.Value;

// Set gas price (in Wei)
transfer.GasPrice = Web3.Convert.ToWei(25, UnitConversion.EthUnit.Gwei);

var receipt = await transferHandler.SendRequestAndWaitForReceiptAsync(contractAddress, transfer);
```

## Send Ether with a Function Call

If a function is `payable`, set `AmountToSend`:

```csharp
transfer.AmountToSend = Web3.Convert.ToWei(1); // 1 ETH
```

## Nonce Control

Nethereum manages nonces automatically (including an in-memory counter for rapid submissions). To set manually:

```csharp
transfer.Nonce = 42;
```

## Offline Signing

Sign a transaction without broadcasting it, useful for cold wallets or deferred submission:

```csharp
var transfer = new TransferFunction
{
    To = receiverAddress,
    TokenAmount = 100,
    Nonce = 2,
    Gas = 60000,
    GasPrice = Web3.Convert.ToWei(25, UnitConversion.EthUnit.Gwei)
};

var signedTransaction = await transferHandler.SignTransactionAsync(contractAddress, transfer);
```

Set `Nonce`, `Gas`, and `GasPrice` before signing for fully offline operation (no node required).

## Non-Type-Safe Interaction (ABI JSON)

When you have a raw ABI string and don't want typed classes, use `GetContract` and `GetFunction`:

```csharp
var abi = @"[{""constant"":true,""inputs"":[{""name"":""_owner"",""type"":""address""}],
    ""name"":""balanceOf"",""outputs"":[{""name"":""balance"",""type"":""uint256""}],
    ""type"":""function""}, ...]";

var receipt = await web3.Eth.DeployContract.SendRequestAndWaitForReceiptAsync(
    abi, bytecode, senderAddress, new HexBigInteger(900000), null, totalSupply);

var contract = web3.Eth.GetContract(abi, receipt.ContractAddress);
var balanceFunction = contract.GetFunction("balanceOf");
var transferFunction = contract.GetFunction("transfer");

// Query
var balance = await balanceFunction.CallAsync<BigInteger>(ownerAddress);

// Estimate gas and send transaction
var gas = await transferFunction.EstimateGasAsync(senderAddress, null, null, toAddress, amount);
var txReceipt = await transferFunction.SendTransactionAndWaitForReceiptAsync(
    senderAddress, gas, null, null, toAddress, amount);
```

The typed approach is recommended — it catches parameter mismatches at compile time and enables code generation.

## Next Steps

- [Deploy a Contract](./deploy-a-contract.md) -- deploy contracts using the typed deployment handlers shown above
- [ERC-20 Tokens](./erc20.md) -- interact with any ERC-20 token using built-in typed services
- [Code Generation](./code-generation.md) -- generate typed DTOs and service classes from ABI
- [Events & Logs](./guide-events.md) -- filter, subscribe, and decode contract events
