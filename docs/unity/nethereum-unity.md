---
title: "Nethereum.Unity"
sidebar_label: "Nethereum.Unity"
sidebar_position: 100
description: "Unity game engine integration for Nethereum. Provides coroutine-based and async request patterns compatible with Unity's single-threaded execution model, plus utilities for IPFS and WebGL wallet conne"
custom_edit_url: "https://github.com/Nethereum/Nethereum/edit/master/src/Nethereum.Unity/README.md"
format: md
---

# Nethereum.Unity

> **NuGet**: [`Nethereum.Unity`](https://www.nuget.org/packages/Nethereum.Unity/) | **Source**: [`src/Nethereum.Unity/`](https://github.com/Nethereum/Nethereum/tree/master/src/Nethereum.Unity)
# Nethereum.Unity

Unity game engine integration for Nethereum. Provides coroutine-based and async request patterns compatible with Unity's single-threaded execution model, plus utilities for IPFS and WebGL wallet connectivity.

## Key Components

| Class | Purpose |
|---|---|
| `IpfsUrlService` | Converts IPFS URIs (`ipfs://...`) to HTTP gateway URLs for fetching NFT metadata and assets |

## Unity-Compatible RPC

Nethereum.Unity wraps the standard Nethereum RPC layer into Unity-friendly coroutine requests that work within `MonoBehaviour` update loops and WebGL builds.

## Setup

1. Import the Nethereum Unity package (compiled DLLs are in `src/compiledlibraries/net472UnityCommonAOT/`)
2. Reference `Nethereum.Unity.dll` and its dependencies in your Unity project
3. For WebGL wallet integration, also add [Nethereum.Unity.Metamask](nethereum-unity-metamask) or [Nethereum.Unity.EIP6963](nethereum-unity-eip6963)

## Relationship to Other Packages

- **[Nethereum.Unity.Metamask](nethereum-unity-metamask)** — MetaMask integration for Unity WebGL
- **[Nethereum.Unity.EIP6963](nethereum-unity-eip6963)** — EIP-6963 multi-wallet discovery for Unity WebGL
- **Nethereum.Web3** — Core Ethereum interaction (used under the hood)
