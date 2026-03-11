---
title: "x402: Crypto Payments"
sidebar_label: "x402 Payments"
sidebar_position: 5
description: Accept HTTP 402 cryptocurrency payments using EIP-3009 signed USDC transfers with Nethereum
---

# x402: Crypto Payments

:::tip The Simple Way
```csharp
// Server: protect an endpoint
[X402PaymentRequired(amount: 1_000000, description: "Premium content")]
public IActionResult GetContent() => Ok(data);

// Client: pay automatically
var x402Client = new X402Client(httpClient, web3, privateKey);
var response = await x402Client.GetAsync("https://api.example.com/premium/content");
```
Add the `[X402PaymentRequired]` attribute to any ASP.NET Core endpoint. Clients pay with a signed EIP-3009 authorization — no manual token transfers needed.
:::

The x402 protocol implements HTTP 402 (Payment Required) for pay-per-request APIs. Instead of subscriptions or API keys, clients pay per call using signed USDC authorizations. The server receives payment proof in the request header, verifies the signature, and submits the transfer on-chain. Nethereum's `Nethereum.X402` package provides both server middleware and a client library.

```bash
dotnet add package Nethereum.X402
```

## How It Works

The payment flow follows the HTTP 402 standard:

```
1. Client → Server:  GET /api/premium/content
2. Server → Client:  402 Payment Required + payment proposal (amount, token, chain)
3. Client:           Signs an EIP-3009 TransferWithAuthorization (off-chain, no gas)
4. Client → Server:  GET /api/premium/content + X-Payment header with signed auth
5. Server:           Verifies signature, submits transfer on-chain
6. Server → Client:  200 OK + content
```

The key insight is that the client never sends a blockchain transaction — they only sign an authorization. The server (or a facilitator) submits the actual transfer, paying the gas. This makes the payment invisible to the end user.

## Server Setup

### Configure Services

Register x402 services in your ASP.NET Core application:

```csharp
using Nethereum.X402;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddX402(options =>
{
    options.RpcUrl = "https://mainnet.infura.io/v3/YOUR-PROJECT-ID";
    options.ChainId = 1;
    options.UsdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    options.PaymentReceiverAddress = "0xYourReceiverAddress";
    options.PaymentReceiverPrivateKey = Environment.GetEnvironmentVariable("PAYMENT_PRIVATE_KEY");
});

builder.Services.AddControllers();
var app = builder.Build();
app.MapControllers();
app.Run();
```

Never hardcode private keys — use environment variables or a secrets manager (Azure Key Vault, AWS Secrets Manager).

### Protect Endpoints

Add the `[X402PaymentRequired]` filter attribute to any endpoint that requires payment:

```csharp
using Microsoft.AspNetCore.Mvc;
using Nethereum.X402.Filters;

[ApiController]
[Route("api/[controller]")]
public class PremiumController : ControllerBase
{
    [HttpGet("content")]
    [X402PaymentRequired(
        amount: 1_000000,  // $1.00 USDC (6 decimals)
        description: "Access to premium content"
    )]
    public IActionResult GetPremiumContent()
    {
        return Ok(new { data = "Premium content here" });
    }
}
```

The amount is in USDC's smallest unit (6 decimals), so `1_000000` = $1.00.

### Dynamic Pricing

For endpoints where the price varies by request:

```csharp
[HttpGet("content/{contentId}")]
[X402PaymentRequired(description: "Premium content")]
public async Task<IActionResult> GetPremiumContent(
    string contentId,
    [FromServices] X402Service x402Service,
    [FromServices] IPricingService pricingService)
{
    var price = await pricingService.GetPriceAsync(contentId, User);

    if (!Request.Headers.ContainsKey("X-Payment"))
    {
        var proposal = await x402Service.CreatePaymentProposalAsync(
            new PaymentRequest { Amount = price, Description = $"Content {contentId}" });
        return StatusCode(402, proposal);
    }

    var payment = ParsePaymentHeader(Request.Headers["X-Payment"]);
    if (payment.Amount < price) return StatusCode(402, new { error = "Insufficient amount" });

    var isValid = await x402Service.VerifyPaymentAsync(payment);
    if (!isValid) return Unauthorized(new { error = "Invalid payment" });

    await x402Service.SubmitPaymentAsync(payment);
    return Ok(await GetContentAsync(contentId));
}
```

### Custom Payment Validation

Add custom rules (minimum amounts, blacklists, rate limits) by implementing `IPaymentValidator`:

```csharp
services.AddX402(options => { /* ... */ })
    .AddPaymentValidator<CustomPaymentValidator>();

public class CustomPaymentValidator : IPaymentValidator
{
    public async Task<bool> ValidateAsync(X402PaymentHeader payment)
    {
        if (payment.Amount < 1.0m) return false;
        if (await IsBlacklistedAsync(payment.From)) return false;
        return true;
    }
}
```

## Client Integration

The `X402Client` wraps `HttpClient` and handles the 402 flow automatically — it receives the payment proposal, signs the EIP-3009 authorization, and retries the request with the payment header:

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Nethereum.X402.Client;

var account = new Account(privateKey);
var web3 = new Web3(account, rpcUrl);

var httpClient = new HttpClient();
var x402Client = new X402Client(httpClient, web3, privateKey);

var response = await x402Client.GetAsync("https://api.example.com/api/premium/content");

if (response.IsSuccessStatusCode)
{
    var content = await response.Content.ReadAsStringAsync();
    Console.WriteLine(content);
}
```

### Using a Facilitator

A facilitator is a third party that submits the on-chain transfer on behalf of the server, so the server doesn't need to manage blockchain infrastructure:

```csharp
var x402Client = new X402Client(httpClient, web3, privateKey)
{
    FacilitatorUrl = "https://facilitator.x402.org"
};
```

You can discover facilitators automatically:

```csharp
var discoveryClient = new FacilitatorDiscoveryClient(httpClient);
var facilitator = await discoveryClient.DiscoverFacilitatorAsync("https://api.example.com");
Console.WriteLine($"Facilitator: {facilitator.Url}, Fee: {facilitator.FeePercentage}%");
```

## EIP-3009: The Payment Mechanism

x402 uses EIP-3009 (Transfer With Authorization) under the hood. This standard allows a token holder to sign an off-chain authorization that anyone can submit to execute the transfer. Key properties:

- **Gasless for the payer** — the payer only signs, never sends a transaction
- **Nonce-based replay protection** — each authorization has a unique random nonce
- **Time-bounded** — `validAfter` and `validBefore` create a validity window
- **Supported tokens** — USDC, PYUSD, EURC (any EIP-3009 compliant token)

```csharp
using Nethereum.Contracts.Standards.EIP3009;

var eip3009Service = web3.Eth.EIP3009;
var usdcService = eip3009Service.GetContractService(usdcAddress);

// Check if an authorization has been used
bool isUsed = await usdcService.AuthorizationStateQueryAsync(senderAddress, nonce);
```

## Supported Tokens

| Token | Network | Address | Decimals |
|-------|---------|---------|----------|
| USDC | Ethereum | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | 6 |
| USDC | Base | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 |
| USDC | Polygon | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` | 6 |
| USDC | Arbitrum | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | 6 |
| USDC | Optimism | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` | 6 |
| PYUSD | Ethereum | `0x6c3ea9036406852006290770BEdFcAbA0e23A0e8` | 6 |
| EURC | Ethereum | `0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c` | 6 |

## Payment Event Monitoring

Track payments with an event handler:

```csharp
services.AddX402(options => { /* ... */ })
    .AddPaymentEventHandler<PaymentEventLogger>();

public class PaymentEventLogger : IPaymentEventHandler
{
    public async Task OnPaymentReceivedAsync(PaymentReceivedEvent evt)
    {
        _logger.LogInformation("Payment: {Amount} USDC from {From}", evt.Amount, evt.From);
    }

    public async Task OnPaymentFailedAsync(PaymentFailedEvent evt)
    {
        _logger.LogError("Payment failed: {Reason} from {From}", evt.Reason, evt.From);
    }
}
```

## Next Steps

- [Circles UBI](guide-circles) -- interact with the Circles protocol
- [Gnosis Safe](guide-gnosis-safe) -- manage payments from a multi-sig wallet
- [Nethereum.X402 Package Reference](nethereum-x402) -- full API including facilitator discovery, resilient clients, and troubleshooting
