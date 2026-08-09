---
title: "WebAuthn Passkeys: Own a Smart Account with No Private Key"
sidebar_label: "WebAuthn Passkeys"
sidebar_position: 9
description: Create an ERC-4337 smart account owned by a WebAuthn/passkey (P-256) credential and send UserOperations signed by the device — no ECDSA private key, no seed phrase, using Nethereum.AccountAbstraction.WebAuthn.
---

# WebAuthn Passkeys: Own a Smart Account with No Private Key

Every other signer covered so far — [EIP-7702](guide-eip7702-smart-accounts), the generic on-ramp in [Smart Account Deployment](guide-smart-account-deployment) — ultimately authenticates with an ECDSA key: something that exists as bytes, has to be generated, backed up, and protected from being copied. A [WebAuthn](https://www.w3.org/TR/webauthn-2/) passkey is different in kind: the private key is a P-256 (secp256r1) key pair generated and held inside a hardware-backed authenticator — a phone's secure enclave, a security key, Windows Hello — that never exports it. There is no seed phrase to write down and no key file to leak; every signature requires the device (and usually a biometric or PIN) to be physically present, which is what makes passkeys phishing-resistant in a way a copy-pasteable private key never can be.

This guide covers Nethereum's passkey signer axis: owning an ERC-4337 smart account with a passkey instead of a private key, through the `Nethereum.AccountAbstraction.WebAuthn` package's `WebAuthnValidatorModule` — an [ERC-7579](guide-modular-accounts) validator for the Rhinestone `WebAuthnValidator` contract — paired with the platform-agnostic P-256 primitives in `Nethereum.WebAuthn`. It builds on the same generic on-ramp introduced in [Smart Account Deployment](guide-smart-account-deployment#any-signer-the-generic-on-ramp): a passkey-owned account is just another `IAccountSigningService` + `IErc7579ValidatorModule` pair, so everything downstream — deploy-on-first-op, typed contract services, batching — works exactly as it does for an ECDSA-owned account.

:::tip The Simple Way

```csharp
using Nethereum.AccountAbstraction;
using Nethereum.AccountAbstraction.Client;
using Nethereum.AccountAbstraction.WebAuthn.Client;
using Nethereum.WebAuthn;

// 1. Register the passkey. SoftwareWebAuthnAuthenticator stands in for a real device here; swap it
//    for BlazorWebAuthnAuthenticator or WindowsWebAuthnAuthenticator and nothing else changes.
var authenticator = new SoftwareWebAuthnAuthenticator(requireUV: false);
var credential = await authenticator.CreateCredentialAsync(new WebAuthnCredentialCreationOptions
{
    RpId = "nethereum.local",
    RpName = "Nethereum AA Demo",
    UserName = "alice"
});

// 2. Create the passkey-owned account through the WebAuthn on-ramp — one usePrecompile flag drives
//    both the validator and the signing service, so they can never disagree.
var account = await aaClient.CreateWebAuthnAccountAsync(
    credential, authenticator, webAuthnValidatorAddress, rpId: "nethereum.local");

// 3. Drive any generated contract service through it exactly like an ECDSA-owned account.
myToken.UseAccountAbstraction(account, aaClient);
var receipt = (AATransactionReceipt)await myToken.TransferRequestAndWaitForReceiptAsync(recipient, amount);
Console.WriteLine($"UserOp success: {receipt.UserOpSuccess}, sender: {receipt.Sender}");
```

That's it — no ECDSA key anywhere. `CreateWebAuthnAccountAsync` derives the counterfactual address, builds the validator's init data, and wires the `IEthSignTypedDataV4` that turns every UserOperation hash into a WebAuthn assertion. Deployment, gas estimation, and sending all go through the same `AAContractHandler` path as any other signer.

:::

## Prerequisites

```bash
dotnet add package Nethereum.Web3
dotnet add package Nethereum.AccountAbstraction
dotnet add package Nethereum.AccountAbstraction.WebAuthn
```

You need `IAAClient` registered (see [Smart Account Deployment](guide-smart-account-deployment#prerequisites) for the full `AddNethereumAccountAbstraction` setup) and the Rhinestone `WebAuthnValidator` (core-modules) contract deployed on your target chain — its address is the `webAuthnValidatorAddress` above. `Nethereum.AccountAbstraction.WebAuthn` ships the generated `WebAuthnValidatorService` you deploy it with; the core AA module has no dependency on WebAuthn/P-256 at all, so this package is purely additive on top of it.

## Mental Model: Two Ids, One Credential

A WebAuthn registration ceremony (`IWebAuthnCredentialFactory.CreateCredentialAsync`) hands back a `WebAuthnCreatedCredential` carrying **two distinct ids** for the same passkey, and keeping them straight matters:

- **`PlatformCredentialId`** — the authenticator's own opaque handle. It's what you pass back to `IWebAuthnAuthenticator.GetAssertionAsync` so the OS/browser picks the right passkey to sign with.
- **`OnChainCredentialId`** — `keccak256(abi.encode(pubKeyX, pubKeyY))`, computed from the public key via `WebAuthnCreatedCredential.OnChainCredentialId`. This is what the on-chain `WebAuthnValidator` stores and looks up.

For `SoftwareWebAuthnAuthenticator` — the software authenticator used throughout this guide and its tests, standing in for a real device — you don't have to keep the two straight: it holds a single key pair and ignores the handle passed to `GetAssertionAsync`, signing regardless of which id it receives (the two ids are in fact different values — a random 16-byte handle vs. the 32-byte keccak). `CreateWebAuthnAccountAsync`/`GetWebAuthnAccount` thread both ids to the roles that consume them automatically, so you don't need to reason about this split day-to-day; it matters on a real platform authenticator, where the handle genuinely selects which stored passkey signs.

Signing itself flows through `WebAuthnAccountSigningService`, the `IAccountSigningService` implementation for passkeys (alongside `AccountSigningOfflineService` for raw keys and `AccountSigningExternalService` for external signers): its `SignTypedDataV4` turns the UserOperation's EIP-712 hash into the WebAuthn `challenge`, gets an assertion from the authenticator, and ABI-encodes the result into the `WebAuthnValidator` signature format. WebAuthn has no equivalent of `personal_sign` over a raw digest — the challenge has to be carried inside `clientDataJSON` and produced by an authenticator assertion — so `WebAuthnAccountSigningService.PersonalSign` throws `NotSupportedException` if you call it; only `SignTypedDataV4` (what UserOperation signing uses) is supported.

## Creating a Passkey Account Through the Generic On-Ramp

The tip above is the same flow proven end-to-end by `WebAuthnOnRampE2ETests` — an ordinary typed contract call with no gas explicitly set, so the bundler's `eth_estimateUserOperationGas` path runs first, seeded by `WebAuthnValidatorModule.GetEstimationStubSignature()`, before the real P-256 assertion is produced for the actual send:

```csharp
using Nethereum.AccountAbstraction;
using Nethereum.AccountAbstraction.Client;
using Nethereum.AccountAbstraction.WebAuthn.Client;
using Nethereum.WebAuthn;

var authenticator = new SoftwareWebAuthnAuthenticator(requireUV: false, origin: "https://nethereum.local");
var credential = await authenticator.CreateCredentialAsync(
    new WebAuthnCredentialCreationOptions { RequireUserVerification = false });

// Exercises the WebAuthn on-ramp helper: single usePrecompile flag + both credential ids threaded
// automatically, instead of building the validator/signing service/init data by hand.
var account = await aaClient.CreateWebAuthnAccountAsync(
    credential, authenticator, webAuthnValidatorAddress, rpId: "nethereum.local");

// Nothing has been sent yet — CreateWebAuthnAccountAsync only derives the counterfactual CREATE2
// address and checks whether something is already deployed there.
Console.WriteLine($"Predicted address: {account.Address}, deployed: {account.IsDeployed}");

aaClient.Configure(myToken, account);

// No explicit gas is set, so AAContractHandler estimates first via the bundler, seeding the request
// with the validator's stub signature, then signs and sends for real.
var receipt = (AATransactionReceipt)await myToken.CountRequestAndWaitForReceiptAsync();
Console.WriteLine($"UserOp success: {receipt.UserOpSuccess}, sender: {receipt.Sender}");
```

`CreateWebAuthnAccountAsync` builds three things from one `usePrecompile` flag so they can never drift apart: the account's init data (via `WebAuthnAccountInitDataBuilder.BuildWebAuthn`), a `WebAuthnValidatorModule` for gas-buffer/signature-prefix duties, and a `WebAuthnAccountSigningService` for signing. Everything after that — deploy-on-first-op, `Configure`/`UseAccountAbstraction`, typed service calls — is identical to the ECDSA tier described in [Smart Account Deployment](guide-smart-account-deployment).

If the account is already deployed — created earlier, by another part of your system, or by the AA demo app's passkey tab — attach to it with the `GetWebAuthnAccount` counterpart instead, which skips deriving init data:

```csharp
var account = aaClient.GetWebAuthnAccount(
    existingAccountAddress, credential, authenticator, webAuthnValidatorAddress, rpId: "nethereum.local");
```

## Real Devices: Platform Authenticators

Everything above uses `SoftwareWebAuthnAuthenticator` — a real P-256 authenticator that produces genuinely valid WebAuthn-shaped assertions with no browser, OS credential store, or hardware key, which is what makes it possible to prove the on-chain validator's signature format end-to-end from a headless test process. It implements the same two seams a real device implements: `IWebAuthnCredentialFactory` (registration) and `IWebAuthnAuthenticator` (assertions).

For an actual application, swap it for a platform authenticator that talks to a real device — nothing else in the flow above changes, because both implement the identical interfaces:

- **`BlazorWebAuthnAuthenticator`** (`Nethereum.WebAuthn.Blazor`) — browser passkeys via `navigator.credentials`, for a Blazor WebAssembly/Server UI.
- **`WindowsWebAuthnAuthenticator`** (`Nethereum.WebAuthn.Windows`) — Windows Hello passkeys via `webauthn.dll`, for a desktop app.

These are source-verified references, not covered by a tagged doc example in this guide — they need a real browser or a real Windows Hello-capable device to exercise, which a headless test run doesn't have. Consult each package's README for setup; the account-creation and signing code shown above is unchanged once you inject a real authenticator in place of the software one.

## Decision: Precompile vs. Fallback Verification

The on-chain `WebAuthnValidator` can verify the P-256 signature two different ways, and `WebAuthnAccountSigningService` and `WebAuthnValidatorModule` both take a matching `usePrecompile` flag that selects which one:

| | `usePrecompile: true` | `usePrecompile: false` (default) |
|---|---|---|
| Verification path | [EIP-7951](https://eips.ethereum.org/EIPS/eip-7951) `P256VERIFY` precompile at address `0x100` | Pure-Solidity FreshCryptoLib fallback, same contract |
| Chain requirement | Osaka hardfork or later | Any chain, including a devchain not configured for Osaka |
| Gas | Cheap — dominated by the staticcall + hashing | Materially more expensive — dominated by the on-chain `ecdsa_verify` |
| Verification-gas buffer | 15,000 (`WebAuthnValidatorModule.GetVerificationGasBuffer()`) | 400,000 |

Pick fallback (the default) unless you know your target chain has activated EIP-7951 — that covers every devchain and most current mainnets. `WebAuthnOnRampPrecompileE2ETests` proves the precompile path genuinely verifies a real signature end-to-end (not just that it decodes) on an Osaka-pinned devchain, with both the signer and the validator built with `usePrecompile: true`:

```csharp
using Nethereum.AccountAbstraction;
using Nethereum.AccountAbstraction.Client;
using Nethereum.AccountAbstraction.WebAuthn.ERC7579.Modules;
using Nethereum.AccountAbstraction.WebAuthn.Signing;
using Nethereum.WebAuthn;

var authenticator = new SoftwareWebAuthnAuthenticator(requireUV: false, origin: "https://nethereum.local");
var (pubKeyX, pubKeyY) = authenticator.GetPublicKey();
var credentialId = WebAuthnValidatorFormat.GenerateCredentialId(pubKeyX, pubKeyY);

var initData = WebAuthnAccountInitDataBuilder.BuildWebAuthn(
    webAuthnValidatorAddress, pubKeyX, pubKeyY, requireUV: false);

// usePrecompile: true on BOTH the signer (bakes the flag into the signature) and the validator module
// (selects the 15k precompile buffer over the 400k FreshCryptoLib fallback buffer) — they must agree.
var validator = new WebAuthnValidatorModule(webAuthnValidatorAddress, usePrecompile: true);
var signingService = new WebAuthnAccountSigningService(authenticator, credentialId, rpId: "nethereum.local", usePrecompile: true);

var account = await aaClient.CreateAccountAsync(signingService, validator, initData);
aaClient.Configure(myToken, account);

var receipt = (AATransactionReceipt)await myToken.CountRequestAndWaitForReceiptAsync();
Console.WriteLine($"UserOp success: {receipt.UserOpSuccess}");
```

The test asserts the steady-state (post-deployment) `VerificationGasLimit` on the precompile path stays under 150,000 gas and strictly below the deploy-inclusive first call's figure — comfortably inside the module's 15,000-gas precompile buffer plus the shared ERC-7579 dispatch cost, and far below where the 400,000-gas fallback buffer would land the same account. Either way, you never compute this buffer yourself: `WebAuthnValidatorModule.GetVerificationGasBuffer()` adds it on top of the bundler's stub-signature estimate automatically, because the estimation stub's challenge can never match the real UserOp hash, so on-chain verification short-circuits before the SHA-256 hashing and P-256 check run — the dummy-signature estimate omits exactly the cost this buffer restores.

## Passkey as a Second Validator Alongside ECDSA

A passkey doesn't have to be the account's only validator. `WebAuthnSecondValidatorE2ETests` installs `WebAuthnValidator` as a **second** validator on an account that already has an ECDSA validator from creation — the same shape a "manage security" screen would offer a user who wants to add a passkey to an existing wallet — and then sends a passkey-signed op through the same generic on-ramp with no gas override:

```csharp
using Nethereum.AccountAbstraction;
using Nethereum.AccountAbstraction.Client;
using Nethereum.AccountAbstraction.Contracts.Core.NethereumAccount;
using Nethereum.AccountAbstraction.WebAuthn.Client;
using Nethereum.AccountAbstraction.WebAuthn.ERC7579.Modules;
using Nethereum.WebAuthn;

// The account already exists, owned by an ECDSA validator — created and deployed as in
// Smart Account Deployment, with no WebAuthn involved yet.
var accountService = new NethereumAccountService(web3, account.Address);
accountService.UseAccountAbstraction(account, aaClient);

// Register the passkey and install it as a second validator, signed by the account's EXISTING
// ECDSA validator via a self-call — the account authorizes its own new validator.
var authenticator = new SoftwareWebAuthnAuthenticator(requireUV: false, origin: "https://nethereum.local");
var credential = await authenticator.CreateCredentialAsync(
    new WebAuthnCredentialCreationOptions { RequireUserVerification = false });
var moduleConfig = new WebAuthnValidatorConfig(webAuthnValidatorAddress, threshold: 1, credential.ToCredential());

var installReceipt = await accountService.InstallModuleAndWaitForReceiptAsync(moduleConfig);
Console.WriteLine($"WebAuthn installed: {await accountService.IsModuleInstalledAsync(moduleConfig)}");

// From here, the SAME address can be driven by a passkey-signed NethereumSmartAccount, with NO gas
// override — WebAuthnValidatorModule.GetVerificationGasBuffer() alone covers the real verification cost.
var passkeyAccount = aaClient.GetWebAuthnAccount(
    account.Address, credential, authenticator, webAuthnValidatorAddress, rpId: "nethereum.local");

aaClient.Configure(myToken, passkeyAccount);
var receipt = (AATransactionReceipt)await myToken.CountRequestAndWaitForReceiptAsync();
Console.WriteLine($"UserOp success: {receipt.UserOpSuccess}");
```

`WebAuthnValidatorConfig` is an `IModuleConfig` — the same install mechanism any [ERC-7579 module](guide-modular-accounts) uses — built from `credential.ToCredential()` (the `WebAuthnCredential` shape the install/init-data builders consume) plus a `threshold` for multi-credential setups. The test that backs this example runs it against both `usePrecompile` values, proving the module's verification-gas buffer alone is sufficient for a real post-deployment op — no manual gas override — on either verification path.

## Gotchas

**`usePrecompile` must agree everywhere.** The flag is baked into the signature by `WebAuthnAccountSigningService` and into the gas buffer by `WebAuthnValidatorModule` independently — if you construct them by hand (rather than through `CreateWebAuthnAccountAsync`/`GetWebAuthnAccount`, which take a single flag for both) and pass mismatched values, the signature's verification path won't match what the validator is actually deployed to check.

**The precompile needs an Osaka-activated chain.** `usePrecompile: true` against a chain that hasn't activated [EIP-7951](https://eips.ethereum.org/EIPS/eip-7951) has no fallback — `WebAuthn.verify` doesn't retry against FreshCryptoLib if the `0x100` staticcall fails or is absent; it returns false outright. Use the default (`false`) on any devchain or chain you haven't explicitly confirmed is past Osaka.

**The fallback costs real gas.** If you're budgeting `VerificationGasLimit` yourself instead of trusting the bundler's estimate, remember the FreshCryptoLib fallback's on-chain `ecdsa_verify` is materially more expensive than the precompile — see the buffer comparison in the decision table above.

**No `personal_sign`.** `WebAuthnAccountSigningService.PersonalSign` throws `NotSupportedException` — WebAuthn has no way to sign an arbitrary raw digest outside a full assertion ceremony. Only `SignTypedDataV4` (what UserOperation signing uses) works.

**7702 doesn't mix with WebAuthn.** The [EIP-7702 upgrade tier](guide-eip7702-smart-accounts#gotchas) requires an `IEip7702AuthSigner`, which only raw-key signers implement. A WebAuthn-owned account has no such signer and can't authorize a 7702 delegation — use the counterfactual CREATE2 tier shown in this guide for passkey accounts.

## Next Steps

- [Modular Accounts (ERC-7579)](guide-modular-accounts) — the module install/uninstall mechanism `WebAuthnValidatorConfig` uses, and other validator/executor/hook types you can combine with a passkey.
- [Smart Account Deployment](guide-smart-account-deployment) — the counterfactual CREATE2 on-ramp this guide builds on, including attaching to already-deployed accounts and non-modular `SimpleAccount`s.
- [Smart Contracts with AA](guide-smart-contracts-with-aa) — everything you can do once a typed contract service is routed through `AAContractHandler`, whichever signer configured it.
- [Batching and Paymasters](guide-batching-and-paymasters) — combine multiple calls in one UserOperation and sponsor gas, on a passkey-owned account exactly as on any other.
