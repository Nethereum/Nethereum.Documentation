---
title: Sign-In with Ethereum (SIWE)
sidebar_label: SIWE Authentication
sidebar_position: 6
description: Authenticate users by signing an EIP-4361 message with their Ethereum wallet — session management, NFT gating, smart contract wallets, and RECAP capabilities
---

# Sign-In with Ethereum (SIWE)

Sign-In with Ethereum (EIP-4361) lets users prove ownership of an Ethereum address by signing a structured message. Instead of passwords, your server verifies an Ethereum signature — giving you cryptographic proof of identity tied to an on-chain address. This guide covers building, signing, and verifying SIWE messages, managing sessions, gating access by NFT ownership, supporting smart contract wallets, and using RECAP for fine-grained permissions.

:::tip The Simple Way
```csharp
var siweService = new SiweMessageService();
var message = new SiweMessage { Domain = "myapp.com", Address = userAddress, Uri = "https://myapp.com", Version = "1", ChainId = "1" };
message.SetExpirationTime(DateTime.UtcNow.AddMinutes(30));
string toSign = siweService.BuildMessageToSign(message);
// user signs → you verify:
bool valid = await siweService.IsValidMessage(SiweMessageParser.Parse(toSign), signature);
```
Nonce generation, session tracking, date validation — all automatic.
:::

## How SIWE Works

The SIWE flow has four steps:

1. **Your server generates a message** — domain, address, nonce, expiration
2. **The user signs it** with their wallet (MetaMask, WalletConnect, hardware wallet, etc.)
3. **Your server verifies** the signature matches the claimed address
4. **You issue a session** tied to that verified address

The message format is standardized by [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361), so every wallet knows how to display it — users see a human-readable statement, not raw hex.

## Prerequisites

```bash
dotnet add package Nethereum.Siwe
```

This pulls in `Nethereum.Siwe.Core` (message model, parser, string builder) automatically.

## Build a SIWE Message

A `SiweMessage` represents the structured data the user will sign. The required fields are `Domain`, `Address`, `Uri`, `Version`, `ChainId`, and `Nonce` — but `SiweMessageService` generates the nonce for you:

```csharp
using Nethereum.Siwe;
using Nethereum.Siwe.Core;

var siweService = new SiweMessageService();

var message = new SiweMessage
{
    Domain = "myapp.com",
    Address = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    Statement = "Sign in to access your dashboard",
    Uri = "https://myapp.com",
    Version = "1",
    ChainId = "1"
};
message.SetIssuedAtNow();
message.SetExpirationTime(DateTime.UtcNow.AddMinutes(30));
message.SetNotBefore(DateTime.UtcNow);
```

`SetExpirationTime` and `SetNotBefore` accept `DateTime` values and convert them to ISO 8601 format internally. Use UTC times to avoid timezone issues.

## Sign and Verify

`BuildMessageToSign` does three things: assigns a random nonce via `RandomNonceBuilder`, stores the message in session storage, and returns the canonical text string for the wallet to sign:

```csharp
string messageToSign = siweService.BuildMessageToSign(message);
// → Send messageToSign to the client for wallet signing
```

The returned string follows the EIP-4361 format — your frontend displays it in the wallet's signing dialog. After the user signs, send the signature back to your server.

To verify, parse the message text and call `IsValidMessage`:

```csharp
var parsed = SiweMessageParser.Parse(messageToSign);
bool valid = await siweService.IsValidMessage(parsed, signature);
```

`IsValidMessage` performs four checks in order:
1. **Signature** — recovers the signer address and compares it to `parsed.Address`
2. **Dates** — verifies `NotBefore` has passed and `ExpirationTime` hasn't
3. **Session** — confirms the nonce matches a stored session
4. **User registration** — delegates to `IEthereumUserService` if configured (returns `true` if none)

If any check fails, the method returns `false`.

## Session Management

`SiweMessageService` tracks active sessions via the `ISessionStorage` interface. The default `InMemorySessionNonceStorage` uses a `ConcurrentDictionary` keyed by nonce — suitable for single-server deployments.

For distributed systems, implement `ISessionStorage` to store sessions in Redis, a database, or another shared store:

```csharp
public class RedisSessionStorage : ISessionStorage
{
    public void AddOrUpdate(SiweMessage siweMessage) { /* store by nonce */ }
    public SiweMessage GetSiweMessage(SiweMessage siweMessage) { /* lookup by nonce */ }
    public void Remove(SiweMessage siweMessage) { /* delete by nonce */ }
    public void Remove(string nonce) { /* delete by nonce string */ }
}

var siweService = new SiweMessageService(new RedisSessionStorage());
```

To explicitly end a session (logout), call `InvalidateSession`:

```csharp
siweService.InvalidateSession(parsed);
```

## NFT-Gated Access

The `IEthereumUserService` interface lets you add authorization checks beyond signature verification. The built-in `ERC721BalanceEthereumUserService` checks whether the user holds at least one token from a specified ERC-721 contract:

```csharp
var nftUserService = new ERC721BalanceEthereumUserService(
    "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D", // Bored Apes contract
    "https://mainnet.infura.io/v3/YOUR-PROJECT-ID");

var siweService = new SiweMessageService(
    new InMemorySessionNonceStorage(),
    nftUserService);

// IsValidMessage now also checks NFT ownership
bool valid = await siweService.IsValidMessage(parsed, signature);
```

For custom authorization logic (database lookups, allowlists, token balances), implement `IEthereumUserService`:

```csharp
public class AllowlistUserService : IEthereumUserService
{
    private readonly HashSet<string> _allowed;
    public AllowlistUserService(IEnumerable<string> addresses) =>
        _allowed = new HashSet<string>(addresses, StringComparer.OrdinalIgnoreCase);
    public Task<bool> IsUserAddressRegistered(string address) =>
        Task.FromResult(_allowed.Contains(address));
}
```

## Smart Contract Wallet Support

EOA (externally owned account) signatures use standard `ecrecover`. But smart contract wallets (Gnosis Safe, ERC-4337 accounts) sign differently — they implement [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) on-chain signature validation.

To support both EOA and smart contract wallets, pass a `Web3` instance for on-chain verification:

```csharp
var siweService = new SiweMessageService(
    new InMemorySessionNonceStorage(),
    ethereumUserService: null,
    web3ForERC1271Validation: web3);

// Automatically falls back to ERC-1271/ERC-6492 for smart contract wallets
bool valid = await siweService.IsMessageSignatureValid(parsed, signature);
```

The service first tries standard `ecrecover`. If that fails (the recovered address doesn't match), it calls the contract's `isValidSignature(bytes32, bytes)` method per ERC-1271. It also supports [ERC-6492](https://eips.ethereum.org/EIPS/eip-6492) for counterfactual (not-yet-deployed) smart wallets.

## RECAP: Fine-Grained Capabilities (EIP-5573)

Standard SIWE grants blanket authentication. RECAP (Resource Capability Access Protocol, [EIP-5573](https://eips.ethereum.org/EIPS/eip-5573)) extends SIWE to specify exactly which actions the user authorizes on which resources.

### Build a RECAP Message

Use `SiweRecapMsgBuilder` to add capability declarations to a SIWE message:

```csharp
using Nethereum.Siwe.Core.Recap;

var message = new SiweMessage
{
    Domain = "myapp.com",
    Address = userAddress,
    Uri = "https://myapp.com",
    Version = "1",
    ChainId = "1"
};

var recapMessage = SiweRecapMsgBuilder.Init(message)
    .AddDefaultActions(
        new SiweNamespace("eip155"),
        new HashSet<string> { "sign", "send" })
    .AddTargetActions(
        new SiweNamespace("https"),
        "https://api.myapp.com",
        new HashSet<string> { "read", "write" })
    .Build();
```

The builder automatically generates the Statement text and adds capability URNs to the Resources list. The signed message now explicitly declares what the user is authorizing.

### Check Permissions

After verifying the signature, check whether the signed message grants specific permissions:

```csharp
bool canWrite = recapMessage.HasPermissions(
    new SiweNamespace("https"),
    "https://api.myapp.com",
    "write");

// Verify the Statement text matches the declared permissions
// (prevents tampering with the human-readable text)
bool consistent = recapMessage.HasStatementMatchingPermissions();
```

Use this to enforce fine-grained access control — a user might sign in with permission to read but not write, or to interact with specific contracts but not others.

## REST API Authentication

For .NET 5.0+ applications, `SiweApiUserLoginService<TUser>` provides a client for REST API-based SIWE flows with JWT tokens:

```csharp
using Nethereum.Siwe.Authentication;

var loginService = new SiweApiUserLoginService<User>(
    new HttpClient { BaseAddress = new Uri("https://api.myapp.com") });

// 1. Get a fresh message to sign
string messageToSign = await loginService.GenerateNewSiweMessage(ethereumAddress);

// 2. Authenticate (after user signs)
var response = await loginService.Authenticate(parsedMessage, signature);
string jwt = response.Jwt;

// 3. Get user profile
var user = await loginService.GetUser(jwt);

// 4. Logout
await loginService.Logout(jwt);
```

The default API paths are `authentication/newsiwemessage`, `authentication/authenticate`, `authentication/getuser`, and `authentication/logout` — customize them via constructor parameters.

## Parsing Modes

`SiweMessageParser` offers two parsing strategies:

| Method | Strategy | Use When |
|---|---|---|
| `Parse(text)` | Regex-based | Default — handles most real-world messages |
| `ParseUsingAbnf(text)` | ABNF grammar | Strict EIP-4361 compliance validation |

Both return a `SiweMessage` with all fields populated from the text. The ABNF parser is stricter about format compliance — use it when you need to reject messages that don't follow the spec exactly.

## Common Gotchas

- **Always use UTC** for `SetExpirationTime` and `SetNotBefore`. Using local time causes validation failures across timezones.
- **Nonce reuse** — `BuildMessageToSign` generates a new nonce each time. Don't reuse nonces across messages; each sign-in attempt needs a fresh nonce.
- **Session storage scope** — `InMemorySessionNonceStorage` doesn't survive app restarts. For production, implement `ISessionStorage` with persistent storage.
- **ChainId matters** — set it to match the chain the user is connected to. A message signed for chain `1` (mainnet) should not be accepted on chain `5` (Goerli).

## Next Steps

- **[Blazor Authentication](../blazor-dapp-integration/guide-blazor-authentication)** — Full Blazor Server and WASM authentication flow with `EthereumAuthenticationStateProvider`, route protection, and the `dotnet new nethereum-siwe` starter template
- **[Gnosis Safe](../defi/guide-gnosis-safe)** — Multi-signature wallet interaction (Safe wallets use ERC-1271 for SIWE)
- **[EIP-712 Typed Data Signing](../signing-and-key-management/guide-eip712-signing)** — Structured data signing (different from SIWE's personal message signing)
