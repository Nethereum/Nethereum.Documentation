---
title: "Nethereum.Unity.Metamask"
sidebar_label: "Nethereum.Unity.Metamask"
sidebar_position: 100
description: "MetaMask integration for Unity WebGL builds. Provides JavaScript interop to connect MetaMask in the browser, sign transactions, and send RPC requests through MetaMask's provider — all within Unity's c"
custom_edit_url: "https://github.com/Nethereum/Nethereum/edit/master/src/Nethereum.Unity.Metamask/README.md"
format: md
---

# Nethereum.Unity.Metamask

> **NuGet**: [`Nethereum.Unity.Metamask`](https://www.nuget.org/packages/Nethereum.Unity.Metamask/) | **Source**: [`src/Nethereum.Unity.Metamask/`](https://github.com/Nethereum/Nethereum/tree/master/src/Nethereum.Unity.Metamask)
# Nethereum.Unity.Metamask

MetaMask integration for Unity WebGL builds. Provides JavaScript interop to connect MetaMask in the browser, sign transactions, and send RPC requests through MetaMask's provider — all within Unity's coroutine execution model.

## Key Components

| Class | Purpose |
|---|---|
| `MetamaskWebglHostProvider` | Unity `IEthereumHostProvider` implementation that delegates to MetaMask via JS interop |
| `MetamaskWebglInterop` | Low-level JavaScript interop calls to `window.ethereum` |
| `MetamaskWebglCoroutineRequestRpcClient` | Unity coroutine-based RPC client routing requests through MetaMask |
| `MetamaskTransactionCoroutineUnityRequest` | Coroutine wrapper for sending transactions via MetaMask |
| `MetamaskRpcRequestMessage` | RPC request message model |
| `MetamaskWebglCoroutineRequestRpcClientFactory` | Factory for creating coroutine RPC clients with custom timeouts |
| `MetamaskWebglTaskRequestInterop` | Task-based async interop — used internally by `MetamaskWebglHostProvider` |

## Usage

```csharp
// In a MonoBehaviour — use singleton pattern
var metamaskProvider = MetamaskWebglHostProvider.CreateOrGetCurrentInstance();
await metamaskProvider.EnableProviderAsync();
var web3 = await metamaskProvider.GetWeb3Async();

// Send a transaction — wallet handles signing
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(toAddress, 0.1m);
```

## Relationship to Other Packages

- **[Nethereum.Unity](nethereum-unity)** — Core Unity integration
- **[Nethereum.Unity.EIP6963](nethereum-unity-eip6963)** — Alternative: multi-wallet discovery via EIP-6963 (supports MetaMask and other wallets)
- **[Nethereum.Metamask](../blazor-dapp-integration/nethereum-metamask)** — MetaMask abstractions (non-Unity, Blazor-focused)
