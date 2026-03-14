---
title: "Smart Contracts & ERC-20"
sidebar_label: "Smart Contracts & ERC-20"
sidebar_position: 3
description: "Deploy ERC-20 contracts, transfer tokens, query balances, decode events, and use fee estimation strategies in Unity"
---

# Smart Contracts & ERC-20

After [connecting to a wallet](guide-unity-wallets) or [setting up a Web3 instance](guide-unity-quickstart), you'll want to interact with smart contracts. This guide covers deploying an ERC-20 token, transferring tokens, querying balances, decoding transfer events, and controlling EIP-1559 fee estimation — all from Unity.

## ERC-20 with Typed Contract Services (Async)

The cleanest approach is to use a generated contract service with the async `Web3` API. The [Unity3d Sample Template](https://github.com/Nethereum/Unity3dSampleTemplate) includes a pre-generated `ERC20TokenService` — see [Code Generation](guide-unity-code-generation) to generate your own.

### Deploy

```csharp
using Sample.DotNet.Contracts.ERC20Token;
using Sample.DotNet.Contracts.ERC20Token.ContractDefinition;

var web3 = await GetWeb3Async(); // see Quickstart for cross-platform pattern

var deployContract = new ERC20TokenDeployment
{
    InitialAmount = Web3.Convert.ToWei(10000000),
    TokenName = "My Game Token",
    TokenSymbol = "GAME",
    DecimalUnits = 18,
};

var deploymentHandler = web3.Eth.GetContractDeploymentHandler<ERC20TokenDeployment>();
var receipt = await deploymentHandler.SendRequestAndWaitForReceiptAsync(deployContract);
var contractAddress = receipt.ContractAddress;
Debug.Log($"Deployed at: {contractAddress}");
```

The deployment message class (`ERC20TokenDeployment`) contains the contract's compiled bytecode as a static field. Nethereum handles gas estimation and transaction signing automatically.

### Transfer Tokens

Once deployed, create a service instance and call typed methods:

```csharp
var erc20Service = new ERC20TokenService(web3, contractAddress);

var transferReceipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(
    recipientAddress,
    UnitConversion.Convert.ToWei(100));

Debug.Log($"Transfer TX: {transferReceipt.TransactionHash}");
```

### Query Balance

```csharp
var balance = await erc20Service.BalanceOfQueryAsync(ownerAddress);
Debug.Log($"Balance: {UnitConversion.Convert.FromWei(balance)}");
```

### Decode Transfer Events

After a transfer, you can decode the events from the transaction receipt:

```csharp
// From the receipt directly
var transferEvents = transferReceipt.DecodeAllEvents<TransferEventDTO>();
Debug.Log($"Transferred: {transferEvents[0].Event.Value}");

// Or query historical events via logs
var eventHandler = web3.Eth.GetEvent<TransferEventDTO>(contractAddress);
var filter = eventHandler.CreateFilterInput(senderAddress);
var events = await eventHandler.GetAllChangesAsync(filter);
foreach (var evt in events)
    Debug.Log($"Transfer: {evt.Event.Value} to {evt.Event.To}");
```

## Using Built-in ERC-20 Services

If you don't have generated contract services, Nethereum has built-in `web3.Eth.ERC20` for any ERC-20 contract:

```csharp
var erc20 = web3.Eth.ERC20.GetContractService(contractAddress);

var name = await erc20.NameQueryAsync();
var symbol = await erc20.SymbolQueryAsync();
var decimals = await erc20.DecimalsQueryAsync();
var balance = await erc20.BalanceOfQueryAsync(ownerAddress);

Debug.Log($"{name} ({symbol}): {Web3.Convert.FromWei(balance, decimals)}");
```

Similarly, `web3.Eth.ERC721` and `web3.Eth.ERC1155` provide typed access to NFT and multi-token contracts without any code generation.

## Coroutine Pattern

For the coroutine approach, use `QueryUnityRequest` for read-only calls and `TransactionSignedUnityRequest` for transactions. You need ABI-typed function and output DTOs:

```csharp
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;

[Function("balanceOf", "uint256")]
public class BalanceOfFunction : FunctionMessage
{
    [Parameter("address", "account", 1)]
    public string Account { get; set; }
}

[FunctionOutput]
public class BalanceOfOutput : IFunctionOutputDTO
{
    [Parameter("uint256", 1)]
    public BigInteger Balance { get; set; }
}
```

### Query via Coroutine

```csharp
IEnumerator GetBalance()
{
    var queryRequest = new QueryUnityRequest<BalanceOfFunction, BalanceOfOutput>(
        url, null);

    yield return queryRequest.Query(
        new BalanceOfFunction { Account = ownerAddress },
        contractAddress);

    if (queryRequest.Exception != null)
    {
        Debug.LogError(queryRequest.Exception.Message);
        yield break;
    }

    Debug.Log($"Token balance: {queryRequest.Result.Balance}");
}
```

### Send Transaction via Coroutine

```csharp
IEnumerator TransferTokens()
{
    var transactionRequest = new TransactionSignedUnityRequest(
        url, privateKey, chainId);

    var transferFunction = new TransferFunction
    {
        To = recipientAddress,
        Value = Web3.Convert.ToWei(100),
    };

    yield return transactionRequest.SignAndSendTransaction(
        transferFunction, contractAddress);

    if (transactionRequest.Exception != null)
    {
        Debug.LogError(transactionRequest.Exception.Message);
        yield break;
    }

    Debug.Log($"TX: {transactionRequest.Result}");

    // Wait for receipt
    var receiptPolling = new TransactionReceiptPollingRequest(url);
    yield return receiptPolling.PollForReceipt(transactionRequest.Result, 2);
    Debug.Log($"Status: {receiptPolling.Result.Status.Value}");
}
```

## EIP-1559 Fee Strategies

When using the async `Web3` API, fees are handled automatically. But you can request specific fee suggestions:

```csharp
// Time-preference strategy (returns array sorted by priority)
var strategy = web3.FeeSuggestion.GetTimePreferenceFeeSuggestionStrategy();
var fee = await strategy.SuggestFeeAsync();

var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(
        toAddress, amount,
        fee.MaxPriorityFeePerGas.Value,
        fee.MaxFeePerGas.Value);
```

For the coroutine pattern, equivalent strategies are available:

| Strategy | How It Works | Result Type |
|---|---|---|
| `SimpleFeeSuggestionUnityRequestStrategy` | `baseFee * 2 + priorityFee` — one RPC call | `Fee1559` |
| `MedianPriorityFeeHistorySuggestionUnityRequestStrategy` | Median of recent priority fees | `Fee1559` |
| `TimePreferenceFeeSuggestionUnityRequestStrategy` | Time-preference model from fee history | `Fee1559[]` (array by priority) |

```csharp
// Coroutine: median fee history
var median = new MedianPriorityFeeHistorySuggestionUnityRequestStrategy(url);
yield return median.SuggestFee();
var fee = median.Result;

var ethTransfer = new EthTransferUnityRequest(url, privateKey, chainId);
yield return ethTransfer.TransferEther(toAddress, 0.1m,
    fee.MaxPriorityFeePerGas.Value, fee.MaxFeePerGas.Value);
```

For legacy gas pricing (pre-EIP-1559 chains), set `UseLegacyAsDefault = true`:

```csharp
ethTransfer.UseLegacyAsDefault = true;
yield return ethTransfer.TransferEther(toAddress, 0.1m, gasPriceGwei: 20);
```

## IPFS URL Resolution

For NFT metadata that uses `ipfs://` URIs:

```csharp
using Nethereum.Unity;

var tokenUri = "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
var httpUrl = IpfsUrlService.ResolveIpfsUrlGateway(tokenUri);

// Change the default gateway
IpfsUrlService.DefaultIpfsGateway = "https://gateway.pinata.cloud/ipfs/";
```

## Next Steps

- [Code Generation & Shared Projects](guide-unity-code-generation) — generate typed contract services like `ERC20TokenService` from Solidity, and share them between Unity and .NET test projects
- [WebGL Wallets](guide-unity-wallets) — connect browser wallets for WebGL builds
- [Quickstart](guide-unity-quickstart) — installation and basic setup recap
