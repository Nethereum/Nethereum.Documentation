---
title: "Wallet RPC Provider"
sidebar_label: "RPC Provider"
sidebar_position: 30
description: "EIP-1193 JSON-RPC handler system for dApp communication, transaction approval, and signature requests"
---

# Wallet RPC Provider

The Nethereum Wallet acts as an EIP-1193 provider for dApps. When a dApp calls `eth_sendTransaction`, `personal_sign`, or `wallet_switchEthereumChain`, the wallet intercepts these requests, shows approval dialogs, signs with vault keys, and returns responses — just like MetaMask or any browser wallet.

## Architecture

```
dApp (via Web3)
    │
    ▼
Web3.Client.SendRequestAsync()
    │
    ▼
NethereumWalletInterceptor (RequestInterceptor)
    │ checks InterceptedMethods list
    ▼
RpcHandlerRegistry.TryGetHandler(method)
    │ dispatches to handler
    ▼
IRpcMethodHandler.HandleAsync(request, context)
    │ uses IWalletContext for wallet state + prompts
    ▼
Prompt Service (UI dialog) → User approves/rejects
    │
    ▼
RpcResponseMessage returned to dApp
```

## IWalletContext

`IWalletContext` extends `IEthereumHostProvider` with wallet-specific capabilities. RPC handlers receive it to access accounts, sign transactions, and show prompts:

```csharp
public interface IWalletContext : IEthereumHostProvider
{
    IReadOnlyList<IWalletAccount> Accounts { get; }
    IWalletAccount? SelectedWalletAccount { get; }
    DappConnectionContext? SelectedDapp { get; set; }
    IDappPermissionService DappPermissions { get; }
    HexBigInteger? ChainId { get; }
    IWalletConfigurationService Configuration { get; }

    Task<IAccount?> GetSelectedAccountAsync();
    Task<IClient?> GetRpcClientAsync();
    Task<IWeb3> GetWalletWeb3Async();
    Task<bool> SwitchChainAsync(string chainIdHex);

    // Prompt methods (show UI to user)
    Task<string?> ShowTransactionDialogAsync(TransactionInput input);
    Task<string?> RequestPersonalSignAsync(SignaturePromptContext context);
    Task<string?> RequestTypedDataSignAsync(TypedDataSignPromptContext context);
    Task<bool> RequestDappPermissionAsync(DappConnectionContext dapp, string address);
    Task<ChainSwitchPromptResult> RequestChainSwitchAsync(ChainSwitchPromptRequest request);
    Task<ChainAdditionPromptResult> RequestChainAdditionAsync(ChainAdditionPromptRequest request);
}
```

Because `IWalletContext` extends `IEthereumHostProvider`, the wallet provider can be used anywhere a host provider is expected.

## Intercepted Methods

The `NethereumWalletInterceptor` intercepts these JSON-RPC methods:

```csharp
public static List<string> InterceptedMethods { get; } = new()
{
    "eth_sendTransaction",
    "eth_signTransaction",
    "eth_sign",
    "personal_sign",
    "eth_signTypedData",
    "eth_signTypedData_v3",
    "eth_signTypedData_v4",
    "eth_requestAccounts",
    "wallet_requestPermissions",
    "wallet_switchEthereumChain",
    "wallet_addEthereumChain",
    "eth_accounts"
};
```

Non-intercepted methods (like `eth_call`, `eth_getBalance`, `eth_blockNumber`) pass through to the underlying RPC client.

## RPC Handler Reference

### Account Access

#### `eth_accounts`
Returns the selected account if the dApp has permission, empty array otherwise. Does not prompt.

#### `eth_requestAccounts`
Returns the selected account. If the dApp is not yet approved, prompts the user via `IDappPermissionPromptService`. Returns error code 4001 if rejected.

#### `wallet_requestPermissions`
EIP-2255 permission request. Prompts if needed, returns permission objects:
```json
[{ "parentCapability": "eth_accounts", "caveats": [] }]
```

#### `wallet_getPermissions`
Returns current permissions for the dApp. Does not prompt.

#### `wallet_revokePermissions`
Revokes dApp permissions. Does not prompt.

### Signing

#### `personal_sign`
1. Extracts message and address from params (handles both param orders)
2. Creates `SignaturePromptContext` with decoded message, dApp info
3. Prompts user via `ISignaturePromptService.PromptSignatureAsync()`
4. Signs with vault account's private key
5. Returns signature or error code 4001

The prompt context includes:
```csharp
public sealed class SignaturePromptContext
{
    public string Method { get; init; }       // "personal_sign"
    public string Message { get; init; }      // Raw message
    public string? DecodedMessage { get; init; } // UTF-8 decoded if hex
    public bool IsMessageHex { get; init; }
    public string Address { get; init; }
    public string? Origin { get; init; }      // dApp origin URL
    public string? DappName { get; init; }
    public string? DappIcon { get; init; }
}
```

#### `eth_signTypedData_v4`
1. Extracts address and EIP-712 typed data JSON
2. Parses domain metadata (name, version, verifyingContract, chainId)
3. Validates chainId matches current network
4. Prompts user via `ISignaturePromptService.PromptTypedDataSignAsync()`
5. Returns signature or error code 4001

The prompt context includes full EIP-712 metadata:
```csharp
public sealed class TypedDataSignPromptContext
{
    public string Address { get; init; }
    public string TypedDataJson { get; init; }
    public string? DomainName { get; init; }
    public string? DomainVersion { get; init; }
    public string? VerifyingContract { get; init; }
    public string? PrimaryType { get; init; }
    public string? ChainId { get; init; }
    public string? Origin { get; init; }
    public string? DappName { get; init; }
    public string? DappIcon { get; init; }
}
```

### Transactions

#### `eth_sendTransaction`
1. Parses `TransactionInput` from request params
2. Sets `from` to selected account if not specified
3. Prompts user via `ITransactionPromptService.PromptTransactionAsync()`
4. Signs and broadcasts if approved
5. Returns transaction hash or error code 4001

This is the only handler that both signs AND sends.

### Network Management

#### `eth_chainId`
Returns current chain ID as hex. Does not prompt.

#### `wallet_switchEthereumChain`
1. Parses `SwitchEthereumChainParameter` to extract chainId
2. Creates `ChainSwitchPromptRequest` with chain metadata
3. Prompts user via `IChainSwitchPromptService`
4. Switches network if approved
5. Returns null on success

#### `wallet_addEthereumChain`
1. Parses `AddEthereumChainParameter` (chainId, chainName, rpcUrls, nativeCurrency)
2. If chain already exists, switches to it instead
3. If new, prompts user via `IChainAdditionPromptService`
4. Adds chain and optionally switches
5. Returns null on success

## Handler Quick Reference

| Method | Handler | Prompts? | Service |
|--------|---------|----------|---------|
| `eth_accounts` | `EthAccountsHandler` | No | — |
| `eth_requestAccounts` | `EthRequestAccountsHandler` | Yes (if unapproved) | `IDappPermissionPromptService` |
| `eth_chainId` | `EthChainIdHandler` | No | — |
| `eth_sendTransaction` | `EthSendTransactionHandler` | Yes | `ITransactionPromptService` |
| `personal_sign` | `PersonalSignHandler` | Yes | `ISignaturePromptService` |
| `eth_signTypedData_v4` | `EthSignTypedDataV4Handler` | Yes | `ISignaturePromptService` |
| `wallet_switchEthereumChain` | `WalletSwitchEthereumChainHandler` | Yes | `IChainSwitchPromptService` |
| `wallet_addEthereumChain` | `WalletAddEthereumChainHandler` | Yes | `IChainAdditionPromptService` |
| `wallet_requestPermissions` | `WalletRequestPermissionsHandler` | Yes (if unapproved) | `IDappPermissionPromptService` |
| `wallet_getPermissions` | `WalletGetPermissionsHandler` | No | — |
| `wallet_revokePermissions` | `WalletRevokePermissionsHandler` | No | — |

## Permission System

Handlers check permissions before prompting:

```csharp
// Normalize for case-insensitive comparison
var origin = dapp.Origin.Trim().ToLowerInvariant();
var account = address.Trim().ToLowerInvariant();

if (!await context.DappPermissions.IsApprovedAsync(origin, account))
{
    var approved = await context.RequestDappPermissionAsync(dapp, address);
    if (!approved)
        return UserRejected(request.Id);
}
```

The `IDappPermissionService` caches approvals so repeat requests from the same dApp don't prompt again.

## Registration

All handlers are registered at startup:

```csharp
public static class WalletRpcHandlerRegistration
{
    public static void RegisterAll(RpcHandlerRegistry registry)
    {
        registry.Register(new WalletAddEthereumChainHandler());
        registry.Register(new WalletSwitchEthereumChainHandler());
        registry.Register(new WalletGetPermissionsHandler());
        registry.Register(new WalletRequestPermissionsHandler());
        registry.Register(new WalletRevokePermissionsHandler());
        registry.Register(new PersonalSignHandler());
        registry.Register(new EthSignTypedDataV4Handler());
        registry.Register(new EthRequestAccountsHandler());
        registry.Register(new EthAccountsHandler());
        registry.Register(new EthSendTransactionHandler());
        // ... additional handlers
    }
}
```

The `RpcHandlerRegistry` is a simple `Dictionary<string, IRpcMethodHandler>`. Custom handlers can be registered for additional methods.

## Writing Custom Handlers

Extend `RpcMethodHandlerBase` to handle additional RPC methods:

```csharp
public class MyCustomHandler : RpcMethodHandlerBase
{
    public override string MethodName => "my_customMethod";

    public override async Task<RpcResponseMessage> HandleAsync(
        RpcRequestMessage request, IWalletContext context)
    {
        var param = request.GetFirstParamAs<string>();

        if (string.IsNullOrEmpty(param))
            return InvalidParams(request.Id, "Parameter required");

        // Do work using context...
        var result = await DoWorkAsync(param, context);

        return new RpcResponseMessage(request.Id, result);
    }
}

// Register it
registry.Register(new MyCustomHandler());
```

Helper methods from `RpcMethodHandlerBase`:
- `MethodNotImplemented(id)` -- error code -32601
- `InvalidParams(id, message)` -- error code -32602
- `UserRejected(id)` -- error code 4001
- `InternalError(id, message)` -- error code -32603

## Prompt Services

Each prompt type has a dedicated service interface:

| Interface | Purpose |
|-----------|---------|
| `ITransactionPromptService` | Show transaction confirmation dialog |
| `ISignaturePromptService` | Show message/typed-data signing dialog |
| `IDappPermissionPromptService` | Show dApp connection approval |
| `IChainSwitchPromptService` | Show chain switch confirmation |
| `IChainAdditionPromptService` | Show new chain addition dialog |
| `ILoginPromptService` | Show vault unlock/login dialog |

The Blazor renderer provides UI implementations of these services. Default implementations (`NoOpDappPermissionPromptService`, `PermissiveDappPermissionService`) are registered as fallbacks.

## Next Steps

- [Host Provider Pattern](../wallet-connectivity/guide-host-providers) -- The IEthereumHostProvider abstraction
- [Wallet Architecture](guide-wallet-architecture) -- Dashboard plugins, registry system, screen inventory
- [Transactions](guide-wallet-transactions) -- Send flow, gas strategies, EVM simulation
