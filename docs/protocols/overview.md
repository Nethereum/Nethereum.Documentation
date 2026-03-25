---
title: Protocols
sidebar_label: Overview
sidebar_position: 1
description: ENS, Sign-In with Ethereum, Privacy Pools, Gnosis Safe, and Circles protocol integrations
---

# Protocols

Nethereum provides standalone libraries for deeper integration with specific Ethereum protocols beyond core contract interaction.

## ENS (Ethereum Name Service)

The `Nethereum.ENS` package provides name resolution, registration, management, and reverse lookup for the Ethereum Name Service.

## Sign-In with Ethereum (SIWE)

[EIP-4361](https://eips.ethereum.org/EIPS/eip-4361) lets users authenticate by signing a message with their wallet. `SiweMessageService` handles nonce generation, session management, and signature verification:

```csharp
using Nethereum.Siwe;
using Nethereum.Siwe.Core;

var siweService = new SiweMessageService();
var message = new SiweMessage
{
    Domain = "mydapp.com",
    Address = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    Statement = "Sign in to access your dashboard.",
    Uri = "https://mydapp.com",
    Version = "1",
    ChainId = "1"
};
message.SetExpirationTime(DateTime.UtcNow.AddHours(1));

// BuildMessageToSign assigns a nonce, stores the session, and returns the text to sign
string messageToSign = siweService.BuildMessageToSign(message);

// After the user signs, verify the signature + dates + session match
bool valid = await siweService.IsValidMessage(
    SiweMessageParser.Parse(messageToSign), signature);
```

See the [SIWE guide](guide-siwe) for the full authentication flow including NFT-gated access, smart contract wallets, RECAP capabilities, and REST API integration.

## Gnosis Safe

`Nethereum.GnosisSafe` provides multi-signature wallet interaction with Permit2 support.

## Privacy Pools (0xbow)

Privacy Pools let users deposit ETH or ERC-20 tokens and later withdraw to a different address without revealing which deposit funded the withdrawal. An Association Set Provider (ASP) layer lets pool operators exclude illicit deposits without breaking privacy for legitimate users.

* `Nethereum.PrivacyPools` — complete SDK: accounts, deposits, withdrawals, ASP tree management, proof generation and verification
* `Nethereum.PrivacyPools.Circuits` — embedded Circom circuit artifacts (commitment + withdrawal)
* Native proof generation via `Nethereum.CircomWitnessCalc` + `Nethereum.ZkProofs.RapidSnark` (no Node.js required)
* Browser-based proof generation via `Nethereum.ZkProofs.Snarkjs.Blazor` for Blazor WASM apps
* Cross-compatible with the [0xbow TypeScript SDK](https://github.com/0xbow-io/privacy-pools-core)

See the [Privacy Pools guide](guide-privacy-pools) for the full protocol flow.

## Circles UBI

`Nethereum.Circles` integrates with the Circles UBI protocol.
