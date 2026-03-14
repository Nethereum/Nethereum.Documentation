---
title: Unity
sidebar_label: Overview
sidebar_position: 1
description: Integrate Ethereum into Unity games with async Web3 API, WebGL wallet connectivity, and EIP-6963 multi-wallet discovery
---

# Unity

Integrate Ethereum blockchain features into Unity games. Nethereum provides Unity-compatible libraries that work with both the async `Web3` API (preferred) and Unity's coroutine model, supporting WebGL browser wallet connectivity via EIP-6963 multi-wallet discovery.

## Getting Started

Install via OpenUPM by adding to your `Packages/manifest.json`:

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

Package source: https://github.com/Nethereum/Nethereum.Unity

## The Simple Path

Once installed, use the standard `Web3` API — the same API available in any .NET application:

```csharp
var web3 = new Web3(new UnityWebRequestRpcTaskClient(new Uri(url)));
var blockNumber = await web3.Eth.Blocks.GetBlockNumber.SendRequestAsync();
```

| Task | Simple Path |
|------|-------------|
| Query block number | `web3.Eth.Blocks.GetBlockNumber.SendRequestAsync()` |
| Get ETH balance | `web3.Eth.GetBalance.SendRequestAsync(address)` |
| Send ETH | `web3.Eth.GetEtherTransferService().TransferEtherAndWaitForReceiptAsync(to, amount)` |
| ERC-20 balance | `web3.Eth.ERC20.GetContractService(addr).BalanceOfQueryAsync(owner)` |
| Connect wallet (WebGL) | `EIP6963WebglHostProvider.CreateOrGetCurrentInstance()` |
| Deploy contract | `web3.Eth.GetContractDeploymentHandler<T>().SendRequestAndWaitForReceiptAsync(deployment)` |

Nethereum handles gas estimation, nonce management, EIP-1559 fee calculation, and transaction signing automatically. You only override when you need to.

## Cross-Platform Architecture

Unity games typically need to work on both desktop (private key signing) and WebGL (browser wallet signing). Use conditional compilation:

```csharp
#if UNITY_WEBGL
    var walletProvider = EIP6963WebglHostProvider.CreateOrGetCurrentInstance();
    await walletProvider.EnableProviderAsync();
    var web3 = await walletProvider.GetWeb3Async();
#else
    var account = new Account(privateKey, chainId);
    var web3 = new Web3(account, url);
#endif
```

Once you have a `Web3` instance, all `web3.Eth.*` calls work identically regardless of platform.

## Guides

### Getting Started

| Guide | What You'll Learn |
|---|---|
| [Quickstart](guide-unity-quickstart) | Install Nethereum, query blocks, send ETH, and set up cross-platform architecture |
| [WebGL Wallet Connection](guide-unity-wallets) | Connect browser wallets via EIP-6963 and MetaMask in WebGL builds |

### Smart Contracts & Code Sharing

| Guide | What You'll Learn |
|---|---|
| [Smart Contracts & ERC-20](guide-unity-smart-contracts) | Deploy contracts, transfer tokens, query balances, decode events, and control fee estimation |
| [Code Generation & Shared Projects](guide-unity-code-generation) | Generate typed C# contract services from Solidity and share code between Unity and .NET test projects |

## Packages

| Package | Description |
|---|---|
| [`Nethereum.Unity`](nethereum-unity) | Core Unity integration: async RPC client, coroutine wrappers, fee strategies, IPFS utilities |
| [`Nethereum.Unity.EIP6963`](nethereum-unity-eip6963) | EIP-6963 multi-wallet discovery for Unity WebGL |
| [`Nethereum.Unity.Metamask`](nethereum-unity-metamask) | MetaMask integration for Unity WebGL |

## Platform Support

| Platform | Wallet Connection | Signing |
|---|---|---|
| WebGL | EIP-6963 (all wallets), MetaMask | Browser wallet signs |
| Windows / macOS / Linux | RPC endpoint | Private key |
| Android / iOS | RPC endpoint | Private key |

## Resources

- [Unity3d Sample Template](https://github.com/Nethereum/Unity3dSampleTemplate) — complete starter project with all examples
- [WebGLThreadingPatcher](https://github.com/nicloay/WebGLThreadingPatcher) — required for async/await in Unity WebGL builds
