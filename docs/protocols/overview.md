---
title: Protocols
sidebar_label: Overview
sidebar_position: 1
description: ENS, Sign-In with Ethereum, Gnosis Safe, Circles, and GSN protocol integrations
---

# Protocols

Nethereum provides standalone libraries for deeper integration with specific Ethereum protocols beyond core contract interaction.

## ENS (Ethereum Name Service)

The `Nethereum.ENS` package provides name resolution, registration, management, and reverse lookup for the Ethereum Name Service.

## Sign-In with Ethereum (SIWE)

[EIP-4361](https://eips.ethereum.org/EIPS/eip-4361) lets users authenticate by signing a message with their wallet:

1. Your app generates a SIWE message (domain, address, nonce)
2. The user signs with their wallet
3. Your server verifies the signature
4. You issue a session tied to the verified address

```csharp
using Nethereum.Siwe.Core;

var siweMessage = new SiweMessage
{
    Domain = "mydapp.com",
    Address = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    Statement = "Sign in to access your dashboard.",
    Uri = "https://mydapp.com",
    Version = "1",
    ChainId = "1",
    Nonce = SiweMessage.GenerateNonce(),
    IssuedAt = DateTime.UtcNow.ToString("o"),
    ExpirationTime = DateTime.UtcNow.AddHours(1).ToString("o")
};

string messageToSign = SiweMessageStringBuilder.BuildMessage(siweMessage);
```

## Gnosis Safe

`Nethereum.GnosisSafe` provides multi-signature wallet interaction with Permit2 support.

## Circles UBI

`Nethereum.Circles` integrates with the Circles UBI protocol.

## Gas Station Network (GSN)

`Nethereum.GSN` provides meta-transaction relay integration for gasless transactions.
