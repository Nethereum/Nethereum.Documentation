---
title: "SIWE Authentication"
sidebar_label: "SIWE Authentication"
sidebar_position: 20
description: "Implement Sign-In with Ethereum (EIP-4361) authentication in Blazor with JWT tokens and AuthorizeView"
---

# SIWE Authentication

Sign-In with Ethereum (SIWE, [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361)) lets users authenticate by signing a message with their wallet instead of using passwords. Nethereum integrates SIWE directly with Blazor's `AuthenticationStateProvider` so you can use standard `<AuthorizeView>` and `[Authorize]` attributes.

## Authentication Flow

1. User connects wallet (see [Wallet Connection](guide-blazor-wallet-connect))
2. Server generates a SIWE message with a nonce
3. User signs the message in their wallet
4. Server verifies the signature and creates a session (JWT or server-side)
5. User gains `EthereumConnected` and `SiweAuthenticated` roles

## Two Roles, Two Levels

| Role | Meaning |
|------|---------|
| `EthereumConnected` | Wallet is connected (address known, no signature proof) |
| `SiweAuthenticated` | User signed a SIWE message (cryptographic proof of ownership) |

## Blazor Server Setup

The server-side approach validates signatures directly without a REST API.

```bash
dotnet add package Nethereum.Blazor
dotnet add package Nethereum.Siwe
```

Register services in `Program.cs`:

```csharp
using Nethereum.Blazor;
using Nethereum.Blazor.Siwe;
using Nethereum.Siwe;
using Nethereum.Siwe.Core;
using Nethereum.UI;
using Microsoft.AspNetCore.Components.Authorization;

builder.Services.AddSingleton<NethereumSiweAuthenticatorService>();
builder.Services.AddSingleton<ISessionStorage, SessionStorageService>();

builder.Services.AddScoped<AuthenticationStateProvider,
    SiweAuthenticationServerStateProvider<User, SiweMessage>>();
builder.Services.AddAuthorizationCore();
```

Use in a component:

```razor
@inject AuthenticationStateProvider AuthStateProvider
@inject IEthereumHostProvider EthereumProvider

<AuthorizeView Roles="SiweAuthenticated">
    <Authorized>
        <p>Signed in as @context.User.Identity?.Name</p>
        <button @onclick="LogOut">Log Out</button>
    </Authorized>
    <NotAuthorized>
        <button @onclick="SignIn">Sign In with Ethereum</button>
    </NotAuthorized>
</AuthorizeView>

@code {
    private async Task SignIn()
    {
        if (AuthStateProvider is SiweAuthenticationServerStateProvider<User, SiweMessage> siweAuth)
        {
            if (!EthereumProvider.Enabled)
                await EthereumProvider.EnableProviderAsync();

            await siweAuth.AuthenticateAsync();
        }
    }

    private async Task LogOut()
    {
        if (AuthStateProvider is SiweAuthenticationServerStateProvider<User, SiweMessage> siweAuth)
        {
            await siweAuth.LogOutUserAsync();
        }
    }
}
```

## Blazor WASM + REST API Setup

For WebAssembly apps, the SIWE signature is sent to a REST API that returns a JWT token. The token is stored in `localStorage`.

### REST API (Server)

The API generates nonces and validates signatures:

```csharp
using Nethereum.Siwe;
using Nethereum.Siwe.Core;

app.MapGet("/api/siwe/nonce", () =>
{
    var nonce = SiweMessageService.GenerateNonce();
    return Results.Ok(new { nonce });
});

app.MapPost("/api/siwe/verify", async (SiweVerifyRequest request,
    SiweJwtAuthorisationService jwtService) =>
{
    var siweMessage = SiweMessageParser.Parse(request.Message);
    var validUser = SiweMessageService.IsMessageSignatureValid(
        request.Message, request.Signature);

    if (!validUser) return Results.Unauthorized();

    var token = jwtService.GenerateToken(siweMessage.Address);
    return Results.Ok(new { token });
});
```

### WASM Client

```csharp
using Nethereum.Blazor.Siwe;
using Nethereum.Siwe.Authentication;
using Microsoft.AspNetCore.Components.Authorization;

builder.Services.AddSingleton<IAccessTokenService, LocalStorageAccessTokenService>();
builder.Services.AddScoped<AuthenticationStateProvider,
    SiweAuthenticationWasmStateProvider>();
builder.Services.AddAuthorizationCore();
```

`SiweAuthenticationWasmStateProvider` stores the JWT in `localStorage` via `LocalStorageAccessTokenService`. On page reload, it reads the token and restores the authentication state.

## Protecting Routes

Use standard Blazor authorization attributes:

```razor
@page "/dashboard"
@attribute [Authorize(Roles = "SiweAuthenticated")]

<h3>Dashboard</h3>
<p>Only visible to SIWE-authenticated users.</p>
```

Or inline with `<AuthorizeView>`:

```razor
<AuthorizeView Roles="EthereumConnected">
    <Authorized>
        <p>Wallet connected: @context.User.FindFirst(
            System.Security.Claims.ClaimTypes.NameIdentifier)?.Value</p>
    </Authorized>
</AuthorizeView>

<AuthorizeView Roles="SiweAuthenticated">
    <Authorized>
        <p>Fully authenticated via SIWE.</p>
    </Authorized>
</AuthorizeView>
```

## NFT-Gated Access

Implement `IEthereumUserService` to restrict access based on token holdings:

```csharp
using Nethereum.UI;

public class NFTGateService : IEthereumUserService
{
    private readonly IEthereumHostProvider _provider;
    private readonly string _requiredNftContract;

    public NFTGateService(IEthereumHostProvider provider, string requiredNftContract)
    {
        _provider = provider;
        _requiredNftContract = requiredNftContract;
    }

    public async Task<bool> IsUserValidAsync(string address)
    {
        var web3 = await _provider.GetWeb3Async();
        var erc721 = web3.Eth.ERC721.GetContractService(_requiredNftContract);
        var balance = await erc721.BalanceOfQueryAsync(address);
        return balance > 0;
    }
}
```

The built-in `ERC721BalanceEthereumUserService` does this out of the box -- register it with the contract address:

```csharp
builder.Services.AddSingleton<IEthereumUserService>(sp =>
    new ERC721BalanceEthereumUserService(
        sp.GetRequiredService<IEthereumHostProvider>(),
        "0xYourNFTContractAddress"));
```

## Smart Contract Wallet Support

`SiweMessageService.IsMessageSignatureValid` supports:

- **EOA wallets** -- standard `ecRecover` signature verification
- **ERC-1271** -- on-chain `isValidSignature` for deployed smart contract wallets
- **ERC-6492** -- pre-deployment signature validation for counterfactual smart accounts

This is handled transparently. No additional configuration is needed.

## Full Starter Template

A complete SIWE template with REST API, Blazor Server, and Blazor WASM is available:

```bash
dotnet new install Nethereum.Templates.Pack
dotnet new nethereum-siwe -o MySiweDapp
```

The template includes JWT generation, nonce management, MetaMask integration, and role-based authorization out of the box.

## Next Steps

- [Wallet Connection](guide-blazor-wallet-connect) -- connect wallets before authenticating
- [Dynamic Contract Interaction](guide-blazor-contract-interaction) -- interact with contracts as the authenticated user
- [Nethereum.Siwe](../protocols/nethereum-siwe) -- SIWE package reference (message building, parsing, verification)
