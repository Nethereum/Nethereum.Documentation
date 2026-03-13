---
title: "Unity Quickstart"
sidebar_label: "Quickstart"
sidebar_position: 10
description: "Getting Nethereum into Unity: setup, WebGL wallet integration, and sending your first transaction"
---

# Unity Quickstart

## Prerequisites

- Unity 2021.3 LTS or later
- .NET Standard 2.1 compatibility level (Edit > Project Settings > Player > Api Compatibility Level)
- For WebGL wallet features: a WebGL build target

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
- **WebGL + async/await**: Unity WebGL requires [WebGLThreadingPatcher](https://github.com/nicloay/WebGLThreadingPatcher) or similar to use async/await with Tasks
- **Desktop HTTPS**: Newer Unity versions require `https://` for desktop builds — `http://` may be rejected
- Remove `System.Net.Http.dll` and `UnityEngine.dll` if they appear in the Nethereum package — they conflict with Unity's own assemblies

## WebGL Wallet Connection

### EIP-6963 Multi-Wallet Discovery (Recommended)

EIP-6963 discovers all installed browser wallets automatically. Users choose which wallet to connect.

```csharp
using UnityEngine;
using Nethereum.Unity.EIP6963;
using Nethereum.EIP6963WalletInterop;

public class WalletConnect : MonoBehaviour
{
    private EIP6963WalletHostProvider walletProvider;

    async void Start()
    {
        walletProvider = EIP6963WebglHostProvider.CreateOrGetCurrentInstance();

        var wallets = await walletProvider.GetAvailableWalletsAsync();
        foreach (var wallet in wallets)
            Debug.Log($"Found wallet: {wallet.Name} ({wallet.Rdns})");

        if (wallets.Length > 0)
        {
            await walletProvider.SelectWalletAsync(wallets[0].Uuid);
            var account = await walletProvider.ConnectAndGetSelectedAccountAsync();
            Debug.Log($"Connected: {account}");
        }
    }
}
```

### MetaMask Direct

For MetaMask-only support using `MetamaskWebglHostProvider`:

```csharp
using UnityEngine;
using Nethereum.Unity.Metamask;

public class MetamaskConnect : MonoBehaviour
{
    async void Start()
    {
        var metamaskProvider = new MetamaskWebglHostProvider();
        await metamaskProvider.EnableProviderAsync();
        var web3 = await metamaskProvider.GetWeb3Async();

        var balance = await web3.Eth.GetBalance.SendRequestAsync(
            metamaskProvider.SelectedAccount);
        Debug.Log($"Balance: {balance.Value}");
    }
}
```

## Sending ETH (Desktop/Mobile with Private Key)

On non-WebGL platforms, use coroutine-based requests with a private key:

```csharp
using UnityEngine;
using System.Collections;
using System.Numerics;
using Nethereum.Unity.Rpc;

public class SendEther : MonoBehaviour
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

## Reading Contract Data

Use `QueryUnityRequest` with typed function messages:

```csharp
using UnityEngine;
using System.Collections;
using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;
using Nethereum.Unity.Rpc;

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

public class ReadContract : MonoBehaviour
{
    private string url = "http://localhost:8545";
    private string contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    void Start()
    {
        StartCoroutine(GetBalance());
    }

    IEnumerator GetBalance()
    {
        var queryRequest = new QueryUnityRequest<BalanceOfFunction, BalanceOfOutput>(
            url, null);

        yield return queryRequest.Query(
            new BalanceOfFunction { Account = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
            contractAddress);

        if (queryRequest.Exception != null)
        {
            Debug.LogError(queryRequest.Exception.Message);
            yield break;
        }

        Debug.Log($"Token balance: {queryRequest.Result.Balance}");
    }
}
```

## IPFS URL Handling for NFT Metadata

`IpfsUrlService` converts `ipfs://` URIs to HTTP gateway URLs:

```csharp
using Nethereum.Unity;

var tokenUri = "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
var httpUrl = IpfsUrlService.ResolveIpfsUrlGateway(tokenUri);
```

To change the default gateway:

```csharp
IpfsUrlService.DefaultIpfsGateway = "https://gateway.pinata.cloud/ipfs/";
```

For batch NFT metadata fetching, use `NftMetadataUnityRequest<T>` which resolves IPFS URLs and downloads metadata as a coroutine.

## Platform Support

| Platform | Wallet Connection | Signing |
|---|---|---|
| WebGL | EIP-6963 (all wallets), MetaMask | Browser wallet signs |
| Windows / macOS / Linux | RPC endpoint | Private key |
| Android / iOS | RPC endpoint | Private key |

On WebGL, the browser wallet handles signing and transaction submission. On desktop and mobile, you supply a private key and Nethereum signs transactions locally before sending to an RPC endpoint.

## Next Steps

- [Nethereum.Unity](nethereum-unity) -- coroutine RPC and IPFS utilities
- [Nethereum.Unity.EIP6963](nethereum-unity-eip6963) -- full EIP-6963 multi-wallet API
- [Nethereum.Unity.Metamask](nethereum-unity-metamask) -- MetaMask WebGL integration
- [Unity3d Sample Template](https://github.com/Nethereum/Unity3dSampleTemplate) -- complete starter project
