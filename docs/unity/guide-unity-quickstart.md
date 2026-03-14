---
title: "Unity Quickstart"
sidebar_label: "Quickstart"
sidebar_position: 1
description: "Install Nethereum in Unity, query block numbers, and send your first ETH transfer"
---

# Unity Quickstart

This guide gets Nethereum running in your Unity project — from package installation through querying the blockchain and sending your first transaction. By the end you'll have a working `MonoBehaviour` that reads on-chain data and transfers ETH.

## Prerequisites

- Unity 2021.3 LTS or later
- .NET Standard 2.1 compatibility level (Edit > Project Settings > Player > Api Compatibility Level)
- For WebGL wallet features: a WebGL build target
- For async/await in WebGL: [WebGLThreadingPatcher](https://github.com/nicloay/WebGLThreadingPatcher)

## Installation via OpenUPM

Add Nethereum to your Unity project through OpenUPM. Edit `Packages/manifest.json`:

```json
{
  "scopedRegistries": [
    {
      "name": "package.openupm.com",
      "url": "https://package.openupm.com",
      "scopes": ["com.nethereum.unity"]
    }
  ],
  "dependencies": {
    "com.nethereum.unity": "5.0.0",
    "com.unity.nuget.newtonsoft-json": "3.2.1"
  }
}
```

This installs all core Nethereum libraries including WebGL wallet support (MetaMask, EIP-6963).

Package source: https://github.com/Nethereum/Nethereum.Unity

### Important Notes

- **AOT builds**: The package uses AOT-compatible builds with Unity's custom Newtonsoft Json.NET
- **WebGL + async/await**: Unity WebGL requires [WebGLThreadingPatcher](https://github.com/nicloay/WebGLThreadingPatcher) as a package dependency to use async/await with Tasks
- **Desktop HTTPS**: Newer Unity versions require `https://` for desktop builds — `http://` may be rejected
- **IL2CPP**: Set **IL2CPP Code Generation** to **Faster (smaller) builds** in Player Settings (Edit > Project Settings > Player > Other Settings)

## Query Block Number (Async — Preferred)

The preferred approach uses `UnityWebRequestRpcTaskClient` with the standard Nethereum `Web3` API. This gives you access to the full `web3.Eth.*` surface — the same API available in any .NET application.

```csharp
using UnityEngine;
using Nethereum.Web3;
using Nethereum.Unity.Rpc;
using System;

public class GetBlockNumber : MonoBehaviour
{
    public string Url = "https://ethereum-rpc.publicnode.com";

    async void Start()
    {
        var web3 = new Web3(new UnityWebRequestRpcTaskClient(new Uri(Url)));
        var blockNumber = await web3.Eth.Blocks.GetBlockNumber.SendRequestAsync();
        Debug.Log($"Block: {blockNumber.Value}");
    }
}
```

`UnityWebRequestRpcTaskClient` uses Unity's `UnityWebRequest` for HTTP communication, which is required for WebGL builds (the standard .NET `HttpClient` doesn't work in the browser). It accepts a `Uri` and optional `JsonSerializerSettings` and `ILogger`.

For authenticated RPC endpoints, you can set custom headers:

```csharp
var client = new UnityWebRequestRpcTaskClient(new Uri(url));
client.RequestHeaders["Authorization"] = "Bearer YOUR_API_KEY";
var web3 = new Web3(client);
```

## Send ETH (Async — Desktop/Mobile)

On non-WebGL platforms, create an `Account` with a private key and pass it to `Web3`. Nethereum handles gas estimation, nonce, and EIP-1559 fees automatically:

```csharp
using UnityEngine;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using System.Numerics;

public class SendEther : MonoBehaviour
{
    async void Start()
    {
        var account = new Account("0xYOUR_PRIVATE_KEY", chainId: 31337);
        var web3 = new Web3(account, "http://localhost:8545");

        var receipt = await web3.Eth.GetEtherTransferService()
            .TransferEtherAndWaitForReceiptAsync("0xRecipient", 0.1m);
        Debug.Log($"TX: {receipt.TransactionHash}");
    }
}
```

For explicit EIP-1559 fee control, you can use the `TimePreferenceFeeSuggestionStrategy` available via `web3.FeeSuggestion`:

```csharp
var feeStrategy = web3.FeeSuggestion.GetTimePreferenceFeeSuggestionStrategy();
var fee = await feeStrategy.SuggestFeeAsync();

var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(
        toAddress, amount,
        fee.MaxPriorityFeePerGas.Value,
        fee.MaxFeePerGas.Value);
```

## Cross-Platform Architecture

Unity games typically need to work on both desktop (where you hold a private key) and WebGL (where a browser wallet signs transactions). The pattern is conditional compilation:

```csharp
private async Task<IWeb3> GetWeb3Async()
{
#if UNITY_WEBGL
    // WebGL: browser wallet signs — no private key needed
    var walletProvider = EIP6963WebglHostProvider.CreateOrGetCurrentInstance();
    await walletProvider.EnableProviderAsync();
    return await walletProvider.GetWeb3Async();
#else
    // Desktop/Mobile: sign with private key
    var account = new Account(privateKey, chainId);
    return new Web3(account, url);
#endif
}
```

Once you have an `IWeb3` instance, the rest of your code is the same regardless of platform — `web3.Eth.GetEtherTransferService()`, `web3.Eth.ERC20`, etc. all work identically whether the wallet is a browser extension or a local private key.

## Coroutine Pattern (Alternative)

If you prefer Unity's traditional coroutine model, dedicated request classes wrap the RPC layer for `yield return` usage:

```csharp
using UnityEngine;
using System.Collections;
using System.Numerics;
using Nethereum.Unity.Rpc;

public class SendEtherCoroutine : MonoBehaviour
{
    private string url = "http://localhost:8545";
    private string privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    private BigInteger chainId = 31337;

    void Start()
    {
        StartCoroutine(TransferEth());
    }

    IEnumerator TransferEth()
    {
        var transferRequest = new EthTransferUnityRequest(url, privateKey, chainId);

        yield return transferRequest.TransferEther(
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            0.1m);

        if (transferRequest.Exception != null)
        {
            Debug.LogError($"Transfer failed: {transferRequest.Exception.Message}");
            yield break;
        }

        Debug.Log($"TX hash: {transferRequest.Result}");
    }
}
```

The coroutine classes (`EthTransferUnityRequest`, `QueryUnityRequest`, `TransactionSignedUnityRequest`) handle gas estimation and EIP-1559 fees automatically, just like the async `Web3` API. They default to EIP-1559 — set `UseLegacyAsDefault = true` if you need legacy gas pricing.

## AOT Build Settings

For IL2CPP builds (WebGL, iOS, consoles), set the code generation option to minimal:

**Edit > Project Settings > Player > Other Settings > IL2CPP Code Generation** → select **Faster (smaller) builds**

This uses the minimal code generation strategy, which works correctly with Nethereum's generic methods and produces smaller builds.

## Platform Support

| Platform | Wallet Connection | Signing |
|---|---|---|
| WebGL | EIP-6963 (all wallets), MetaMask | Browser wallet signs |
| Windows / macOS / Linux | RPC endpoint | Private key |
| Android / iOS | RPC endpoint | Private key |

On WebGL, the browser wallet handles signing and transaction submission. On desktop and mobile, you supply a private key and Nethereum signs transactions locally before sending to an RPC endpoint.

## Next Steps

- [WebGL Wallet Connection](guide-unity-wallets) — connect browser wallets via EIP-6963 and MetaMask in WebGL builds
- [Smart Contracts & ERC-20](guide-unity-smart-contracts) — deploy contracts, transfer tokens, query balances, and decode events
- [Code Generation & Shared Projects](guide-unity-code-generation) — generate typed contract services from Solidity and share code between Unity and .NET tests
- [Unity3d Sample Template](https://github.com/Nethereum/Unity3dSampleTemplate) — complete starter project with all examples
