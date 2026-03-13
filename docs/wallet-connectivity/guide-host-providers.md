---
title: "IEthereumHostProvider Architecture"
sidebar_label: "Host Provider Pattern"
sidebar_position: 5
description: "The universal wallet abstraction that powers MetaMask, EIP-6963, WalletConnect, Reown, Unity, and the Wallet SDK"
---

# IEthereumHostProvider Architecture

## The Core Abstraction

`IEthereumHostProvider` is the universal interface that every wallet connection in Nethereum implements. Whether your app connects to MetaMask in a browser, discovers wallets via EIP-6963, connects mobile wallets through WalletConnect/Reown, or runs inside Unity WebGL -- they all implement this single interface.

```csharp
public interface IEthereumHostProvider
{
    string Name { get; }
    bool Available { get; }
    string SelectedAccount { get; }
    long SelectedNetworkChainId { get; }
    bool Enabled { get; }
    bool MultipleWalletsProvider { get; }
    bool MultipleWalletSelected { get; }

    event Func<string, Task> SelectedAccountChanged;
    event Func<long, Task> NetworkChanged;
    event Func<bool, Task> AvailabilityChanged;
    event Func<bool, Task> EnabledChanged;

    Task<bool> CheckProviderAvailabilityAsync();
    Task<Web3.IWeb3> GetWeb3Async();
    Task<string> EnableProviderAsync();
    Task<string> GetProviderSelectedAccountAsync();
    Task<string> SignMessageAsync(string message);
}
```

### Properties

| Member | Description |
|--------|-------------|
| `Name` | Human-readable provider name (e.g. `"Metamask"`, `"EIP6963 Standard"`, `"Nethereum.AppKit"`) |
| `Available` | Whether the provider is detected and ready. For browser wallets, this means the extension is installed. |
| `SelectedAccount` | The currently active Ethereum address, or `null` if no account is connected. |
| `SelectedNetworkChainId` | The chain ID of the network the wallet is connected to (e.g. `1` for Ethereum mainnet). |
| `Enabled` | Whether the provider has been activated. A provider can be `Available` but not yet `Enabled` (user hasn't approved the connection). |
| `MultipleWalletsProvider` | `true` when the provider can discover multiple wallets (EIP-6963, Wallet SDK). `false` for single-wallet providers (MetaMask, WalletConnect). |
| `MultipleWalletSelected` | `true` when a specific wallet has been chosen from a multi-wallet provider. |

### Events

| Event | Fires When |
|-------|------------|
| `SelectedAccountChanged` | The user switches accounts in their wallet. |
| `NetworkChanged` | The user switches networks (chain ID changes). |
| `AvailabilityChanged` | The provider becomes available or unavailable. |
| `EnabledChanged` | The provider is enabled or disabled (wallet connected/disconnected). |

### Methods

| Method | Description |
|--------|-------------|
| `CheckProviderAvailabilityAsync()` | Probes whether the provider is available. Updates `Available` and fires `AvailabilityChanged`. |
| `GetWeb3Async()` | Returns an `IWeb3` instance configured with the provider's RPC interceptor. All transactions and signatures route through the wallet. |
| `EnableProviderAsync()` | Requests wallet connection (triggers the wallet's approval popup). Returns the selected account address or `null`. |
| `GetProviderSelectedAccountAsync()` | Fetches the current account from the wallet. Unlike the `SelectedAccount` property, this queries the wallet directly. |
| `SignMessageAsync(string message)` | Signs a UTF-8 message using `personal_sign`. The wallet shows the message and asks for confirmation. |

## Provider Implementations

| Provider | Package | Name | MultipleWalletsProvider | Platform | Use Case |
|----------|---------|------|------------------------|----------|----------|
| `MetamaskHostProvider` | `Nethereum.Metamask` | `"Metamask"` | `false` | Blazor | MetaMask browser extension |
| `EIP6963WalletHostProvider` | `Nethereum.EIP6963WalletInterop` | `"EIP6963 Standard"` | `true` | Blazor | Any browser wallet via EIP-6963 discovery |
| `AppKitHostProvider` | `Nethereum.Reown.AppKit.Blazor` | `"Nethereum.AppKit"` | `false` | Blazor | Reown modal UI, mobile wallets, QR codes |
| `NethereumWalletConnectHostProvider` | `Nethereum.WalletConnect` | `"WalletConnect"` | `false` | Any .NET | WalletConnect v2 protocol (no UI) |
| `MetamaskWebglHostProvider` | `Nethereum.Unity.Metamask` | (inherits `"Metamask"`) | `false` | Unity WebGL | MetaMask in Unity WebGL builds |
| `EIP6963WebglHostProvider` | `Nethereum.Unity.EIP6963` | (inherits `"EIP6963 Standard"`) | `true` | Unity WebGL | Multi-wallet in Unity WebGL |
| `NethereumHostProvider` | `Nethereum.UI` | `"Nethereum Host Provider"` | `false` | Any .NET | Development/testing with private keys |
| `NethereumWalletHostProvider` | `Nethereum.Wallet` | `"Nethereum Wallet"` | `true` | Wallet SDK | Built-in vault-backed provider |

### MetamaskHostProvider

The original browser wallet provider targeting MetaMask specifically.

```bash
dotnet add package Nethereum.Metamask
```

Include the JS interop in `index.html` or `App.razor`:

```html
<script src="_content/Nethereum.Blazor/NethereumMetamask.js"></script>
```

Register and use:

```csharp
builder.Services.AddSingleton<IMetamaskInterop, MetamaskBlazorInterop>();
builder.Services.AddSingleton<MetamaskHostProvider>();
builder.Services.AddSingleton<IEthereumHostProvider>(sp =>
    sp.GetRequiredService<MetamaskHostProvider>());
```

`MetamaskHostProvider` exposes a static `Current` property set during construction, so downstream code can access the singleton without DI. Internally it uses a `MetamaskInterceptor` that routes `eth_sendTransaction`, `personal_sign`, and `eth_signTypedData_v4` calls through the MetaMask extension via JS interop.

### EIP6963WalletHostProvider

The recommended approach for modern dApps. EIP-6963 replaces the legacy `window.ethereum` injection model -- all installed wallet extensions announce themselves, and your app presents them for the user to choose.

```bash
dotnet add package Nethereum.Blazor
```

```html
<script src="_content/Nethereum.Blazor/NethereumEIP6963.js"></script>
```

```csharp
builder.Services.AddSingleton<IEIP6963WalletInterop, EIP6963WalletBlazorInterop>();
builder.Services.AddSingleton<EIP6963WalletHostProvider>();
builder.Services.AddSingleton<IEthereumHostProvider>(sp =>
    sp.GetRequiredService<EIP6963WalletHostProvider>());
```

Discover and select wallets:

```csharp
@inject EIP6963WalletHostProvider WalletProvider

// Discover all installed browser wallets
EIP6963WalletInfo[] wallets = await WalletProvider.GetAvailableWalletsAsync();

// Each wallet has Name, Icon (data URI), Uuid, Rdns
foreach (var wallet in wallets)
{
    Console.WriteLine($"{wallet.Name} - {wallet.Uuid}");
}

// User picks one
await WalletProvider.SelectWalletAsync(wallets[0].Uuid);

// Now enable (triggers wallet popup)
string account = await WalletProvider.EnableProviderAsync();
```

After `SelectWalletAsync`, `MultipleWalletSelected` becomes `true`. The provider uses an `EIP6963WalletInterceptor` to route signing requests to the selected wallet.

### AppKitHostProvider (Reown)

Reown AppKit (formerly WalletConnect Web3Modal) provides a complete modal UI with wallet selection, QR codes for mobile wallets, social logins, and built-in network switching.

```bash
dotnet add package Nethereum.Reown.AppKit.Blazor
```

Register with `AddAppKit()`:

```csharp
builder.Services.AddAppKit(new AppKitConfiguration
{
    ProjectId = "your-reown-project-id",
    Name = "My dApp",
    Description = "A Nethereum dApp",
    Url = "https://mydapp.com",
    Icons = ["https://mydapp.com/icon.png"],
    Networks = [
        new Network { ChainId = 1, Name = "Ethereum", Currency = "ETH", RpcUrl = "https://..." },
        new Network { ChainId = 137, Name = "Polygon", Currency = "MATIC", RpcUrl = "https://..." }
    ]
});
```

Include the web components in your Blazor layout:

```html
<appkit-button />
<appkit-network-button />
```

The `AppKitHostProvider` initializes asynchronously. It sets up `WatchAccount` and `WatchChainId` callbacks that automatically fire `SelectedAccountChanged` and `NetworkChanged` events when the user interacts with the Reown modal.

### NethereumWalletConnectHostProvider

A lower-level WalletConnect v2 provider without built-in UI. Use this when you want full control over the connection flow or need WalletConnect in non-Blazor .NET environments.

```bash
dotnet add package Nethereum.WalletConnect
```

```csharp
var walletConnectService = new NethereumWalletConnectService(signClientOptions);
var provider = new NethereumWalletConnectHostProvider(walletConnectService);
```

Or with a specific RPC endpoint:

```csharp
var provider = new NethereumWalletConnectHostProvider(
    walletConnectService,
    url: "https://mainnet.infura.io/v3/YOUR_KEY");
```

The provider uses `NethereumWalletConnectInterceptor` to route signing methods through the WalletConnect protocol while read-only RPC calls go directly to the configured endpoint.

### NethereumHostProvider (Development)

A built-in provider for testing and development. No browser or wallet extension required -- it works with a private key and an RPC endpoint directly.

```csharp
var provider = new NethereumHostProvider();

// Configure RPC endpoint (also fetches chainId automatically)
bool connected = await provider.SetUrl("http://localhost:8545");

// Set the signing account
provider.SetSelectedAccount("0xYOUR_PRIVATE_KEY");
// or
provider.SetSelectedAccount(new Account("0xYOUR_PRIVATE_KEY", chainId: 1));
```

`SetUrl` calls `eth_chainId` on the endpoint and updates `SelectedNetworkChainId` automatically. `SignMessageAsync` uses `EthereumMessageSigner` locally -- no external wallet involved.

This provider is useful for integration tests, console apps, or backend services that need to interact with the blockchain without a user-facing wallet.

### Unity Providers

Both Unity providers are thin wrappers that substitute WebGL-specific JS interop implementations.

`MetamaskWebglHostProvider` extends `MetamaskHostProvider` and passes `MetamaskWebglTaskRequestInterop` as the interop layer:

```csharp
// Typically used in Unity WebGL builds
var provider = MetamaskWebglHostProvider.CreateOrGetCurrentInstance();
```

`EIP6963WebglHostProvider` extends `EIP6963WalletHostProvider` and passes `EIP6963WebglTaskRequestInterop`:

```csharp
var provider = EIP6963WebglHostProvider.CreateOrGetCurrentInstance();
```

Both use the `CreateOrGetCurrentInstance()` factory pattern to maintain a single instance through the static `Current` property inherited from their base classes.

## SelectedEthereumHostProviderService

The global provider selection service holds the currently active provider. All consumers inject this singleton to get "the current wallet."

```csharp
public class SelectedEthereumHostProviderService
{
    public IEthereumHostProvider SelectedHost { get; }
    public event Func<IEthereumHostProvider, Task> SelectedHostProviderChanged;

    public Task SetSelectedEthereumHostProvider(IEthereumHostProvider provider);
    public Task ClearSelectedEthereumHostProvider();
}
```

Register it as a singleton:

```csharp
builder.Services.AddSingleton<SelectedEthereumHostProviderService>();
```

When `SetSelectedEthereumHostProvider` is called with a different provider than the current one, it fires `SelectedHostProviderChanged`. Calling `ClearSelectedEthereumHostProvider` sets the provider to `null` and fires the event.

This service is the single point of coordination. When a user picks a wallet in your UI, you call `SetSelectedEthereumHostProvider`. Every component that depends on the active wallet -- authentication, balance displays, transaction forms -- reacts through the event.

## Blazor Authentication Integration

`EthereumAuthenticationStateProvider` bridges `IEthereumHostProvider` to Blazor's built-in authentication system (`AuthenticationStateProvider`). It listens to provider and account changes and translates them into `ClaimsPrincipal` objects.

### How It Works

1. Subscribes to `SelectedEthereumHostProviderService.SelectedHostProviderChanged`
2. When the provider changes, unsubscribes from the old provider's `SelectedAccountChanged` and subscribes to the new one
3. When an account is connected, creates a `ClaimsPrincipal` with:
   - `ClaimTypes.NameIdentifier` = the Ethereum address
   - `ClaimTypes.Role` = `"EthereumConnected"`
4. Calls `NotifyAuthenticationStateChanged` to update all `<AuthorizeView>` components

### Setup

```csharp
builder.Services.AddSingleton<SelectedEthereumHostProviderService>();
builder.Services.AddScoped<AuthenticationStateProvider, EthereumAuthenticationStateProvider>();
builder.Services.AddAuthorizationCore();
```

### Usage in Razor

```razor
<AuthorizeView Roles="EthereumConnected">
    <Authorized>
        <p>Connected: @context.User.Identity?.Name</p>
    </Authorized>
    <NotAuthorized>
        <button @onclick="ConnectAsync">Connect Wallet</button>
    </NotAuthorized>
</AuthorizeView>
```

The `EthereumAuthenticationStateProvider` implements `IDisposable` and properly unsubscribes from all events on disposal.

For SIWE authentication (which adds a `"SiweAuthenticated"` role with cryptographic proof of address ownership), see [SIWE Authentication](../blazor-dapp-integration/guide-blazor-authentication).

## Event-Driven Architecture

All events on `IEthereumHostProvider` use `Func<T, Task>` delegates rather than `EventHandler`. This means subscribers can perform async work directly:

```csharp
ethereumHostProvider.SelectedAccountChanged += async (address) =>
{
    // Update UI, refresh balances, reload user data
    await LoadBalanceAsync(address);
    await InvokeAsync(StateHasChanged);
};

ethereumHostProvider.NetworkChanged += async (chainId) =>
{
    // Reload chain-specific data (token lists, contract addresses)
    await SwitchChainContextAsync(chainId);
    await InvokeAsync(StateHasChanged);
};
```

### Disposal Pattern

Always unsubscribe from events when your component is disposed to prevent memory leaks and stale callbacks:

```razor
@implements IDisposable
@inject IEthereumHostProvider Provider

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

## From Provider to Wallet SDK

The following diagram shows how provider implementations flow through the selection service, into Blazor authentication, and down into the Wallet SDK:

```
Browser Wallets (IEthereumHostProvider)
├── MetamaskHostProvider
├── EIP6963WalletHostProvider
├── AppKitHostProvider (Reown)
└── NethereumWalletConnectHostProvider
         │
         ▼
SelectedEthereumHostProviderService
    (holds active provider reference)
         │
         ▼
EthereumAuthenticationStateProvider
    (Blazor <AuthorizeView> integration)
         │
         ▼
NethereumWalletHostProvider (IWalletContext)
    (vault-backed provider with RPC interception)
         │
    ┌────┴────┐
    │         │
    ▼         ▼
WalletVault   NethereumWalletInterceptor
(encrypted    (routes eth_sendTransaction,
 accounts)    personal_sign, etc. to
              prompt services)
```

`IWalletContext` extends `IEthereumHostProvider` with wallet-specific capabilities:

```csharp
public interface IWalletContext : IEthereumHostProvider
{
    IReadOnlyList<IWalletAccount> Accounts { get; }
    IWalletAccount? SelectedWalletAccount { get; }
    DappConnectionContext? SelectedDapp { get; set; }

    Task<IWeb3> GetWalletWeb3Async();
    Task<bool> SwitchChainAsync(string chainIdHex);
    Task<string?> ShowTransactionDialogAsync(TransactionInput input);
    Task<string?> RequestPersonalSignAsync(SignaturePromptContext context);
    Task<bool> RequestDappPermissionAsync(DappConnectionContext dappContext, string accountAddress);
    // ... additional wallet operations
}
```

Because `IWalletContext` extends `IEthereumHostProvider`, the wallet provider IS an `IEthereumHostProvider`. DApps running inside the wallet see it as their provider -- they call `GetWeb3Async()` and `SignMessageAsync()` the same way they would with MetaMask or any other provider. The wallet intercepts those calls and routes them through its prompt services (transaction confirmation dialogs, signature approvals, etc.).

## Writing Provider-Agnostic Code

Any code that depends on `IEthereumHostProvider` works identically regardless of which provider is active:

```csharp
@inject IEthereumHostProvider Provider

@code {
    private async Task LoadDataAsync()
    {
        var web3 = await Provider.GetWeb3Async();
        var balance = await web3.Eth.GetBalance.SendRequestAsync(Provider.SelectedAccount);
        var blockNumber = await web3.Eth.Blocks.GetBlockNumber.SendRequestAsync();
    }
}
```

This code works whether the provider is MetaMask, EIP-6963, WalletConnect, Reown, the built-in wallet, or the development provider. The `IWeb3` returned by `GetWeb3Async()` has an `OverridingRequestInterceptor` that routes signing methods to the wallet while passing read-only calls through to the RPC endpoint.

For services and non-UI code, inject `SelectedEthereumHostProviderService` to get the active provider:

```csharp
public class MyService
{
    private readonly SelectedEthereumHostProviderService _hostService;

    public MyService(SelectedEthereumHostProviderService hostService)
    {
        _hostService = hostService;
    }

    public async Task DoSomethingAsync()
    {
        var provider = _hostService.SelectedHost;
        if (provider == null || !provider.Enabled) return;

        var web3 = await provider.GetWeb3Async();
        // Use web3...
    }
}
```

## Cross-Platform Architecture

For Unity projects, use preprocessor directives to select the appropriate provider at compile time:

```csharp
IEthereumHostProvider provider;

#if UNITY_WEBGL && !UNITY_EDITOR
    // In WebGL builds, use the browser wallet
    provider = MetamaskWebglHostProvider.CreateOrGetCurrentInstance();
#else
    // In the editor or standalone builds, use a dev provider
    var devProvider = new NethereumHostProvider();
    await devProvider.SetUrl("http://localhost:8545");
    devProvider.SetSelectedAccount(testPrivateKey);
    provider = devProvider;
#endif

// From here on, identical code regardless of platform
var web3 = await provider.GetWeb3Async();
var balance = await web3.Eth.GetBalance.SendRequestAsync(provider.SelectedAccount);
```

For multi-wallet discovery in Unity WebGL:

```csharp
#if UNITY_WEBGL && !UNITY_EDITOR
    var eip6963Provider = EIP6963WebglHostProvider.CreateOrGetCurrentInstance();
    var wallets = await eip6963Provider.GetAvailableWalletsAsync();
    // Present wallet picker UI
    await eip6963Provider.SelectWalletAsync(selectedWallet.Uuid);
    provider = eip6963Provider;
#endif
```

## Next Steps

- [Connecting Browser Wallets](../blazor-dapp-integration/guide-blazor-wallet-connect) -- step-by-step setup for EIP-6963, MetaMask, and Reown in Blazor
- [SIWE Authentication](../blazor-dapp-integration/guide-blazor-authentication) -- Sign-In with Ethereum with `AuthorizeView` and JWT tokens
- [Wallet SDK Architecture](../wallet-sdk/guide-wallet-architecture) -- Dashboard plugins, screen inventory, registry system
- [Wallet RPC Provider](../wallet-sdk/guide-wallet-rpc-provider) -- How the wallet handles dApp RPC requests
- [Unity Quickstart](../unity/guide-unity-quickstart) -- Getting Nethereum into Unity with WebGL wallet integration
