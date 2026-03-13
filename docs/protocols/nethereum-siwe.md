---
title: "Nethereum.Siwe"
sidebar_label: "Nethereum.Siwe"
sidebar_position: 100
description: "Full Sign-In with Ethereum (EIP-4361) implementation with session management, signature verification, and pluggable user validation. Built on top of [Nethereum.Siwe.Core](../Nethereum.Siwe.Core/README"
custom_edit_url: "https://github.com/Nethereum/Nethereum/edit/master/src/Nethereum.Siwe/README.md"
format: md
---

# Nethereum.Siwe

> **NuGet**: [`Nethereum.Siwe`](https://www.nuget.org/packages/Nethereum.Siwe/) | **Source**: [`src/Nethereum.Siwe/`](https://github.com/Nethereum/Nethereum/tree/master/src/Nethereum.Siwe)
# Nethereum.Siwe

Full Sign-In with Ethereum (EIP-4361) implementation with session management, signature verification, and pluggable user validation. Built on top of [Nethereum.Siwe.Core](nethereum-siwe-core).

## Key Components

| Class | Purpose |
|---|---|
| `SiweMessageService` | Orchestrates the full SIWE flow: message building with nonce, signature verification, session matching, expiry checks |
| `ISessionStorage` | Interface for storing SIWE sessions keyed by nonce |
| `InMemorySessionNonceStorage` | Default in-memory session store |
| `IEthereumUserService` | Pluggable user validation (e.g. check NFT balance, database lookup) |
| `ERC721BalanceEthereumUserService` | Validates users hold an ERC-721 token |

## Quick Start

### Server-side SIWE authentication

```csharp
// 1. Create the service (in-memory sessions, no user validation)
var siweService = new SiweMessageService();

// 2. Build a message for the user to sign
var message = new DefaultSiweMessage();
message.Address = userAddress.ConvertToEthereumChecksumAddress();
message.SetExpirationTime(DateTime.UtcNow.AddMinutes(10));
message.SetNotBefore(DateTime.UtcNow);
string messageToSign = siweService.BuildMessageToSign(message);
// Send messageToSign to the client for signing

// 3. Verify the signed message
var parsed = SiweMessageParser.Parse(messageToSign);
bool valid = await siweService.IsValidMessage(parsed, signature);
```

### With NFT-gated access

```csharp
var userService = new ERC721BalanceEthereumUserService(web3, nftContractAddress);
var siweService = new SiweMessageService(
    new InMemorySessionNonceStorage(),
    userService);

// IsUserAddressRegistered checks the user holds the NFT
bool registered = await siweService.IsUserAddressRegistered(parsed);
```

### Smart contract wallet support (ERC-1271 / ERC-6492)

```csharp
var siweService = new SiweMessageService(
    new InMemorySessionNonceStorage(),
    ethereumUserService: null,
    web3ForERC1271Validation: web3);

// IsMessageSignatureValid automatically falls back to ERC-1271/ERC-6492
// for smart contract wallets
bool valid = await siweService.IsMessageSignatureValid(parsed, signature);
```

## Full Template

A complete Blazor + REST API SIWE authentication template is available at [`Nethereum.Templates.Siwe`](https://github.com/Nethereum/Nethereum.Templates.Pack), providing:

- **REST API** — Nonce generation, authentication endpoint, JWT creation and middleware validation
- **Blazor WebAssembly** — MetaMask signing, JWT local storage, `SiweAuthenticationWasmStateProvider`
- **Blazor Server** — Direct signing via `NethereumSiweAuthenticatorService`, protected session storage
- **Blazor `<AuthorizeView>`** — Role-based access with `EthereumConnected` and `SiweAuthenticated` claims

## Relationship to Other Packages

- **[Nethereum.Siwe.Core](nethereum-siwe-core)** — Message model, parser, and string builder
- **Nethereum.UI** — `NethereumSiweAuthenticatorService` for Blazor Server SIWE flows
- **Nethereum.Signer** — `EthereumMessageSigner` used for signature recovery
- **Nethereum.Contracts** — ERC-1271 and ERC-6492 signature validation for smart contract wallets
