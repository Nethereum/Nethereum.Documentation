---
title: "WebGL Wallet Connection"
sidebar_label: "WebGL Wallets"
sidebar_position: 2
description: "Connect browser wallets in Unity WebGL using EIP-6963 multi-wallet discovery and MetaMask"
---

# WebGL Wallet Connection

After [setting up Nethereum in Unity](guide-unity-quickstart), you'll want to connect browser wallets in WebGL builds. This guide covers discovering all installed wallets via EIP-6963 (the modern approach), falling back to MetaMask directly, handling account and network change events, and getting a `Web3` instance from the connected wallet.

All wallet code in this guide only runs in WebGL builds — use `#if UNITY_WEBGL` conditional compilation to separate WebGL and desktop code paths.

## EIP-6963: Multi-Wallet Discovery (Recommended)

EIP-6963 is the modern standard for discovering browser wallets. Instead of relying on a single `window.ethereum` object (which only works if one wallet is installed), EIP-6963 lets all installed wallets announce themselves. Users choose which wallet to connect.

### Discover and Connect

The core workflow is: create the provider singleton, discover wallets, let the user select one, then enable it:

```csharp
using UnityEngine;
using Nethereum.Unity.EIP6963;
using Nethereum.EIP6963WalletInterop;

public class WalletConnect : MonoBehaviour
{
    private EIP6963WalletHostProvider walletProvider;

    async void Start()
    {
        // Create singleton — initializes browser-side EIP-6963 event listeners
        walletProvider = EIP6963WebglHostProvider.CreateOrGetCurrentInstance();

        // Discover all installed wallets
        var wallets = await walletProvider.GetAvailableWalletsAsync();
        foreach (var wallet in wallets)
            Debug.Log($"Found: {wallet.Name} ({wallet.Rdns})");

        // Select first wallet and connect
        if (wallets.Length > 0)
        {
            await walletProvider.SelectWalletAsync(wallets[0].Uuid);
            var account = await walletProvider.EnableProviderAsync();
            Debug.Log($"Connected: {account}");
        }
    }
}
```

`CreateOrGetCurrentInstance()` is a singleton — calling it multiple times returns the same instance. The constructor calls `EIP6963_InitEIP6963()` in JavaScript, which sets up browser event listeners for `eip6963:announceProvider` events.

### Build a Wallet Selection UI

In a real game, you'd show buttons for each discovered wallet so the user can choose. Each wallet provides a name, icon (as a base64 data URI), UUID, and reverse DNS identifier:

```csharp
public async void ShowWalletButtons()
{
    var wallets = await walletProvider.GetAvailableWalletsAsync();

    for (int i = 0; i < wallets.Length; i++)
    {
        // Create a button for each wallet
        var button = Instantiate(walletButtonPrefab, walletListPanel);
        button.GetComponentInChildren<Text>().text = wallets[i].Name;

        // Wallet icons come as data URIs (data:image/png;base64,...)
        // Convert to Texture2D for display
        Image[] images = button.GetComponentsInChildren<Image>();
        foreach (var image in images)
        {
            if (image.gameObject.name == "Icon")
                ImageHelper.ApplyBase64Image(image, wallets[i].Icon);
        }

        // Capture UUID for the click handler
        string uuid = wallets[i].Uuid;
        button.GetComponent<Button>().onClick.AddListener(
            () => SelectWallet(uuid));
    }
}

async void SelectWallet(string uuid)
{
    await walletProvider.SelectWalletAsync(uuid);
    var account = await walletProvider.EnableProviderAsync();
    Debug.Log($"Connected: {account}");
}
```

`EIP6963WalletInfo` has four properties: `Name` (e.g., "MetaMask"), `Uuid` (unique identifier), `Icon` (base64 data URI), and `Rdns` (reverse DNS like "io.metamask"). SVG icons are not directly supported by Unity's `Image` component — you'll need a conversion helper for those.

### Get Web3 and Use Full API

Once connected, get a `Web3` instance from the wallet provider. This gives you the full Nethereum API — the wallet handles signing:

```csharp
var web3 = await walletProvider.GetWeb3Async();

// All standard web3.Eth.* calls work — wallet signs transactions
var balance = await web3.Eth.GetBalance.SendRequestAsync(
    walletProvider.SelectedAccount);
Debug.Log($"Balance: {Web3.Convert.FromWei(balance.Value)} ETH");

// Transfer ETH
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync("0xRecipient", 0.01m);

// ERC-20 queries
var erc20 = web3.Eth.ERC20.GetContractService(tokenAddress);
var tokenBalance = await erc20.BalanceOfQueryAsync(walletProvider.SelectedAccount);
```

The `Web3` instance routes all signing RPC methods (`eth_sendTransaction`, `personal_sign`, `eth_signTypedData_v4`) through the selected browser wallet. Read-only calls like `eth_call` and `eth_getBalance` go through the wallet's provider.

### Listen to Account and Network Changes

Users can switch accounts or networks in their wallet at any time. The events use `Func<T, Task>` delegates — handlers must return `Task`:

```csharp
void OnEnable()
{
    walletProvider.SelectedAccountChanged += OnAccountChanged;
    walletProvider.NetworkChanged += OnNetworkChanged;
}

void OnDisable()
{
    walletProvider.SelectedAccountChanged -= OnAccountChanged;
    walletProvider.NetworkChanged -= OnNetworkChanged;
}

private Task OnAccountChanged(string newAccount)
{
    Debug.Log($"Account switched: {newAccount}");
    return Task.CompletedTask;
}

private Task OnNetworkChanged(long newChainId)
{
    Debug.Log($"Network switched: {newChainId}");
    return Task.CompletedTask;
}
```

There are also `AvailabilityChanged` and `EnabledChanged` events if you need to react to the wallet becoming unavailable.

## MetaMask Direct (Fallback)

For MetaMask-only support, or as a fallback when EIP-6963 wallets aren't detected, use `MetamaskWebglHostProvider`:

```csharp
using UnityEngine;
using Nethereum.Unity.Metamask;

public class MetamaskConnect : MonoBehaviour
{
    async void Start()
    {
        var metamask = MetamaskWebglHostProvider.CreateOrGetCurrentInstance();
        await metamask.EnableProviderAsync();
        var web3 = await metamask.GetWeb3Async();

        var balance = await web3.Eth.GetBalance.SendRequestAsync(
            metamask.SelectedAccount);
        Debug.Log($"Balance: {balance.Value}");
    }
}
```

Both `MetamaskWebglHostProvider` and `EIP6963WebglHostProvider` implement `IEthereumHostProvider`, so your game logic can work with either through the interface.

### When to Use Which

| Approach | Use When |
|---|---|
| EIP-6963 | Modern multi-wallet support — discovers MetaMask, Rainbow, Coinbase, and any EIP-6963 wallet |
| MetaMask Direct | Legacy support or when you specifically need MetaMask's `window.ethereum` API |
| Both | Discover via EIP-6963 first, fall back to MetaMask if no EIP-6963 wallets found |

## Message Signing

Both providers support personal message signing through the connected wallet:

```csharp
var web3 = await walletProvider.GetWeb3Async();
var signature = await web3.Eth.AccountSigning.PersonalSign
    .SendRequestAsync(new HexUTF8String("Hello from Unity!"));
Debug.Log($"Signature: {signature}");
```

The wallet will show a signing prompt to the user — no private key leaves the browser.

## Next Steps

- [Smart Contracts & ERC-20](guide-unity-smart-contracts) — deploy contracts, transfer tokens, and decode events with either wallet provider or private key
- [Code Generation & Shared Projects](guide-unity-code-generation) — generate typed contract services from Solidity for use in Unity
- [Quickstart](guide-unity-quickstart) — setup and cross-platform architecture recap
