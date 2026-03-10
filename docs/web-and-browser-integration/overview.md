---
title: Web & Browser Integration
sidebar_label: Overview
sidebar_position: 1
description: EIP-6963 wallet discovery, MetaMask, WalletConnect, and Blazor authentication
---

# Web & Browser Integration

Nethereum provides Blazor components for discovering and connecting browser wallets using EIP-6963, MetaMask, and WalletConnect/Reown.

## EIP-6963: Multi-Wallet Discovery

EIP-6963 replaces the old `window.ethereum` injection model. All installed wallets announce themselves and users choose which one to connect.

### Setup

1. Add NuGet: `Nethereum.Blazor`
2. Include `<script src="_content/Nethereum.Blazor/NethereumEIP6963.js"></script>`
3. Register services in `Program.cs`
4. Use `<EIP6963Wallet />` component

```razor
<EIP6963Wallet OnWalletConnected="HandleWalletConnected" />
```

## MetaMask Integration

```razor
@inject MetamaskHostProvider MetamaskHostProvider

@code {
    private async Task ConnectWallet()
    {
        await MetamaskHostProvider.EnableProviderAsync();
        var web3 = await MetamaskHostProvider.GetWeb3Async();
    }
}
```

## WalletConnect / Reown

For mobile wallet support via QR code:

```bash
dotnet add package Nethereum.Reown.AppKit
```

## Authentication State

`EthereumAuthenticationStateProvider` integrates with Blazor's `<AuthorizeView>`:

```razor
<AuthorizeView Roles="EthereumConnected">
    <Authorized>
        <p>Connected as @context.User.Identity?.Name</p>
    </Authorized>
</AuthorizeView>
```

## Packages

| Package | Description |
|---|---|
| `Nethereum.Blazor` | EIP-6963 discovery, auth state, dynamic contract interaction |
| `Nethereum.Metamask` | MetaMask wallet provider |
| `Nethereum.WalletConnect` | WalletConnect v2 protocol |
| `Nethereum.Reown.AppKit.Blazor` | Reown AppKit modal for Blazor |
