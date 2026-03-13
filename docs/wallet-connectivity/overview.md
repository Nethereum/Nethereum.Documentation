---
title: "Wallet Connectivity"
sidebar_label: "Overview"
sidebar_position: 1
description: "The IEthereumHostProvider abstraction — the universal wallet interface shared by Blazor, Unity, and the Wallet SDK"
---

# Wallet Connectivity

`IEthereumHostProvider` is the universal interface that every wallet connection in Nethereum implements. It is the shared foundation for the [Wallet SDK](../wallet-sdk/overview), [Web (Blazor) dApp Integration](../blazor-dapp-integration/overview), and [Unity](../unity/overview) sections.

```
                    IEthereumHostProvider
                    (Nethereum.UI)
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    Blazor dApps      Wallet SDK         Unity
    ├─ MetaMask       ├─ WalletVault     ├─ MetaMask WebGL
    ├─ EIP-6963       ├─ RPC handlers    └─ EIP-6963 WebGL
    ├─ Reown AppKit   └─ Prompt system
    └─ WalletConnect
```

All providers share the same interface — `GetWeb3Async()`, `EnableProviderAsync()`, `SignMessageAsync()`, `SelectedAccountChanged`, `NetworkChanged` — so application code works identically regardless of which wallet is connected.

## Package

| Package | Purpose |
|---------|---------|
| `Nethereum.UI` | Defines `IEthereumHostProvider`, `SelectedEthereumHostProviderService`, `EthereumAuthenticationStateProvider`, and `NethereumHostProvider` (development provider) |

## Guides

- **[Host Provider Pattern](guide-host-providers)** — Full interface reference, all 8 provider implementations, provider selection service, Blazor auth integration, cascade from browser wallet to Wallet SDK
