---
title: "Wallet Architecture"
sidebar_label: "Architecture"
sidebar_position: 15
description: "MVVM architecture layers: Wallet core, UI Components, and platform renderers"
---

# Wallet Architecture

The Wallet SDK uses a three-layer MVVM architecture that separates business logic, presentation logic, and platform rendering.

## Layer Diagram

```
Nethereum.Wallet                         Core: vault, accounts, chain config,
                                         transaction building, RPC, storage
  + Nethereum.Wallet.UI.Components       Shared: ViewModels, validation,
                                         localisation (CommunityToolkit.Mvvm)
    + .Blazor  or  .Maui                 Renderer: MudBlazor or .NET MAUI
```

Each layer only depends on the one below it. Platform renderers never contain business logic -- they bind to ViewModels and forward user actions.

## ViewModels

Every wallet screen has a ViewModel that extends `ObservableObject` from CommunityToolkit.Mvvm. Properties use source generators:

```csharp
public partial class MnemonicAccountCreationViewModel : ObservableObject
{
    [ObservableProperty] private string _mnemonic = string.Empty;
    [ObservableProperty] private string _errorMessage = string.Empty;
    [ObservableProperty] private string _derivedAddress = string.Empty;

    partial void OnMnemonicChanged(string value)
    {
        ValidateAndUpdateAddress();
    }

    [RelayCommand]
    public Task GenerateMnemonicAsync()
    {
        Mnemonic = Bip39.GenerateMnemonic(12);
        return Task.CompletedTask;
    }
}
```

Key patterns:
- `[ObservableProperty]` generates the public property, `PropertyChanged`, and the `On*Changed` partial method hook.
- `[RelayCommand]` generates an `ICommand` for UI binding.
- Field-level validation uses `*Error` properties (e.g. `MnemonicError`). The `IsFormValid` property aggregates all error fields.

## Localisation

All user-facing strings go through `IComponentLocalizer<TViewModel>`. Each ViewModel has a matching Localizer class:

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
        _globalService.RegisterTranslations(_componentName, "en-US",
            new Dictionary<string, string>
            {
                [Keys.DisplayName] = "Mnemonic Wallet",
                [Keys.MnemonicRequired] = "Seed phrase is required",
            });

        _globalService.RegisterTranslations(_componentName, "es-ES",
            new Dictionary<string, string>
            {
                [Keys.DisplayName] = "Billetera Mnemonica",
                [Keys.MnemonicRequired] = "La frase semilla es requerida",
            });
    }
}
```

Usage in a ViewModel:

```csharp
ErrorMessage = _localizer.GetString(MnemonicAccountEditorLocalizer.Keys.MnemonicRequired);
```

## Service Registration

Each feature area exposes an `IServiceCollection` extension. The Blazor renderer registers everything in one call:

```csharp
builder.Services.AddNethereumWalletUI();
```

This registers all ViewModels (`Scoped`), Localizers (`Singleton`), prompt services, dashboard plugins, and MudBlazor services. After building the host, initialise the registries:

```csharp
app.Services.InitializeAccountTypes();
```

This wires up the account creation registry (mapping `MnemonicAccountCreationViewModel` to `MnemonicAccountCreation` component), details registry, and dashboard plugin registry.

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

## Dashboard Plugin System

The wallet dashboard is composed of plugins. Each plugin is a ViewModel registered with the `IComponentRegistry`:

```csharp
componentRegistry.Register<AccountListPluginViewModel, AccountList>();
componentRegistry.Register<SendNativeTokenViewModel, TokenTransfer>();
componentRegistry.Register<HoldingsPluginViewModel, Holdings>();
```

The dashboard resolves all `IDashboardPluginViewModel` instances and renders their associated components, allowing new features to be added without modifying the shell.
