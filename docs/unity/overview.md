---
title: Unity
sidebar_label: Overview
sidebar_position: 1
description: Integrate Ethereum into Unity games with coroutine-based RPC, WebGL wallet connectivity, and EIP-6963 multi-wallet discovery
---

# Unity

Integrate Ethereum blockchain features into Unity games. Nethereum provides Unity-compatible libraries that work within Unity's single-threaded execution model, supporting coroutine-based RPC requests and WebGL browser wallet connectivity.

## Getting Started

1. Import the compiled Nethereum DLLs from `src/compiledlibraries/net472UnityCommonAOT/` into your Unity project's `Assets/Plugins/` folder
2. Add the wallet integration package for your target platform

## WebGL Wallet Integration

### EIP-6963 Multi-Wallet Discovery (Recommended)

```csharp
// Discovers all installed browser wallets
// Users choose which wallet to connect
```

### MetaMask

```csharp
var metamaskProvider = new MetamaskWebglHostProvider();
await metamaskProvider.EnableProviderAsync();
var web3 = await metamaskProvider.GetWeb3Async();
```

## Packages

| Package | Description |
|---|---|
| [`Nethereum.Unity`](nethereum-unity) | Core Unity integration: coroutine RPC, IPFS URL utilities |
| [`Nethereum.Unity.EIP6963`](nethereum-unity-eip6963) | EIP-6963 multi-wallet discovery for Unity WebGL |
| [`Nethereum.Unity.Metamask`](nethereum-unity-metamask) | MetaMask integration for Unity WebGL |

## Supported Platforms

| Platform | Wallet Connection |
|---|---|
| WebGL | EIP-6963 (all wallets), MetaMask |
| Desktop (Windows/macOS/Linux) | RPC endpoint (e.g. local node) |
| Mobile | RPC endpoint |
