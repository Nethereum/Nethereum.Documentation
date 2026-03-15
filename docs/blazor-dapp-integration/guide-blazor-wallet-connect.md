---
title: "Connecting Browser Wallets"
sidebar_label: "Wallet Connection"
sidebar_position: 10
description: "Connect browser wallets in Blazor using EIP-6963, MetaMask, and WalletConnect/Reown"
---

# Connecting Browser Wallets

Nethereum provides three ways to connect browser wallets from Blazor. EIP-6963 is the recommended approach -- it discovers all installed wallet extensions automatically. MetaMask direct integration and WalletConnect/Reown are available for specific use cases.

## EIP-6963 Multi-Wallet Discovery (Recommended)

EIP-6963 replaces the legacy `window.ethereum` injection model. All installed wallet extensions (MetaMask, Coinbase Wallet, Rabby, etc.) announce themselves, and your app presents them for the user to choose.

### Setup

```bash
dotnet add package Nethereum.Blazor
```

Include the JS interop script in `index.html` or `App.razor`:

```html
<script src="_content/Nethereum.Blazor/NethereumEIP6963.js"></script>
```

Register services in `Program.cs`:

```csharp
using Nethereum.Blazor;
using Nethereum.Blazor.EIP6963WalletInterop;
using Nethereum.EIP6963WalletInterop;
using Nethereum.UI;
using Microsoft.AspNetCore.Components.Authorization;

builder.Services.AddSingleton<IEIP6963WalletInterop, EIP6963WalletBlazorInterop>();
builder.Services.AddSingleton<EIP6963WalletHostProvider>();
builder.Services.AddSingleton<IEthereumHostProvider>(sp =>
    sp.GetRequiredService<EIP6963WalletHostProvider>());
builder.Services.AddSingleton<SelectedEthereumHostProviderService>();
builder.Services.AddScoped<AuthenticationStateProvider, EthereumAuthenticationStateProvider>();
builder.Services.AddAuthorizationCore();
```

### Discover and Connect

```razor
@inject IEIP6963WalletInterop WalletInterop
@inject EIP6963WalletHostProvider WalletProvider
@inject AuthenticationStateProvider AuthStateProvider

@if (wallets != null)
{
    @foreach (var wallet in wallets)
    {
        <button @onclick="() => Connect(wallet)">
            @if (!string.IsNullOrEmpty(wallet.Icon))
            {
                <img src="@wallet.Icon" alt="@wallet.Name" width="24" />
            }
            @wallet.Name
        </button>
    }
}

@code {
    private EIP6963WalletInfo[] wallets;

    protected override async Task OnInitializedAsync()
    {
        await Task.Delay(500);
        wallets = await WalletInterop.GetAvailableWalletsAsync();
    }

    private async Task Connect(EIP6963WalletInfo wallet)
    {
        await WalletInterop.SelectWalletAsync(wallet.Uuid);
        var address = await WalletProvider.EnableProviderAsync();

        if (!string.IsNullOrEmpty(address) &&
            AuthStateProvider is EthereumAuthenticationStateProvider ethAuth)
        {
            await ethAuth.NotifyAuthenticationStateAsEthereumConnected();
        }
    }
}
```

![EIP-6963 wallet discovery detecting MetaMask, Brave, and Coinbase wallets in Blazor Server](../screenshots/Explorer-Eip6963-serverside-blazorsupport-not%20just%20wasm%20example%20dectecting%20metamask,%20brave%20and%20coinbase%20wallets.png)

### Get Web3 After Connection

Once connected through any provider, get a `Web3` instance for RPC calls:

```csharp
var web3 = await WalletProvider.GetWeb3Async();
var balance = await web3.Eth.GetBalance.SendRequestAsync(WalletProvider.SelectedAccount);
```

## MetaMask Direct Integration

For apps that only need MetaMask support:

```bash
dotnet add package Nethereum.Metamask.Blazor
```

Add the JS interop script:

```html
<script src="_content/Nethereum.Metamask.Blazor/NethereumMetamask.js"></script>
```

Register services:

```csharp
using Nethereum.Metamask;
using Nethereum.Metamask.Blazor;

builder.Services.AddSingleton<IMetamaskInterop, MetamaskBlazorInterop>();
builder.Services.AddSingleton<MetamaskHostProvider>();
builder.Services.AddSingleton<IEthereumHostProvider>(sp =>
    sp.GetRequiredService<MetamaskHostProvider>());
builder.Services.AddSingleton<SelectedEthereumHostProviderService>();
```

Connect and use:

```csharp
@inject MetamaskHostProvider MetamaskProvider

var address = await MetamaskProvider.EnableProviderAsync();
var web3 = await MetamaskProvider.GetWeb3Async();
```

## WalletConnect / Reown AppKit

For mobile wallet support via QR codes and the full Reown modal UI:

```bash
dotnet add package Nethereum.Reown.AppKit.Blazor
```

Register services with your [Reown Project ID](https://cloud.reown.com/):

```csharp
using Nethereum.Reown.AppKit.Blazor;

builder.Services.AddAppKit(new AppKitConfiguration
{
    Networks = NetworkConstants.Networks.All,
    ProjectId = "YOUR-REOWN-PROJECT-ID",
    Name = "My Dapp",
    Description = "My decentralized application",
    Url = builder.HostEnvironment.BaseAddress,
    Icons = ["https://my-dapp.com/icon.png"],
    ThemeMode = ThemeModeOptions.dark,
    Swaps = true,
    Onramp = true
});
```

Use the built-in web components in your Razor page:

```razor
@using Nethereum.Reown.AppKit.Blazor
@inject IEthereumHostProvider ethereumHostProvider

<appkit-button />
<appkit-network-button />

@code {
    protected override async Task OnInitializedAsync()
    {
        ethereumHostProvider.SelectedAccountChanged += async (address) =>
        {
            await InvokeAsync(StateHasChanged);
        };
    }
}
```

## Listening for Account and Network Changes

All providers implement `IEthereumHostProvider` with the same event model:

```razor
@inject IEthereumHostProvider Provider
@implements IDisposable

<p>Account: @Provider.SelectedAccount</p>
<p>Chain: @Provider.SelectedNetworkChainId</p>

@code {
    protected override void OnInitialized()
    {
        Provider.SelectedAccountChanged += OnAccountChanged;
        Provider.NetworkChanged += OnNetworkChanged;
    }

    private async Task OnAccountChanged(string address)
    {
        await InvokeAsync(StateHasChanged);
    }

    private async Task OnNetworkChanged(long chainId)
    {
        await InvokeAsync(StateHasChanged);
    }

    public void Dispose()
    {
        Provider.SelectedAccountChanged -= OnAccountChanged;
        Provider.NetworkChanged -= OnNetworkChanged;
    }
}
```

## Next Steps

- [SIWE Authentication](guide-blazor-authentication) -- add Sign-In with Ethereum for role-based access
- [Dynamic Contract Interaction](guide-blazor-contract-interaction) -- call smart contracts through the connected wallet
- [Nethereum.Blazor](nethereum-blazor) -- full package API reference
