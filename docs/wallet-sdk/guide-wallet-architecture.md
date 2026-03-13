---
title: "Wallet Architecture"
sidebar_label: "Architecture"
sidebar_position: 15
description: "MVVM architecture, dashboard plugins, registry system, and complete screen inventory"
---

# Wallet Architecture

## Three-Layer MVVM

```
Nethereum.Wallet                         Core: vault, accounts, chain config,
                                         transaction building, RPC, storage
  + Nethereum.Wallet.UI.Components       Shared: ViewModels, validation,
                                         localisation (CommunityToolkit.Mvvm)
    + .Blazor  or  .Maui                 Renderer: MudBlazor or .NET MAUI
```

Each layer only depends on the one below it. Platform renderers never contain business logic — they bind to ViewModels and forward user actions.

## ViewModel Pattern

Every wallet screen has a ViewModel extending `ObservableObject`:

```csharp
public partial class MnemonicAccountCreationViewModel : ObservableObject
{
    [ObservableProperty] private string _mnemonic = string.Empty;
    [ObservableProperty] private string? _mnemonicError;
    [ObservableProperty] private string _derivedAddress = string.Empty;
    [ObservableProperty] private bool _isRevealed;
    [ObservableProperty] private bool _isBackedUp;

    partial void OnMnemonicChanged(string value) => ValidateAndUpdateAddress();

    [RelayCommand]
    public Task GenerateMnemonicAsync()
    {
        Mnemonic = Bip39.GenerateMnemonic(12);
        return Task.CompletedTask;
    }

    public bool IsFormValid => string.IsNullOrEmpty(MnemonicError)
        && !string.IsNullOrWhiteSpace(Mnemonic);
}
```

Key patterns:
- `[ObservableProperty]` generates public property + PropertyChanged + `On*Changed` partial hook
- `[RelayCommand]` generates ICommand
- Field-level validation via `*Error` properties
- `IsFormValid` aggregates all error fields

## Localisation

All user-facing strings go through `IComponentLocalizer<TViewModel>`. Each ViewModel has a matching Localizer:

```csharp
public class MnemonicAccountEditorLocalizer
    : ComponentLocalizerBase<MnemonicAccountCreationViewModel>
{
    public static class Keys
    {
        public const string DisplayName = "DisplayName";
        public const string MnemonicRequired = "MnemonicRequired";
    }

    protected override void RegisterTranslations()
    {
        _globalService.RegisterTranslations(_componentName, "en-US", new Dictionary<string, string>
        {
            [Keys.DisplayName] = "Mnemonic Wallet",
            [Keys.MnemonicRequired] = "Seed phrase is required",
        });
        _globalService.RegisterTranslations(_componentName, "es-ES", new Dictionary<string, string>
        {
            [Keys.DisplayName] = "Billetera Mnemónica",
            [Keys.MnemonicRequired] = "La frase semilla es requerida",
        });
    }
}
```

## Service Registration

One call registers everything:

```csharp
builder.Services.AddNethereumWalletUI();
```

After building the host, initialise registries:

```csharp
app.Services.InitializeAccountTypes();
```

This wires up account creation, details, dashboard plugins, and component registries.

## Complete Screen Inventory

### Account Creation Screens

All account creation ViewModels implement `IAccountCreationViewModel` and are registered with `IAccountCreationRegistry`.

| ViewModel | Icon | Sort | Purpose |
|-----------|------|------|---------|
| `MnemonicAccountCreationViewModel` | vpn_key | 1 | Generate or import 12/24-word BIP39 seed phrases |
| `PrivateKeyAccountCreationViewModel` | key | 2 | Import raw private keys (hex, with/without 0x) |
| `ViewOnlyAccountCreationViewModel` | visibility | 3 | Watch addresses without signing capability |
| `SmartContractAccountCreationViewModel` | smart_toy | 4 | Add smart contract wallet addresses (multisig, AA) |

**MnemonicAccountCreationViewModel** — The most feature-rich creation screen:
- Generate 12 or 24-word mnemonics (`GenerateMnemonicAsync`, `GenerateMnemonic24Async`)
- Import existing mnemonics with validation
- Optional passphrase support (`MnemonicPassphrase`)
- Real-time address derivation preview (`DerivedAddress`)
- Reveal/hide toggle for seed phrase (`IsRevealed`, `ToggleRevealAsync`)
- Backup confirmation step (`IsBackedUp`, `ConfirmBackupAsync`)
- Switch between generate and import modes (`IsGenerateMode`)
- Copy to clipboard (`CopyMnemonicToClipboardAsync`, `CopyAddressToClipboardAsync`)
- Label assignment (`MnemonicLabel`)

**PrivateKeyAccountCreationViewModel**:
- Private key input with format detection (`PrivateKeyFormat`)
- Reveal/hide toggle for sensitive data
- Automatic address derivation from key
- Label assignment

**ViewOnlyAccountCreationViewModel**:
- Ethereum address input with checksum validation
- Label assignment
- Cannot sign — `GetAccountAsync()` throws

**SmartContractAccountCreationViewModel**:
- Contract address input
- Label assignment
- For multisig wallets, AA contracts, proxy wallets

### Account Detail Screens

All detail ViewModels implement `IAccountDetailsViewModel` and are registered with `IAccountDetailsRegistry`.

| ViewModel | Purpose |
|-----------|---------|
| `MnemonicAccountDetailsViewModel` | Manage mnemonic accounts: rename, reveal private key, show derivation path, remove |
| `PrivateKeyAccountDetailsViewModel` | Manage imported key accounts |
| `ViewOnlyAccountDetailsViewModel` | Manage watch-only accounts |
| `SmartContractAccountMetadataViewModel` | View smart contract account info |

**MnemonicAccountDetailsViewModel** features:
- Edit account name inline (`StartEditAccountNameAsync`, `SaveAccountNameAsync`, `CancelEditAccountNameAsync`)
- Reveal derived private key with confirmation (`RevealPrivateKeyAsync`, `ShowRevealedPrivateKey`)
- Display derivation path, account index, parent mnemonic name
- Remove account from vault (`RemoveAccountAsync`)

### Account List & Group Screens

| ViewModel | Purpose |
|-----------|---------|
| `AccountListPluginViewModel` | Dashboard plugin showing all accounts (PluginId: "account-list", SortOrder: 1) |
| `AccountListViewModel` | Full account list with filtering and selection |
| `AccountGroupViewModel` | Group accounts by mnemonic seed |
| `MnemonicListViewModel` | List all mnemonics in vault |
| `VaultMnemonicAccountViewModel` | Individual mnemonic display with derived accounts |
| `MnemonicDetailsViewModel` | Show mnemonic info and all derived accounts |
| `MnemonicAccountEditorViewModel` | Editor for mnemonic vault entries |

### Dashboard & Plugin System

The wallet dashboard is composed of plugins. Each plugin implements `IDashboardPluginViewModel`:

| ViewModel | PluginId | Sort | Icon | Purpose |
|-----------|----------|------|------|---------|
| `WalletOverviewPluginViewModel` | wallet-overview | 0 | dashboard | Main wallet summary |
| `PromptsPluginViewModel` | Prompts | -1 | Notifications | Pending dApp approval requests |
| `AccountListPluginViewModel` | account-list | 1 | account_circle | Account list |
| `HoldingsPluginViewModel` | holdings | 15 | account_balance_wallet | Token portfolio |
| `NetworkManagementPluginViewModel` | network_management | 20 | language | Network management |
| `ContactListPluginViewModel` | contacts | 50 | contacts | Saved addresses |
| `TokenTransferPluginViewModel` | (transfer) | — | — | Quick token transfer |
| `CreateAccountPluginViewModel` | (create) | — | — | Account creation wizard |

Plugins are registered with `IDashboardPluginRegistry`:

```csharp
componentRegistry.Register<AccountListPluginViewModel, AccountList>();
componentRegistry.Register<HoldingsPluginViewModel, Holdings>();
componentRegistry.Register<NetworkManagementPluginViewModel, NetworkManagement>();
componentRegistry.Register<PromptsPluginViewModel, Prompts>();
```

The dashboard resolves all `IDashboardPluginViewModel` instances and renders their associated components. New features can be added without modifying the shell.

**WalletDashboardViewModel** — The main dashboard orchestrator:
- Properties: `SelectedAccount`, `SelectedAccountIndex`, `SelectedNetworkName`, `SelectedNetworkLogoPath`, `SelectedChainId`
- Manages current account display, formatted address, network indicator

**PromptsPluginViewModel** — dApp interaction queue:
- `CurrentPrompt`, `CurrentIndex`, `TotalCount` — tracks pending requests
- `ApproveCurrentPromptAsync`, `RejectCurrentPromptAsync`, `RejectAllPromptsAsync` — user actions
- `QueueStatusText`, `IsEmpty`, `IsProcessing` — queue state
- SortOrder: -1 (always appears first when there are pending prompts)

### Transaction Screens

| ViewModel | Purpose |
|-----------|---------|
| `SendNativeTokenViewModel` | Multi-step send wizard (token/chain/account selection, amount, gas, confirm) |
| `TransactionViewModel` | Core transaction building, gas estimation, EVM simulation |
| `DAppTransactionPromptViewModel` | Approve/reject dApp transaction requests |
| `TransactionStatusViewModel` | Monitor confirmation, display explorer link |
| `TransactionHistoryViewModel` | Pending and confirmed transactions with filtering |

**SendNativeTokenViewModel** — Multi-step wizard:
- Step 1: Select chain, account, token, recipient, amount
- Step 2: Gas configuration and nonce
- Step 3: Confirmation and send
- Properties: `CurrentStep`, `TotalSteps`, `AvailableChains`, `SelectedChain`, `AvailableAccounts`, `SelectedAccount`, `AvailableTokens`, `SelectedToken`, `TokenPrice`, `CurrencySymbol`
- Commands: `NextStepAsync`, `PreviousStep`, `SetMaxAmount`, `SendTransactionAsync`, `SimulateTransactionAsync`, `AddCustomTokenAsync`, `SearchTokensAsync`

**TransactionViewModel** — Gas and execution:
- Gas strategies: `GasStrategies`, `SelectMultiplierAsync`, `EnableCustomModeAsync`, `ToggleGasModeAsync`
- EVM simulation: `SimulateTransactionAsync`, `PreviewStateChangesAsync`, `SimulationResult`, `StateChangesPreview`
- Data decoding: `DecodeTransactionDataAsync`, `DecodedData`, `ShowRawData`
- Cost calculation: `GetTotalGasCost()`, `GetTotalTransactionCost()`, `FormatCurrency()`
- Gas buffer: `GasBufferPercentage` for safety margin

**DAppTransactionPromptViewModel** — dApp approval:
- Multi-step review: `CurrentStep`, `NextStep`, `PreviousStep`
- Approve flow: `ApproveAndSendTransactionAsync`
- Reject: `RejectTransaction`, `CancelWithError`
- Retry on failure: `RetryTransactionAsync`, `ShowRetry`
- Data: `PromptInfo`, `Transaction`, `TransactionStatus`, `TransactionHash`

**TransactionStatusViewModel** — Post-send monitoring:
- 3-second polling timer for receipt
- Properties: `TransactionHash`, `IsSuccess`, `ConfirmationCount`, `GasUsed`, `ActualCost`, `ExplorerUrl`
- Commands: `StartMonitoring`, `ViewTransactionAsync`, `NavigateToHistoryAsync`, `NewTransactionAsync`

**TransactionHistoryViewModel** — History list:
- `PendingTransactions`, `RecentTransactions` with filtering
- `RetryTransactionAsync`, `RequestCopyHash`, `RequestViewOnExplorerAsync`
- Filter: `FilterText`, `FilteredPendingTransactions`, `FilteredRecentTransactions`

### Network Management Screens

| ViewModel | Purpose |
|-----------|---------|
| `NetworkListViewModel` | Browse, search, filter, and add networks |
| `NetworkDetailsViewModel` | View/edit network RPC, explorer, chain info |
| `AddCustomNetworkViewModel` | Add custom network with RPC validation |

**NetworkListViewModel**:
- Browse configured networks with `ShowTestnets` toggle
- Search Chainlist: `ChainlistResults`, `IsChainlistLoading`, `AddChainlistNetworkAsync`
- Internal suggestions: `InternalSuggestions`, `AddInternalNetworkAsync`
- Sub-ViewModels: `NetworkItemViewModel` (wraps ChainFeature), `ChainlistNetworkResult`

### Holdings & Portfolio Screens

| ViewModel | Purpose |
|-----------|---------|
| `HoldingsViewModel` | Multi-tab portfolio tracker (Accounts/Networks/Tokens) |
| `EditHoldingsViewModel` | Select accounts/networks to track |
| `HoldingsAccountItemViewModel` | Individual account in holdings |
| `HoldingsNetworkItemViewModel` | Individual network in holdings with scan progress |
| `HoldingsTokenItemViewModel` | Token aggregated across chains/accounts |
| `TokenSettingsViewModel` | Currency, refresh interval, auto-refresh |
| `AddCustomTokenViewModel` | Add ERC-20 by contract address with metadata fetch |
| `TokenListViewModel` | Token list for selected account/network |

**HoldingsViewModel** — Multi-tab portfolio:
- Tabs: Accounts, Networks, Tokens
- Scanning: `ScanAsync` (blockchain token discovery), `CancelScan`
- Refresh: `RefreshAsync` (last 100 blocks), `RefreshPricesAsync`
- Totals: `TotalValue`, `Currency`, `CurrencySymbol`, `LastUpdated`
- Edit mode: `ShowEditPage`, `ApplySettingsAsync`

**HoldingsTokenItemViewModel** — Per-token aggregation:
- Contains `ChainBalanceItemViewModel` (per-chain breakdown)
- Contains `AccountBalanceItemViewModel` (per-account breakdown)
- Properties: `Symbol`, `Name`, `LogoUri`, `TotalBalance`, `TotalValue`, `Price`

### Prompt/dApp Interaction Screens

| ViewModel | Purpose |
|-----------|---------|
| `DAppSignaturePromptViewModel` | Approve personal_sign and eth_signTypedData_v4 requests |
| `DAppPermissionPromptViewModel` | Approve dApp connection (wallet_requestPermissions) |
| `DAppTransactionPromptViewModel` | Approve eth_sendTransaction requests |

**DAppSignaturePromptViewModel**:
- Displays message to sign with decoded preview
- EIP-712 support: `TypedDataDomainHash`, `TypedDataMessageHash`, `TypedDataHash`, `HasTypedDataHashes`
- Commands: `SignAsync`
- State: `IsSigning`, `ErrorMessage`, `SignaturePreview`

### Settings & Contacts

| ViewModel | Purpose |
|-----------|---------|
| `TokenSettingsViewModel` | Currency selection, auto-refresh settings |
| `ContactListViewModel` | Manage saved addresses |
| `ContactListPluginViewModel` | Dashboard plugin for contacts |

### Top-Level Wallet

| ViewModel | Purpose |
|-----------|---------|
| `NethereumWalletViewModel` | Application-level state and navigation |
| `WalletDashboardViewModel` | Dashboard orchestrator |
| `NotificationBadgeViewModel` | Notification count badges |

## Registry System

The wallet uses four registries to map ViewModels to UI components:

### IAccountCreationRegistry
Maps account types to creation ViewModels and Blazor components:
```csharp
registry.Register<MnemonicAccountCreationViewModel, MnemonicAccountCreation>();
registry.Register<PrivateKeyAccountCreationViewModel, PrivateKeyAccountCreation>();
registry.Register<ViewOnlyAccountCreationViewModel, ViewOnlyAccountCreation>();
registry.Register<SmartContractAccountCreationViewModel, SmartContractAccountCreation>();
```

### IAccountDetailsRegistry
Maps account types to detail ViewModels:
```csharp
registry.Register<MnemonicAccountDetailsViewModel, MnemonicAccountDetails>();
```

### IDashboardPluginRegistry
Maps plugin IDs to ViewModels and components. Plugins are sorted by `SortOrder` and rendered in the dashboard.

### IAccountTypeMetadataRegistry
Maps account type strings to metadata ViewModels for display.

### IComponentRegistry
Core registry that underlies all others — a generic `Register<TViewModel, TComponent>()` mapping.

## Adding a New Wallet Screen

1. Create a ViewModel in `Nethereum.Wallet.UI.Components/YourFeature/`:

```csharp
public partial class MyFeatureViewModel : ObservableObject
{
    [ObservableProperty] private string _inputField = "";
    [ObservableProperty] private string? _inputFieldError;

    public bool IsFormValid => string.IsNullOrEmpty(InputFieldError);
}
```

2. Create a Localizer in the same folder.

3. Create a Blazor component in `Nethereum.Wallet.UI.Components.Blazor/YourFeature/`:

```razor
@inject MyFeatureViewModel ViewModel
@inject IComponentLocalizer<MyFeatureViewModel> Localizer

<MudTextField @bind-Value="ViewModel.InputField"
              Label="@Localizer.GetString(Keys.InputLabel)"
              Error="@(!string.IsNullOrEmpty(ViewModel.InputFieldError))"
              ErrorText="@ViewModel.InputFieldError" />
```

4. Register in `ServiceCollectionExtensions`:

```csharp
services.AddScoped<MyFeatureViewModel>();
services.TryAddSingleton<IComponentLocalizer<MyFeatureViewModel>, MyFeatureLocalizer>();
```

5. To add as a dashboard plugin, implement `IDashboardPluginViewModel` and register with the plugin registry.

## Next Steps

- [Accounts & Vault](guide-wallet-accounts) — Account types, vault encryption, mnemonic derivation
- [Transactions](guide-wallet-transactions) — Send flow, gas strategies, EVM simulation
- [Wallet RPC Provider](guide-wallet-rpc-provider) — How the wallet handles dApp RPC requests
- [Host Provider Pattern](../wallet-connectivity/guide-host-providers) — The IEthereumHostProvider abstraction
