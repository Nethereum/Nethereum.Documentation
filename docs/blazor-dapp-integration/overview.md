---
title: "Web (Blazor) dApp Integration"
sidebar_label: Overview
sidebar_position: 1
description: Connect browser wallets, authenticate with SIWE, and interact with smart contracts in Blazor web applications
---

# Web (Blazor) dApp Integration

Build Blazor web applications that connect to browser wallets, authenticate users with Sign-In with Ethereum (SIWE), and interact with smart contracts — all without leaving the .NET ecosystem.

## Wallet Connection

### EIP-6963: Multi-Wallet Discovery (Recommended)

EIP-6963 replaces the old `window.ethereum` injection model. All installed browser wallets announce themselves and users choose which to connect:

```razor
<EIP6963Wallet OnWalletConnected="HandleWalletConnected" />
```

### MetaMask

Direct MetaMask integration for legacy support:

```csharp
await MetamaskHostProvider.EnableProviderAsync();
var web3 = await MetamaskHostProvider.GetWeb3Async();
```

### WalletConnect / Reown

Mobile wallet support via QR code scanning:

```bash
dotnet add package Nethereum.Reown.AppKit.Blazor
```

## Authentication with SIWE

Integrate Ethereum wallet authentication with Blazor's built-in `<AuthorizeView>`:

```razor
<AuthorizeView Roles="SiweAuthenticated">
    <Authorized>
        <p>Connected as @context.User.Identity?.Name</p>
    </Authorized>
</AuthorizeView>
```

The `EthereumAuthenticationStateProvider` manages wallet connection state, while `SiweAuthenticationServerStateProvider` and `SiweAuthenticationWasmStateProvider` add full SIWE authentication with JWT tokens and session management.

A complete starter template is available: **[Nethereum.Templates.Siwe](https://github.com/Nethereum/Nethereum.Templates.Pack)** — includes REST API + Blazor Server + Blazor WASM with MetaMask signing, JWT creation, and role-based access.

## Smart Contract Interaction

`Nethereum.Blazor` provides dynamic contract interaction UI — call any contract function by providing an ABI, without code generation:

```csharp
// Dynamic contract interaction via Blazor components
// Supports read/write functions, event querying, and ABI-decoded results
```

## Packages

| Package | Description |
|---|---|
| [`Nethereum.Blazor`](nethereum-blazor) | EIP-6963 wallet discovery, auth state provider, dynamic contract interaction UI |
| [`Nethereum.EIP6963WalletInterop`](nethereum-eip6963walletinterop) | EIP-6963 JavaScript interop core |
| [`Nethereum.Metamask`](nethereum-metamask) | MetaMask wallet provider abstractions |
| [`Nethereum.Metamask.Blazor`](nethereum-metamask-blazor) | MetaMask Blazor interop component |
| [`Nethereum.WalletConnect`](nethereum-walletconnect) | WalletConnect v2 protocol implementation |
| [`Nethereum.Reown.AppKit.Blazor`](nethereum-reown-appkit-blazor) | Reown AppKit modal (WalletConnect UI) for Blazor |
| [`Nethereum.Blazor.Solidity`](nethereum-blazor-solidity) | In-browser Solidity step-through debugger |
| [`Nethereum.HybridWebView`](nethereum-hybridwebview) | MAUI WebView with `window.ethereum` injection |

> **SIWE packages** (`Nethereum.Siwe`, `Nethereum.Siwe.Core`) are in the [Protocols](../protocols/nethereum-siwe) section. The authentication guide in this section shows how to use them with Blazor.
