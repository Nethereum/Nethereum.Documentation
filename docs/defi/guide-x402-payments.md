---
title: "x402: Crypto Payments"
sidebar_label: "x402 Payments"
sidebar_position: 5
description: Accept HTTP 402 cryptocurrency payments using EIP-3009 signed USDC transfers with Nethereum
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
The client handles 402 detection, EIP-3009 signing, and retry automatically. The server middleware handles verification and settlement.
:::

The x402 protocol implements HTTP 402 (Payment Required) for pay-per-request APIs. Instead of subscriptions or API keys, clients pay per call using signed EIP-3009 USDC authorizations. The payer signs off-chain (no gas), and the server or a facilitator settles the transfer on-chain. Nethereum's `Nethereum.X402` package provides both an automatic client and ASP.NET Core middleware.

```bash
dotnet add package Nethereum.X402
```

## How It Works

```
1. Client → Server:  GET /api/premium/content (no payment header)
2. Server → Client:  402 + PaymentRequirements (amount, token, network, payTo)
3. Client:           Signs EIP-3009 authorization (off-chain, no gas for the payer)
4. Client → Server:  GET /api/premium/content + X-Payment header
5. Server/Facilitator: Verifies signature, balance, timestamps → settles on-chain
6. Server → Client:  200 OK + content + settlement response headers
```

The key insight is that the client never sends a blockchain transaction — they only sign an authorization. The server (or facilitator) submits the actual on-chain transfer, paying the gas.

## Client: Pay for API Requests

`X402HttpClient` wraps `HttpClient` and handles the full 402 flow — detect the payment requirement, sign an EIP-3009 authorization, and retry with the payment header:

```csharp
using Nethereum.X402.Client;

var httpClient = new HttpClient();
var options = new X402HttpClientOptions
{
    MaxPaymentAmount = 0.1m,       // Safety limit: max USDC per request
    PreferredNetwork = "base",
    TokenName = "USD Coin",
    TokenVersion = "2",
    ChainId = 8453,
    TokenAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
};

var x402Client = new X402HttpClient(httpClient, privateKey, options);

// Automatic: detects 402 → signs EIP-3009 → retries with payment
var response = await x402Client.GetAsync("https://api.example.com/premium/content");
var content = await response.Content.ReadAsStringAsync();
```

All HTTP methods are supported: `GetAsync`, `PostAsync`, `PutAsync`, `DeleteAsync`, `SendAsync`.

If the requested amount exceeds `MaxPaymentAmount`, the client throws `X402PaymentExceedsMaximumException` instead of signing — this prevents accidentally authorizing large payments.

### Check Payment Results

The response includes payment details in headers:

```csharp
if (response.HasPaymentResponse())
{
    var txHash = response.GetTransactionHash();
    var payer = response.GetPayerAddress();
    var success = response.IsPaymentSuccessful();
    Console.WriteLine($"Paid: TX {txHash}, payer {payer}, success: {success}");
}
```

### Manual Payment Flow

For full control, pass explicit `PaymentRequirements` instead of relying on automatic 402 detection:

```csharp
var x402Client = new X402HttpClient(httpClient, privateKey, "USD Coin", "2", 8453, usdcAddress);

var requirements = new PaymentRequirements
{
    Scheme = "exact",
    Network = "base",
    MaxAmountRequired = "1000000",  // $1.00 USDC (6 decimals)
    PayTo = "0xReceiverAddress",
    Resource = "/api/premium",
    Description = "Premium content access",
    MaxTimeoutSeconds = 60
};

var response = await x402Client.GetAsync("https://api.example.com/premium", requirements);
```

## Server: Protect Endpoints

Use `X402Middleware` to gate API endpoints behind payment. Define route-based payment requirements:

```csharp
using Nethereum.X402.AspNetCore;
using Nethereum.X402.Server;
using Nethereum.X402.Models;

var builder = WebApplication.CreateBuilder(args);

// Register x402 services with a facilitator URL
builder.Services.AddX402Services("https://facilitator.x402.org");

var app = builder.Build();

// Add x402 middleware with route-specific pricing
app.UseX402(options =>
{
    options.Routes.Add(new RoutePaymentConfig("/api/premium/*", new PaymentRequirements
    {
        Scheme = "exact",
        Network = "base",
        MaxAmountRequired = "1000000",  // $1.00 USDC
        Asset = "USDC",
        PayTo = "0xYourReceiverAddress",
        Resource = "/api/premium",
        Description = "Premium API access",
        MaxTimeoutSeconds = 60
    }));
});

app.MapGet("/api/premium/content", () => Results.Ok(new { data = "Premium content" }));
app.Run();
```

The middleware intercepts requests matching route patterns. If no `X-Payment` header is present, it returns 402 with `PaymentRequirements`. If a valid payment header is present, it verifies and settles through the facilitator before forwarding to the endpoint.

Route patterns support wildcards: `/api/premium/*` matches `/api/premium/content`, `/api/premium/data`, etc.

### Self-Facilitated Server

Instead of delegating to an external facilitator, process payments directly on-chain using either the Transfer or Receive processor:

```csharp
using Nethereum.X402.Extensions;

// Transfer processor: facilitator account submits tx and pays gas
builder.Services.AddX402TransferProcessor(
    facilitatorPrivateKey: Environment.GetEnvironmentVariable("FACILITATOR_KEY"),
    rpcEndpoints: new Dictionary<string, string> { ["base"] = "https://mainnet.base.org" },
    tokenAddresses: new Dictionary<string, string> { ["base"] = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
    chainIds: new Dictionary<string, int> { ["base"] = 8453 },
    tokenNames: new Dictionary<string, string> { ["base"] = "USD Coin" },
    tokenVersions: new Dictionary<string, string> { ["base"] = "2" });
```

Or use the Receive processor, where the receiver submits the transaction and pays gas:

```csharp
builder.Services.AddX402ReceiveProcessor(
    receiverPrivateKey: Environment.GetEnvironmentVariable("RECEIVER_KEY"),
    rpcEndpoints: new Dictionary<string, string> { ["base"] = "https://mainnet.base.org" },
    tokenAddresses: new Dictionary<string, string> { ["base"] = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
    chainIds: new Dictionary<string, int> { ["base"] = 8453 },
    tokenNames: new Dictionary<string, string> { ["base"] = "USD Coin" },
    tokenVersions: new Dictionary<string, string> { ["base"] = "2" });
```

## Two Payment Models

Nethereum.X402 supports two EIP-3009 functions, each with different gas payment responsibilities:

| Model | Service | Who Submits TX | Who Pays Gas |
|-------|---------|---------------|-------------|
| Transfer | `X402TransferWithAuthorisation3009Service` | Facilitator | Facilitator |
| Receive | `X402ReceiveWithAuthorisation3009Service` | Receiver | Receiver |

**Transfer model** — a third-party facilitator submits the transaction. The server doesn't need blockchain infrastructure. Best for API servers that don't want to manage wallets.

**Receive model** — the payment receiver submits the transaction directly. The receiver must have ETH for gas. Best when you want to avoid facilitator fees and already manage an on-chain wallet.

Both implement `IX402PaymentProcessor` with `VerifyPaymentAsync`, `SettlePaymentAsync`, and `GetSupportedAsync`.

## EIP-3009: The Payment Mechanism

x402 uses [EIP-3009](https://eips.ethereum.org/EIPS/eip-3009) (Transfer With Authorization) under the hood. This standard lets a token holder sign an off-chain authorization that anyone can submit to execute the transfer:

- **Gasless for the payer** — the payer only signs, never sends a transaction
- **Nonce-based replay protection** — each authorization has a unique 32-byte random nonce
- **Time-bounded** — `validAfter` and `validBefore` create a validity window
- **Supported tokens** — any EIP-3009 compliant token (USDC on most chains)

### Building Authorizations Directly

For custom payment flows, use the builder and signer classes directly:

```csharp
using Nethereum.X402.Signers;
using Nethereum.X402.Models;

var builder = new TransferWithAuthorisationBuilder();
var signer = new TransferWithAuthorisationSigner();

// Build authorization from payment requirements
var authorization = builder.BuildFromPaymentRequirements(
    requirements, payerAddress);
// Default time window: validAfter = 10 min ago, validBefore = 1 hour from now

// Sign with private key (EIP-712 typed data)
var signature = await signer.SignWithPrivateKeyAsync(
    authorization, "USD Coin", "2", chainId, usdcAddress, payerPrivateKey);

// Or sign with any Web3 account (hardware wallets, KMS)
var signature = await signer.SignWithWeb3Async(
    authorization, "USD Coin", "2", chainId, usdcAddress, web3, signerAddress);
```

## Hosting a Facilitator

You can host your own facilitator as an ASP.NET Core service that exposes verify/settle endpoints:

```csharp
using Nethereum.X402.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddX402TransferProcessor(...);
builder.Services.AddControllers().AddX402FacilitatorControllers();

var app = builder.Build();
app.MapControllers();
app.Run();
```

This exposes `POST /facilitator/verify`, `POST /facilitator/settle`, and `GET /facilitator/supported`.

## Supported Tokens

Any EIP-3009 compliant token works. USDC is pre-configured on common networks:

| Token | Network | Address |
|-------|---------|---------|
| USDC | Ethereum | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| USDC | Base | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| USDC | Polygon | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| USDC | Arbitrum | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| USDC | Optimism | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |

## Error Handling

Both processors return structured error codes in `VerificationResponse.InvalidReason`:

| Error Code | Meaning |
|-----------|---------|
| `insufficient_funds` | Payer doesn't have enough tokens |
| `invalid_exact_evm_payload_signature` | EIP-712 signature verification failed |
| `invalid_exact_evm_payload_authorization_valid_before` | Authorization expired |
| `invalid_exact_evm_payload_authorization_valid_after` | Authorization not yet valid |
| `invalid_exact_evm_payload_recipient_mismatch` | Receiver doesn't match (Receive model) |
| `invalid_exact_evm_payload_authorization_nonce_used` | Nonce already consumed |

## Next Steps

- [Circles UBI](guide-circles) -- interact with the Circles protocol
- [Gnosis Safe](guide-gnosis-safe) -- manage payments from a multi-sig wallet
- [Nethereum.X402 Package Reference](nethereum-x402) -- full API including network configuration, facilitator hosting, and all model types
