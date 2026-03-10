---
title: Wallet & UI
sidebar_label: Overview
sidebar_position: 1
description: Multi-platform wallet, Blazor dApps, MetaMask, WalletConnect, EIP-6963 wallet discovery, Unity, MAUI
---

# Wallet & UI

Nethereum includes a multi-platform wallet implementation using MVVM architecture (CommunityToolkit.Mvvm) with shared ViewModels and platform-specific renderers. This section also covers browser wallet integration (MetaMask, WalletConnect/Reown, EIP-6963), Blazor components, and Unity support.

## Architecture

- **Wallet Core** (`Nethereum.Wallet`) — transaction building, signing, state changes preview via EVM simulation, token management
- **UI Components** (`Nethereum.Wallet.UI.Components`) — platform-agnostic MVVM ViewModels for all wallet screens with localisation (EN/ES)
- **Renderers** — Blazor, Avalonia, and MAUI implementations

## Building a Wallet App

Combine the core wallet with UI components and a platform renderer:

```
Nethereum.Wallet                    (core services)
  + Nethereum.Wallet.UI.Components  (ViewModels)
  + Nethereum.Wallet.UI.Components.Blazor  (or .Maui, .Avalonia)
```

## Packages

| Package | Description |
|---|---|
| `Nethereum.Wallet` | Core wallet services |
| `Nethereum.Wallet.UI.Components` | Cross-platform MVVM ViewModels |
| `Nethereum.Wallet.UI.Components.Blazor` | Blazor renderer |
| `Nethereum.Wallet.UI.Components.Maui` | .NET MAUI renderer |
| `Nethereum.UI` | Shared UI abstractions |

## Web & Browser Integration

| Package | Description |
|---|---|
| `Nethereum.Blazor` | Blazor Ethereum host provider and authentication |
| `Nethereum.Blazor.Solidity` | In-browser Solidity step-through debugger |
| `Nethereum.EIP6963WalletInterop` | EIP-6963 wallet discovery for Blazor |
| `Nethereum.Metamask` | MetaMask integration core |
| `Nethereum.Metamask.Blazor` | MetaMask Blazor component |
| `Nethereum.WalletConnect` | WalletConnect protocol support |
| `Nethereum.Reown.AppKit.Blazor` | Reown AppKit (WalletConnect v2) Blazor component |

## Unity

| Package | Description |
|---|---|
| `Nethereum.Unity` | Unity3D integration |
| `Nethereum.Unity.EIP6963` | EIP-6963 wallet discovery for Unity WebGL |
