---
title: "Nethereum.HybridWebView"
sidebar_label: "Nethereum.HybridWebView"
sidebar_position: 100
description: ".NET MAUI WebView control with built-in Ethereum provider injection, enabling decentralized applications (dApps) to run in native mobile and desktop applications with wallet functionality."
custom_edit_url: "https://github.com/Nethereum/Nethereum/edit/master/src/Nethereum.HybridWebView/README.md"
format: md
---

# Nethereum.HybridWebView

> **NuGet**: [`Nethereum.HybridWebView`](https://www.nuget.org/packages/Nethereum.HybridWebView/) | **Source**: [`src/Nethereum.HybridWebView/`](https://github.com/Nethereum/Nethereum/tree/master/src/Nethereum.HybridWebView)
# Nethereum.HybridWebView

.NET MAUI WebView control with built-in Ethereum provider injection, enabling decentralized applications (dApps) to run in native mobile and desktop applications with wallet functionality.

## Overview

Nethereum.HybridWebView extends MAUI's WebView to automatically inject a `window.ethereum` provider into web pages, similar to how MetaMask or other wallet browsers work. This allows existing Ethereum dApps to interact with your .NET wallet implementation through standard EIP-1193 and EIP-6963 APIs without requiring any dApp-side code changes.

**Key Features:**
- Automatic `window.ethereum` provider injection into all loaded pages
- EIP-1193 provider API (`eth_requestAccounts`, `eth_sendTransaction`, `personal_sign`, etc.)
- EIP-6963 multi-wallet discovery support (`eip6963:announceProvider`)
- JavaScript ↔ .NET bridge for RPC request handling
- dApp permission management (origin-based account authorization)
- Account and network change event emission
- `window.open()` interception for handling external links
- MAUI SecureStorage integration for wallet vault
- Cross-platform support (Android, iOS, Windows, macOS)

**Use Cases:**
- Build mobile Ethereum wallet apps with dApp browsing capability
- Create desktop dApp browsers with built-in wallet
- Embed dApps in native applications
- Provide in-app Ethereum functionality to web content

## Installation

**Note:** This package is currently intended for internal Nethereum use and advanced scenarios. For standard MAUI Blazor wallet integration, use `Nethereum.Wallet.UI.Components.Maui`.

Add the package reference to your MAUI project:

```xml
<ItemGroup>
  <ProjectReference Include="..\Nethereum.HybridWebView\Nethereum.HybridWebView.csproj" />
</ItemGroup>
```

## Dependencies

**Package References:**
- Microsoft.Maui.Controls (version defined by $(MauiVersion))

**Project References:**
- Nethereum.Hex
- Nethereum.RPC
- Nethereum.Wallet
- Nethereum.Web3
- Nethereum.Wallet.RpcRequests

**Target Frameworks:**
- net9.0-android
- net9.0-ios
- net9.0-maccatalyst
- net9.0-windows10.0.19041.0 (when building on Windows)

**Platform Requirements:**
- Android: API 21+
- iOS: 15.0+
- macCatalyst: 15.0+
- Windows: 10.0.17763.0+

## Architecture

```
┌─────────────────────────────────────────────┐
│  Web Page (dApp)                             │
│  Uses window.ethereum.request({...})        │
└─────────────────────────────────────────────┘
                    │
                    │ JavaScript
                    ▼
┌─────────────────────────────────────────────┐
│  Injected JavaScript Bridge                  │
│  - window.ethereum (EIP-1193)               │
│  - EIP-6963 announceProvider                │
│  - HybridWebView.SendInvokeMessageToDotNet  │
└─────────────────────────────────────────────┘
                    │
                    │ JavaScript Interop
                    ▼
┌─────────────────────────────────────────────┐
│  NethereumJSInvokeTarget (.NET)              │
│  - Handles RPC requests                     │
│  - Manages dApp permissions                 │
│  - Emits accountsChanged/chainChanged       │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  IWalletContext + RpcHandlerRegistry        │
│  - WalletAccount (private keys)             │
│  - DappPermissions                          │
│  - RPC client (for eth_call, etc.)          │
└─────────────────────────────────────────────┘
```

## Quick Start

### 1. Create NethereumHybridWebView

```csharp
using Nethereum.HybridWebView;
using Nethereum.Wallet.Hosting;
using Nethereum.Wallet.UI;

// Setup wallet context and RPC handlers
var walletContext = new NethereumWalletHostProvider();
var rpcHandlerRegistry = new RpcHandlerRegistry();

// Create hybrid WebView
var hybridWebView = new NethereumHybridWebView(
    walletContext,
    rpcHandlerRegistry
);

// Navigate to a dApp
hybridWebView.Source = "https://app.uniswap.org";
```

**From:** `src/Nethereum.HybridWebView/NethereumHybridWebView.cs:7`

### 2. Handle Account Selection

```csharp
// When user selects account in your wallet UI
await hybridWebView.SetSelectedAccountAsync("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb");

// This will emit accountsChanged event to the dApp:
// window.ethereum.emit('accountsChanged', ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'])
```

**From:** `src/Nethereum.HybridWebView/NethereumHybridWebView.cs:31`

### 3. Listen to Window Open Events

```csharp
hybridWebView.WindowOpenRequested += (sender, args) =>
{
    // dApp called window.open(url, target) or clicked <a target="_blank">
    var url = args.Url;
    var target = args.Target;

    // Handle in your app (open new tab, external browser, etc.)
    Launcher.OpenAsync(url);
};
```

**From:** `src/Nethereum.HybridWebView/HybridBrowserWebView.cs:11`

## Injected JavaScript Provider

When a page loads, Nethereum.HybridWebView automatically injects:

### window.ethereum (EIP-1193 Provider)

```javascript
// Standard Ethereum provider API
const accounts = await window.ethereum.request({
  method: 'eth_requestAccounts'
});

const balance = await window.ethereum.request({
  method: 'eth_getBalance',
  params: [accounts[0], 'latest']
});

const txHash = await window.ethereum.request({
  method: 'eth_sendTransaction',
  params: [{
    from: accounts[0],
    to: '0x...',
    value: '0x9184e72a'
  }]
});

// Listen to events
window.ethereum.on('accountsChanged', (accounts) => {
  console.log('Account changed:', accounts[0]);
});

window.ethereum.on('chainChanged', (chainId) => {
  console.log('Network changed:', chainId);
});
```

**From:** `src/Nethereum.HybridWebView/HybridNethereumProviderJs.cs:12`

### EIP-6963 Multi-Wallet Discovery

```javascript
// dApps can discover Nethereum provider via EIP-6963
window.addEventListener('eip6963:announceProvider', (event) => {
  const provider = event.detail;
  console.log(provider.info.name); // "Nethereum"
  console.log(provider.info.uuid); // "8d9ccb56-3946-419e-ad37-f0a00a6c671a"
  console.log(provider.info.rdns); // "com.nethereum"
});

// Request all providers
window.dispatchEvent(new Event('eip6963:requestProvider'));
```

**From:** `src/Nethereum.HybridWebView/HybridNethereumProviderJs.cs:13`

## dApp Permission Management

Nethereum.HybridWebView implements origin-based permission management to protect user privacy:

### Permission Flow

```
1. dApp calls window.ethereum.request({ method: 'eth_requestAccounts' })
2. NethereumHybridWebView extracts origin (e.g., https://app.uniswap.org)
3. Checks if origin is approved: await walletContext.DappPermissions.IsApprovedAsync(origin, account)
4. If not approved: await walletContext.RequestDappPermissionAsync(dappContext, account)
5. If approved: emits accountsChanged with account address
6. If rejected: emits accountsChanged with empty array
```

**From:** `src/Nethereum.HybridWebView/NethereumJSInvokeTarget.cs:117`

### Permission Storage

Implement `IDappPermissions` in your wallet context:

```csharp
public class MyDappPermissions : IDappPermissions
{
    public Task<bool> IsApprovedAsync(string origin, string account)
    {
        // Check if origin is approved for account
        // Return true if user previously granted permission
    }

    public Task ApproveAsync(string origin, string account)
    {
        // Save approval to secure storage
    }

    public Task RevokeAsync(string origin, string account)
    {
        // Remove approval
    }
}
```

### Automatic Account Hiding

When navigating to a new origin:
- If not previously approved → account is hidden (empty accountsChanged event)
- dApp must call `eth_requestAccounts` to trigger permission prompt
- User approves → account is revealed to dApp

This prevents dApps from tracking users across different sites.

**From:** `src/Nethereum.HybridWebView/NethereumJSInvokeTarget.cs:46`

## Supported RPC Methods

### Wallet-Specific Methods (Handled by RpcHandlerRegistry)

These methods can be handled by custom `IRpcMethodHandler` implementations:

- `eth_requestAccounts` - Request account access (triggers permission prompt)
- `eth_accounts` - Get authorized accounts
- `eth_sendTransaction` - Sign and send transaction
- `personal_sign` - Sign personal message
- `eth_signTypedData_v4` - Sign EIP-712 typed data
- `wallet_switchEthereumChain` - Switch network
- `wallet_addEthereumChain` - Add custom network

**Register custom handlers:**

```csharp
var rpcHandlerRegistry = new RpcHandlerRegistry();

rpcHandlerRegistry.RegisterHandler(
    "eth_sendTransaction",
    new MyTransactionHandler()
);
```

**From:** `src/Nethereum.HybridWebView/NethereumJSInvokeTarget.cs:246`

### Standard Ethereum RPC Methods (Forwarded to Node)

Methods not handled by custom handlers are forwarded to the Ethereum node RPC client:

- `eth_chainId`
- `eth_blockNumber`
- `eth_getBalance`
- `eth_call`
- `eth_estimateGas`
- `eth_getTransactionReceipt`
- `eth_getTransactionByHash`
- `eth_getLogs`
- ... (all standard JSON-RPC methods)

**Node RPC client:**

```csharp
walletContext.GetRpcClientAsync() // Returns IClient for node communication
```

**From:** `src/Nethereum.HybridWebView/NethereumJSInvokeTarget.cs:252`

## Secure Wallet Storage

### SecureStorageWalletVaultService

Nethereum.HybridWebView includes a MAUI SecureStorage-based wallet vault:

```csharp
using Nethereum.HybridWebView;
using Nethereum.Wallet;

var vaultService = new SecureStorageWalletVaultService();

// Create new vault
await vaultService.CreateWalletAsync("myPassword", "mySecretWords");

// Check if vault exists
bool exists = await vaultService.VaultExistsAsync();

// Unlock vault
var wallet = await vaultService.OpenWalletAsync("myPassword");

// Get accounts
var accounts = wallet.GetAccounts();
```

**Platform Storage:**
- **Android**: Android KeyStore
- **iOS**: iOS Keychain
- **macOS**: macOS Keychain
- **Windows**: Data Protection API (DPAPI)

**From:** `src/Nethereum.HybridWebView/SecureStorageWalletVaultService.cs:7`

## Event Handling

### Account Changed

Automatically emitted when:
- `SetSelectedAccountAsync()` is called
- Wallet account changes in `IWalletContext`
- dApp permission is granted/revoked

```csharp
walletContext.SelectedAccountChanged += async (account) =>
{
    Console.WriteLine($"Account changed to: {account}");
};
```

**Emits to dApp:**
```javascript
window.ethereum.emit('accountsChanged', ['0x...']);
```

**From:** `src/Nethereum.HybridWebView/NethereumJSInvokeTarget.cs:299`

### Network Changed

Automatically emitted when chain ID changes in `IWalletContext`:

```csharp
walletContext.NetworkChanged += async (chainId) =>
{
    Console.WriteLine($"Network changed to: {chainId}");
};
```

**Emits to dApp:**
```javascript
window.ethereum.emit('chainChanged', '0x1'); // Hex chain ID
window.ethereum.emit('networkChanged', 1);    // Decimal chain ID
```

**From:** `src/Nethereum.HybridWebView/NethereumJSInvokeTarget.cs:304`

### Connect Event

Emitted once when account and chainId are both available:

```javascript
window.ethereum.on('connect', (connectInfo) => {
  console.log('Connected to chain:', connectInfo.chainId);
});
```

**From:** `src/Nethereum.HybridWebView/NethereumJSInvokeTarget.cs:178`

## Window Open Interception

Nethereum.HybridWebView intercepts `window.open()` calls and `<a target="_blank">` clicks:

```csharp
hybridWebView.WindowOpenRequested += async (sender, args) =>
{
    var url = args.Url;
    var target = args.Target;

    // Handle based on your app logic:

    // Option 1: Open in system browser
    await Launcher.OpenAsync(url);

    // Option 2: Open in new WebView tab
    OpenNewTab(url);

    // Option 3: Navigate current WebView
    hybridWebView.Source = url;
};
```

**Intercepted JavaScript:**
```javascript
// These are intercepted:
window.open('https://example.com');
<a href="https://example.com" target="_blank">Link</a>

// These are NOT intercepted:
<a href="https://example.com">Same tab link</a>
window.location.href = 'https://example.com';
```

**From:** `src/Nethereum.HybridWebView/HybridNethereumProviderJs.cs:16`

## RPC Request Debugging

Enable debug logging to see all RPC requests:

```csharp
// In NethereumJSInvokeTarget.cs, _enableDebugLogging is set to true by default

// Logs format:
// [HybridWebView][RPC] origin=https://app.uniswap.org id=1 method=eth_requestAccounts -> ["0x..."]
// [HybridWebView][RPC] origin=https://app.uniswap.org id=2 method=eth_chainId -> 0x1
```

**From:** `src/Nethereum.HybridWebView/NethereumJSInvokeTarget.cs:24`

## Example: Complete Wallet Integration

```csharp
using Microsoft.Maui.Controls;
using Nethereum.HybridWebView;
using Nethereum.Wallet.Hosting;
using Nethereum.Wallet.UI;
using Nethereum.RPC.Eth.DTOs;

public class DappBrowserPage : ContentPage
{
    private NethereumHybridWebView _webView;
    private IWalletContext _walletContext;

    public DappBrowserPage()
    {
        // Initialize wallet context
        _walletContext = new NethereumWalletHostProvider();

        // Setup RPC handlers
        var rpcHandlerRegistry = new RpcHandlerRegistry();

        // Create hybrid WebView
        _webView = new NethereumHybridWebView(_walletContext, rpcHandlerRegistry);
        _webView.Source = "https://app.uniswap.org";

        // Handle window.open
        _webView.WindowOpenRequested += async (sender, args) =>
        {
            await Launcher.OpenAsync(args.Url);
        };

        // Listen to wallet events
        _walletContext.SelectedAccountChanged += OnAccountChanged;
        _walletContext.NetworkChanged += OnNetworkChanged;

        Content = _webView;
    }

    private async Task OnAccountChanged(string account)
    {
        // Update UI
        await _webView.SetSelectedAccountAsync(account);
    }

    private async Task OnNetworkChanged(long chainId)
    {
        // Network switched in wallet
        // HybridWebView automatically emits chainChanged to dApp
    }
}
```

## Differences from Browser Wallets

| Feature | Browser Extension | Nethereum.HybridWebView |
|---------|------------------|------------------------|
| Permission Model | Origin-based | Origin-based |
| Account Exposure | Hidden by default | Hidden by default |
| EIP-1193 Support | ✅ | ✅ |
| EIP-6963 Support | ✅ | ✅ |
| Window Persistence | Survives page reload | Resets on navigation |
| Multiple Windows | Shared provider state | Isolated per WebView |
| Browser Tabs | Multiple tabs share wallet | Each WebView is isolated |

## Limitations

1. **No Browser Extension APIs**: `chrome.runtime`, `browser.storage` are not available
2. **Single WebView Instance**: Each WebView has isolated provider state
3. **No ServiceWorker Support**: Limited by MAUI WebView capabilities
4. **Platform-Specific Quirks**: JavaScript bridge behavior varies across Android/iOS/Windows
5. **No Multi-Account Simultaneous Exposure**: Only one account per origin at a time

## Troubleshooting

### window.ethereum is undefined

**Issue:** dApp cannot find `window.ethereum`.

**Solution:** Ensure navigation completed successfully:
```csharp
_webView.Navigated += async (sender, args) =>
{
    if (args.Result == WebNavigationResult.Success)
    {
        // Provider injection happens here
    }
};
```

### RPC Calls Not Reaching .NET

**Issue:** JavaScript calls don't trigger .NET handlers.

**Solution:** Verify JavaScript bridge is working:
```csharp
// Enable debug logging
_enableDebugLogging = true;

// Check console output for:
// [HybridWebView][RPC] ...
```

### Permissions Not Persisting

**Issue:** dApp requests permission every time.

**Solution:** Implement `IDappPermissions` with persistent storage:
```csharp
public class MyDappPermissions : IDappPermissions
{
    public async Task<bool> IsApprovedAsync(string origin, string account)
    {
        // Load from Preferences or SecureStorage
        var key = $"dapp_perm_{origin}_{account}";
        return Preferences.Get(key, false);
    }

    public async Task ApproveAsync(string origin, string account)
    {
        var key = $"dapp_perm_{origin}_{account}";
        Preferences.Set(key, true);
    }
}
```

### Account Not Updating in dApp

**Issue:** Called `SetSelectedAccountAsync()` but dApp still shows old account.

**Solution:** Check origin permissions:
```csharp
// Account is only exposed if origin is approved
var origin = ExtractOriginFromUrl(_webView.Source.ToString());
var isApproved = await _walletContext.DappPermissions.IsApprovedAsync(origin, newAccount);

if (!isApproved)
{
    // Account is hidden from dApp until user approves
}
```

## Related Packages

- **Nethereum.Wallet** - Core wallet functionality (WalletAccount, WalletVault)
- **Nethereum.Wallet.UI.Components.Maui** - Pre-built MAUI wallet UI components
- **Nethereum.Wallet.Hosting** - IWalletContext and hosting abstractions
- **Nethereum.Wallet.RpcRequests** - RPC request handler registry
- **Nethereum.Web3** - Web3 API for Ethereum interactions

## Additional Resources

- [EIP-1193: Ethereum Provider JavaScript API](https://eips.ethereum.org/EIPS/eip-1193)
- [EIP-6963: Multi Injected Provider Discovery](https://eips.ethereum.org/EIPS/eip-6963)
- [.NET MAUI Documentation](https://learn.microsoft.com/en-us/dotnet/maui/)
- [MAUI WebView](https://learn.microsoft.com/en-us/dotnet/maui/user-interface/controls/webview)
- [Nethereum Documentation](http://docs.nethereum.com)

## License

MIT License - see LICENSE file for details
