---
title: Wallet Integration
sidebar_label: Wallet Integration
sidebar_position: 11
description: Connect MetaMask via EIP-6963, validate the connected chain, and prompt users to switch to the DevChain.
---

# Wallet Integration

With your contracts [tested in Solidity](guide-forge-testing), [generated as C# services](guide-codegen), and [verified with unit](guide-csharp-unit-testing) and [integration tests](guide-integration-testing), it's time to build the user-facing dApp. The WebApp uses [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) for wallet discovery — a modern standard that detects all installed browser wallets (MetaMask, Rabby, Coinbase Wallet, etc.) without relying on the deprecated `window.ethereum`. This guide explains how the wallet flow works and how to customise it.

## The Three States

The Token Interaction page in the WebApp handles three user states:

### 1. Not Connected

When no wallet is connected, the page shows a prompt:

```
Connect your wallet using the button in the header to interact with tokens.
```

The `EIP6963Wallet` component in the navigation header handles the connection. When the user clicks "Connect Wallet", it discovers available wallets via EIP-6963 and prompts the user to select one.

### 2. Connected, Wrong Chain

After connecting, the page checks if the wallet is on the correct chain (the DevChain, chain ID 31337). If not:

```
Your wallet is connected to chain 1, but this dApp requires chain 31337.
[Switch to DevChain]
```

Clicking the button calls `wallet_addEthereumChain`, which tells MetaMask to add the DevChain network and switch to it. The RPC URL comes from Aspire service discovery — the WebApp knows the DevChain's actual URL.

### 3. Connected, Correct Chain

Once the wallet is on the right chain, the full token interaction UI appears — deploy, mint, transfer, and balance queries.

## How It Works in Code

### Service Registration (Program.cs)

The WebApp's `Program.cs` registers the wallet services:

```csharp
builder.Services.AddScoped<IEIP6963WalletInterop, EIP6963WalletBlazorInterop>();
builder.Services.AddScoped<EIP6963WalletHostProvider>();
builder.Services.AddScoped<LocalStorageHelper>();

builder.Services.AddScoped<SelectedEthereumHostProviderService>(sp =>
{
    var walletHostProvider = sp.GetRequiredService<EIP6963WalletHostProvider>();
    var selectedHostProvider = new SelectedEthereumHostProviderService();
    selectedHostProvider.SetSelectedEthereumHostProvider(walletHostProvider);
    return selectedHostProvider;
});

builder.Services.AddAuthorizationCore();
builder.Services.AddCascadingAuthenticationState();
builder.Services.AddScoped<AuthenticationStateProvider, EthereumAuthenticationStateProvider>();
```

The `EthereumAuthenticationStateProvider` ties wallet connection to Blazor's authentication system — when a wallet connects, the user gets the `EthereumConnected` role.

### Chain Validation (TokenInteraction.razor)

The page subscribes to account and network change events:

```csharp
_ethereumHostProvider.SelectedAccountChanged += OnAccountChanged;
_ethereumHostProvider.NetworkChanged += OnNetworkChanged;
```

On init and account change, it fetches the current chain ID:

```csharp
var web3 = await _ethereumHostProvider.GetWeb3Async();
var chainId = await web3.Eth.ChainId.SendRequestAsync();
SelectedChainId = (long)chainId.Value;
```

### Chain Switching

When the user clicks "Switch to DevChain", the page sends a `wallet_addEthereumChain` request:

```csharp
var addChainParam = new AddEthereumChainParameter
{
    ChainId = new HexBigInteger(31337),
    ChainName = "MyDapp DevChain",
    NativeCurrency = new NativeCurrency
    {
        Name = "Ether",
        Symbol = "ETH",
        Decimals = 18
    },
    RpcUrls = new List<string> { rpcUrl }
};
await web3.Eth.HostWallet.AddEthereumChain.SendRequestAsync(addChainParam);
```

`wallet_addEthereumChain` handles both scenarios — if the chain already exists in MetaMask, it switches to it; if it's new, MetaMask prompts the user to add and switch.

The `rpcUrl` comes from `Configuration["Web3:RpcUrl"]`, which the AppHost resolves from Aspire service discovery.

### State Reset on Chain Change

When the user switches chains, the page resets contract state:

```csharp
private async Task OnNetworkChanged(long chainId)
{
    SelectedChainId = chainId;
    contractAddress = null;
    tokenService = null;
    tokenInfo = null;
    balanceResult = null;
    await InvokeAsync(StateHasChanged);
}
```

This is important — a deployed contract address is chain-specific. When the user switches away and back, they need to redeploy.

## The EIP6963Wallet Component

The `EIP6963Wallet` component (from `Nethereum.Blazor`) handles the wallet selection dropdown. In the template's layout:

```razor
<EIP6963Wallet Theme="EIP6963Wallet.ThemeType.None" />
```

`Theme="None"` means the component inherits styling from the host app's CSS via custom properties:

```css
:root {
    --wallet-btn-bg: transparent;
    --wallet-text-color: var(--text);
    --wallet-border-color: var(--border);
    --wallet-dropdown-bg: var(--bg-card);
    --wallet-item-hover-bg: var(--primary-dim);
    --wallet-item-hover-color: var(--primary);
}
```

## Next Steps

With the wallet connected and on the right chain:

- **[Token Interaction UI](guide-webapp-token-interaction)** — Walk through the deploy/mint/transfer UI in detail
- **[Explorer ABI Discovery](guide-explorer-abi-discovery)** — See how deployed contracts appear in the Explorer
