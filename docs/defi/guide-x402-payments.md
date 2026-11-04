---
title: "x402: Crypto Payments"
sidebar_label: "x402 Payments"
sidebar_position: 5
description: Accept HTTP 402 cryptocurrency payments (x402 protocol v2) with Nethereum — EIP-3009 or Permit2, USDC or any ERC-20
---

# x402: Crypto Payments

:::tip The Simple Way
```csharp
// Client: pay for API requests automatically
var x402Client = new X402HttpClient(httpClient, privateKey, options);
var response = await x402Client.GetAsync("https://api.example.com/premium/content");

// Server: protect endpoints with middleware
app.UseX402(options => options.Routes.Add(
    new RoutePaymentConfig("/api/premium/*", requirements)));
```
The client handles 402 detection, signing, and retry automatically. The server middleware handles verification and settlement.
:::

The x402 protocol implements HTTP 402 (Payment Required) for pay-per-request APIs. Instead of subscriptions or API keys, clients pay per call with a signed authorization. The payer signs off-chain (no gas), and the server or a facilitator settles the transfer on-chain. Nethereum's `Nethereum.X402` package provides both an automatic client and ASP.NET Core middleware.

This guide covers **x402 protocol version 2**: payments carry `x402Version = 2`, the chosen requirement is echoed in the payload's `accepted` field, networks use **CAIP-2** identifiers (`eip155:<chainId>`), and the "exact" scheme supports two EVM asset-transfer methods — **EIP-3009** (default) and **Permit2** (any ERC-20). The wire format is interop-verified against the coinbase/x402 reference implementation in both directions.

```bash
dotnet add package Nethereum.X402
```

## How It Works

```
1. Client → Server:   GET /api/premium/content (no payment header)
2. Server → Client:   402 + PaymentRequired (PAYMENT-REQUIRED header + body)
3. Client:            Selects a requirement, signs it off-chain (EIP-3009 or Permit2), no gas
4. Client → Server:   GET /api/premium/content + PAYMENT-SIGNATURE header
5. Server/Facilitator: Verifies signature, binding, balance, time window → settles on-chain
6. Server → Client:   200 OK + content + PAYMENT-RESPONSE header
```

The key insight: the client never sends a blockchain transaction — it only signs an authorization. The server (or facilitator) submits the on-chain transfer and pays the gas. v2 uses three base64 headers: `PAYMENT-REQUIRED` (402 response), `PAYMENT-SIGNATURE` (request), `PAYMENT-RESPONSE` (200 response).

## Client: Pay for API Requests

`X402HttpClient` wraps `HttpClient` and handles the full 402 flow. The signing domain (token, chain id, name/version) is derived from the server's `PaymentRequirements`, so the client isn't pre-configured with a token:

```csharp
using Nethereum.X402.Client;

var options = new X402HttpClientOptions
{
    MaxAmount = "100000",           // Safety limit per request (USDC)
    PreferredNetwork = "eip155:8453",  // CAIP-2 (Base)
    PreferredScheme = "exact"
};

var x402Client = new X402HttpClient(httpClient, privateKey, options);
var response = await x402Client.GetAsync("https://api.example.com/premium/content");
```

Supports `GetAsync`, `PostAsync`, `PutAsync`, `DeleteAsync`, `SendAsync`. If the requested amount exceeds `MaxAmount`, the client throws `X402PaymentExceedsMaximumException` instead of signing. The client automatically produces the correct payload for the selected requirement's method — EIP-3009, or Permit2 when `extra.assetTransferMethod == "permit2"`.

### Check Payment Results

The settlement result comes back in the `PAYMENT-RESPONSE` header:

```csharp
if (response.HasPaymentResponse())
{
    var success = response.IsPaymentSuccessful();
    var txHash = response.GetTransactionHash();
    var payer = response.GetPayerAddress();
}
```

### Manual Payment Flow

Construct with just the payer key and pass explicit `PaymentRequirements` for full control:

```csharp
var x402Client = new X402HttpClient(httpClient, privateKey);

var requirements = new PaymentRequirements
{
    Scheme = "exact",
    Network = "eip155:84532",   // Base Sepolia
    Amount = "1000000",         // $1.00 USDC (6 decimals), atomic units
    Asset = usdcAddress,
    PayTo = receiverAddress,
    MaxTimeoutSeconds = 60,
    Extra = new ExactSchemeExtra { Name = "USDC", Version = "2" }
};

var response = await x402Client.GetAsync("https://api.example.com/premium", requirements);
```

## Server: Protect Endpoints

Register a facilitator client, then add route-based middleware:

```csharp
using Nethereum.X402.AspNetCore;
using Nethereum.X402.Server;
using Nethereum.X402.Models;

builder.Services.AddX402Services("https://facilitator.x402.org");

app.UseX402(options =>
{
    options.Routes.Add(new RoutePaymentConfig("/api/premium/*", new PaymentRequirements
    {
        Scheme = "exact",
        Network = "eip155:8453",
        Amount = "1000000",
        Asset = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        PayTo = "0xYourReceiverAddress",
        MaxTimeoutSeconds = 60,
        Extra = new ExactSchemeExtra { AssetTransferMethod = "eip3009", Name = "USDC", Version = "2" }
    }));
});
```

When a matching request has no `PAYMENT-SIGNATURE`, the middleware returns 402 with a `PaymentRequired` (in the `PAYMENT-REQUIRED` header and body). When a payment is present, it verifies and settles through the facilitator before forwarding.

### Facilitator-side processors

These register an `IX402PaymentProcessor` that verifies and settles on-chain with only an RPC endpoint per chain id (token, chain and domain come from each requirement). It is consumed by the hosted facilitator controllers (see Hosting a Facilitator). A server protected with `UseX402` still needs `AddX402Services(facilitatorUrl)`; that URL can point at your own facilitator host.

```csharp
using Nethereum.X402.Extensions;

var rpcByChainId = new Dictionary<int, string> { [8453] = "https://mainnet.base.org" };

// EIP-3009 only (facilitator pays gas):
builder.Services.AddX402TransferProcessor(facilitatorPrivateKey, rpcByChainId);

// EIP-3009 AND Permit2 (routes by payload shape) — recommended:
builder.Services.AddX402ExactProcessor(facilitatorPrivateKey, rpcByChainId);

// Receiver-submitted model (receiver pays gas):
builder.Services.AddX402ReceiveProcessor(receiverPrivateKey, rpcByChainId);
```

Each overload also accepts an `IAccount` (external signers/KMS) or an `IServiceProvider` factory.

## Asset-Transfer Methods

The "exact" scheme has two EVM asset-transfer methods:

| Method | Processor | On-chain call | Token requirement |
|--------|-----------|---------------|-------------------|
| EIP-3009 (default) | `X402TransferWithAuthorisation3009Service` | `transferWithAuthorization` | token must support EIP-3009 (e.g. USDC) |
| EIP-3009 (receiver) | `X402ReceiveWithAuthorisation3009Service` | `receiveWithAuthorization` | same, receiver submits |
| Permit2 | `X402ExactPermit2Service` | `x402ExactPermit2Proxy.settle` | any ERC-20 approved to Permit2 |

All implement `IX402PaymentProcessor` (`VerifyPaymentAsync`, `SettlePaymentAsync`, `GetSupportedAsync`). `X402ExactSchemeProcessor` routes a payment to the right one by payload shape; register it with `AddX402ExactProcessor`.

### Permit2

Permit2 works with **any ERC-20** the payer has approved to the canonical [Permit2](https://github.com/Uniswap/permit2) contract — no EIP-3009 support needed in the token. The payer signs a Permit2 `PermitWitnessTransferFrom` naming the x402ExactPermit2Proxy as spender and the route recipient as the witness; the facilitator settles via `proxy.settle`, which enforces that funds go only to that recipient. A route opts in with `extra.assetTransferMethod = "permit2"`:

```csharp
options.Routes.Add(new RoutePaymentConfig("/api/premium-permit2", new PaymentRequirements
{
    Scheme = "exact",
    Network = "eip155:84532",
    Amount = "10000",
    Asset = usdcAddress,
    PayTo = receiverAddress,
    MaxTimeoutSeconds = 60,
    Extra = new ExactSchemeExtra { AssetTransferMethod = "permit2" }
}));
```

The client signs and emits the permit2 payload automatically; the facilitator (`X402ExactPermit2Service`, or `AddX402ExactProcessor` to serve both methods) verifies the binding and on-chain prerequisites (proxy deployed, payer balance, Permit2 allowance) and settles. The Permit2/proxy addresses are canonical constants (`X402Permit2Addresses`), the same on every EVM chain. The Permit2 primitives are reusable outside x402 — see the built-in Permit2 standard (`web3.Eth.GetPermit2Service()`).

## Building EIP-3009 Authorizations Directly

For custom flows, build and sign an authorization yourself:

```csharp
using Nethereum.X402.Signers;

var builder = new TransferWithAuthorisationBuilder();
var authorization = builder.BuildFromPaymentRequirements(requirements, payerAddress);
// Default window: validAfter = 10 min ago, validBefore = 1 hour from now

var signer = new TransferWithAuthorisationSigner();
var signature = await signer.SignWithPrivateKeyAsync(
    authorization, "USD Coin", "2", chainId, usdcAddress, payerPrivateKey);

// Or sign with a Web3 account (hardware wallets, KMS)
var signature = await signer.SignWithWeb3Async(
    authorization, "USD Coin", "2", chainId, usdcAddress, web3, signerAddress);
```

## Hosting a Facilitator

Expose verify/settle as an ASP.NET Core REST API so servers need no blockchain infrastructure:

```csharp
using Nethereum.X402.Extensions;

builder.Services.AddX402ExactProcessor(facilitatorAccount, rpcByChainId); // EIP-3009 + Permit2
builder.Services.AddControllers().AddX402FacilitatorControllers();

var app = builder.Build();
app.MapControllers();
app.Run();
```

Endpoints: `POST /facilitator/verify`, `POST /facilitator/settle`, `GET /facilitator/supported`.

## Error Handling

`X402ErrorCodes` defines the standard reason strings (matching the coinbase/x402 reference), surfaced in `VerificationResponse.InvalidReason` / `SettlementResponse.ErrorReason`:

| Code | Meaning |
|------|---------|
| `invalid_exact_evm_insufficient_balance` | Payer doesn't have enough tokens |
| `invalid_exact_evm_signature` | EIP-3009 signature verification failed |
| `invalid_exact_evm_authorization_value` | Amount below the requirement |
| `invalid_exact_evm_recipient_mismatch` | Receiver doesn't match `PayTo` |
| `invalid_network` / `unsupported_payload_type` | Network/payload type not supported |
| `invalid_permit2_recipient_mismatch` | Permit2 witness recipient ≠ `PayTo` |
| `permit2_allowance_required` | Payer hasn't approved Permit2 for the asset |
| `invalid_permit2_signature` | Permit2 signature verification failed |

## Supported Tokens

Any EIP-3009 token (eip3009 method) or any ERC-20 approved to Permit2 (permit2 method). Common USDC addresses:

| Token | Network | Address |
|-------|---------|---------|
| USDC | Ethereum | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| USDC | Base | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| USDC | Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| USDC | Polygon | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| USDC | Arbitrum | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| USDC | Optimism | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |

## Demo Projects

Runnable samples live in the Nethereum repo under `src/demos/`:

- **Nethereum.X402.SimpleClient** — automatic and manual client flows
- **Nethereum.X402.SimpleServer** — protected `/premium` (EIP-3009) and `/premium-permit2` (Permit2) routes
- **Nethereum.X402.FacilitatorServer** — a hosted facilitator (`AddX402ExactProcessor` settles both methods)

## Next Steps

- Package reference: [Nethereum.X402](./nethereum-x402.md)
- Permit2 as a standalone standard: `web3.Eth.GetPermit2Service()`
- [x402 Protocol (coinbase/x402)](https://github.com/coinbase/x402)
- [EIP-3009: Transfer With Authorization](https://eips.ethereum.org/EIPS/eip-3009)
