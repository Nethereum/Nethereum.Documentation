---
title: "Nethereum.Siwe.Core"
sidebar_label: "Nethereum.Siwe.Core"
sidebar_position: 100
description: "Core models and utilities for Sign-In with Ethereum (EIP-4361). This package provides the `SiweMessage` model, message parsing, string building, and validation helpers used by both `Nethereum.Siwe` an"
custom_edit_url: "https://github.com/Nethereum/Nethereum/edit/master/src/Nethereum.Siwe.Core/README.md"
format: md
---

# Nethereum.Siwe.Core

> **NuGet**: [`Nethereum.Siwe.Core`](https://www.nuget.org/packages/Nethereum.Siwe.Core/) | **Source**: [`src/Nethereum.Siwe.Core/`](https://github.com/Nethereum/Nethereum/tree/master/src/Nethereum.Siwe.Core)
# Nethereum.Siwe.Core

Core models and utilities for Sign-In with Ethereum (EIP-4361). This package provides the `SiweMessage` model, message parsing, string building, and validation helpers used by both `Nethereum.Siwe` and downstream authentication providers.

## Key Components

| Class | Purpose |
|---|---|
| `SiweMessage` | EIP-4361 message model with Domain, Address, Statement, URI, Nonce, expiration, and chain binding |
| `SiweMessageParser` | Parses a plain-text SIWE string back into a `SiweMessage` (regex and ABNF modes) |
| `SiweMessageStringBuilder` | Builds the canonical plain-text representation for signing |
| `DefaultSiweMessage` | Pre-configured `SiweMessage` subclass with sensible defaults |

## Usage

### Build a SIWE message string

```csharp
var message = new SiweMessage
{
    Domain = "example.com",
    Address = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    Statement = "Sign in to Example",
    Uri = "https://example.com",
    Version = "1",
    ChainId = "1"
};
message.SetIssuedAtNow();
message.SetExpirationTime(DateTime.UtcNow.AddMinutes(10));
message.SetNotBefore(DateTime.UtcNow);
message.Nonce = "randomnonce123";

string plainText = SiweMessageStringBuilder.BuildMessage(message);
```

### Parse a SIWE message

```csharp
var parsed = SiweMessageParser.Parse(plainText);
// parsed.Address, parsed.Domain, parsed.Nonce, etc.
```

### Validate timing

```csharp
bool valid = message.HasMessageDateStartedAndNotExpired();
bool hasRequired = message.HasRequiredFields();
```

## Relationship to Other Packages

- **[Nethereum.Siwe](nethereum-siwe)** — Adds session/nonce management, signature verification, and user registration checks on top of these core models
- **Nethereum.UI** — `NethereumSiweAuthenticatorService` orchestrates SIWE authentication in Blazor Server using this package
