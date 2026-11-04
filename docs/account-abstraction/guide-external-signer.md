---
title: "External Signers: Own a Smart Account with a KMS, HSM, or Hardware Wallet"
sidebar_label: "External Signers"
sidebar_position: 7
description: Own an ERC-4337 smart account whose ECDSA key never lives in-process — a cloud KMS (AWS/Azure), an HSM, or a hardware wallet (Ledger/Trezor) signs every UserOperation instead of an in-memory EthECKey.
---

# External Signers: Own a Smart Account with a KMS, HSM, or Hardware Wallet

Every example in [Smart Account Deployment](guide-smart-account-deployment) signs with an `EthECKey` — a private key that exists as bytes inside your process. For a lot of institutional and custody use cases that's not acceptable: the signing key has to live in a cloud Key Management Service, a hardware security module, or a physical device, and it must never be readable by the application process itself. This guide covers that axis: owning a smart account with an **external signer** — `IEthExternalSigner` — where signing happens as a remote or hardware operation instead of an in-process ECDSA computation.

The account itself doesn't change. It is still a plain ECDSA-owned `NethereumSmartAccount`, installed with the same `ECDSAValidator` used everywhere else in Account Abstraction. The only difference is *where the key lives* and *who computes the signature* — the generic on-ramp from [Smart Account Deployment](guide-smart-account-deployment#any-signer-the-generic-on-ramp) doesn't care which `IAccountSigningService` you hand it, so wiring an external signer in is exactly the same shape as wiring a raw key, one level removed.

:::tip The Simple Way

Wrap any `IEthExternalSigner` in `AccountSigningExternalService`, then drive it through the same generic on-ramp as any other signer:

```csharp
using Nethereum.Accounts.AccountMessageSigning;
using Nethereum.AccountAbstraction;
using Nethereum.AccountAbstraction.Client;
using Nethereum.AccountAbstraction.ERC7579.Modules;
using Nethereum.AccountAbstraction.Signing;
using Nethereum.Signer;

// externalSigner is any IEthExternalSigner - a KMS, HSM, or hardware-wallet signer whose private
// key never lives in this process. Nethereum ships AWSKeyManagementExternalSigner,
// AzureKeyVaultExternalSigner, LedgerExternalSigner and TrezorExternalSigner; construct whichever
// one matches your backend (see the table below).
IEthExternalSigner externalSigner = /* your KMS/HSM/hardware-wallet signer */;
var ownerAddress = await externalSigner.GetAddressAsync();

var signingService = new AccountSigningExternalService(externalSigner);
var validator = new EcdsaValidatorModule(deploymentAddresses.EcdsaValidatorAddress);
var initData = AccountInitDataBuilder.BuildEcdsa(deploymentAddresses.EcdsaValidatorAddress, ownerAddress);

var account = await aaClient.CreateAccountAsync(signingService, validator, initData);   // NethereumSmartAccount

myToken.UseAccountAbstraction(account, aaClient);
var receipt = (AATransactionReceipt)await myToken.TransferRequestAndWaitForReceiptAsync(recipient, amount);
Console.WriteLine($"UserOp success: {receipt.UserOpSuccess}, sender: {receipt.Sender}");
```

That's it — no code downstream of `CreateAccountAsync` knows or cares that the owner key lives in a KMS instead of memory. Every signature over a UserOperation hash is produced by a call out to `externalSigner`, never by an in-process private key.

:::

## Prerequisites

```bash
dotnet add package Nethereum.Web3
dotnet add package Nethereum.AccountAbstraction
```

Plus whichever signer package matches your backend — see [Which Signer for Which Backend](#which-signer-for-which-backend) below. You also need `IAAClient` registered (see [Smart Account Deployment](guide-smart-account-deployment#prerequisites) for the full `AddNethereumAccountAbstraction` setup) and the same `NethereumAccountFactory` + `ECDSAValidator` pair deployed on the target chain that any ECDSA-owned account uses — an external signer installs the identical validator, so there's nothing extra to deploy on-chain for it.

## Mental Model: Same ECDSA Account, Key Lives Elsewhere

An external-signer account is not a distinct account type. It's an ordinary ECDSA-owned `NethereumSmartAccount`, installed with the same `EcdsaValidatorModule` and the same `AccountInitDataBuilder.BuildEcdsa` init data as the `EthECKey` path in [Smart Account Deployment](guide-smart-account-deployment#any-signer-the-generic-on-ramp). On-chain, the deployed `ECDSAValidator` reports the external signer's address as owner — indistinguishable from an account owned by an in-process key, because from the chain's perspective it's the same signature scheme (secp256k1/ECDSA) either way.

What changes is entirely client-side: `AccountSigningExternalService` wraps an `IEthExternalSigner` instead of an `EthECKey`, and its `SignTypedDataV4`/`PersonalSign` are delegated out to that signer — `SignTypedDataJsonAsync` for typed data, `SignEthereumMessageAsync` for personal-sign — as a KMS API call or HSM operation rather than an in-memory ECDSA computation. Contrast this with [WebAuthn Passkeys](guide-webauthn-passkeys), the other non-raw-key signer this platform supports: a passkey is a *different* signature scheme (P-256, verified through a WebAuthn validator module), whereas an external signer is still plain secp256k1 ECDSA — just computed somewhere else.

## Which Signer for Which Backend

Nethereum ships one `IEthExternalSigner` implementation per backend, each in its own package so you only pull in the dependency you actually need:

| Backend | Package | Type |
|---------|---------|------|
| AWS Key Management Service | `Nethereum.Signer.AWSKeyManagement` | `Nethereum.Signer.AWSKeyManagement.AWSKeyManagementExternalSigner` |
| Azure Key Vault | `Nethereum.Signer.AzureKeyVault` | `Nethereum.Signer.AzureKeyVault.AzureKeyVaultExternalSigner` |
| Ledger hardware wallet | `Nethereum.Signer.Ledger` | `Nethereum.Ledger.LedgerExternalSigner` |
| Trezor hardware wallet | `Nethereum.Signer.Trezor` | `Nethereum.Signer.Trezor.TrezorExternalSigner` |

Each derives from the shared `Nethereum.Signer.EthExternalSignerBase`. The **KMS signers (AWS, Azure)** are the paths this guide's tested example is shaped after — inject either behind `AccountSigningExternalService` and the on-ramp code above is unchanged. The **hardware-wallet signers (`LedgerExternalSigner`, `TrezorExternalSigner`)** implement the same `IEthExternalSigner`, but signing a UserOperation's EIP-712 typed data through them is **not covered by a test here** — verify on a real device before relying on it for AA (Ledger in particular does not override the base typed-data signing path, so confirm the produced signature recovers to the owner under `ECDSAValidator`). Construction is backend-specific:

```csharp
using Amazon;
using Nethereum.Signer.AWSKeyManagement;

// keyId identifies an asymmetric ECC_SECG_P256K1 key already created in AWS KMS.
IEthExternalSigner externalSigner = new AWSKeyManagementExternalSigner(
    keyId: "arn:aws:kms:...:key/...", region: RegionEndpoint.EUWest1);
```

```csharp
using Azure.Identity;              // DefaultAzureCredential - add the Azure.Identity NuGet package
using Nethereum.Signer.AzureKeyVault;

// keyName identifies an EC-secp256k1 key already created in the given Key Vault.
IEthExternalSigner externalSigner = new AzureKeyVaultExternalSigner(
    keyName: "my-signing-key", vaultUri: "https://my-vault.vault.azure.net/", credential: new DefaultAzureCredential());
```

An MPC (multi-party computation) signer isn't shipped out of the box, but plugs in the exact same way: implement `IEthExternalSigner` (or derive from `EthExternalSignerBase`) against your MPC network's signing API, and hand it to `AccountSigningExternalService` unchanged. Hardware wallets (`LedgerExternalSigner`, `TrezorExternalSigner`) need a connected device and are typically used from a desktop app rather than a server process — see each package's README for device-transport setup.

## What the Runnable Example Actually Injects

A real KMS or hardware device can't run inside a headless test suite, so the passing example this guide is backed by injects a lightweight `EthECKeyExternalSigner` test fixture instead — it implements `IEthExternalSigner` over an ordinary in-memory `EthECKey`, purely to exercise the *shape* a KMS-style external signer has (signing happens outside the normal key call path, `CalculatesV` is `false`, v/recId derived rather than supplied — as with AWS/Azure; the hardware-wallet signers differ, e.g. Trezor supplies v). This fixture is test-only scaffolding, not a shipped Nethereum type — in production, inject `AWSKeyManagementExternalSigner`, `AzureKeyVaultExternalSigner`, `LedgerExternalSigner`, `TrezorExternalSigner`, or your own `IEthExternalSigner` implementation. The on-ramp code — `AccountSigningExternalService`, `EcdsaValidatorModule`, `AccountInitDataBuilder.BuildEcdsa`, `CreateAccountAsync` — is identical regardless of which one you use; only the object passed to `AccountSigningExternalService`'s constructor differs.

## Gotchas

**EIP-7702 needs a raw `EthECKey`, not an external signer.** [EIP-7702 Smart Accounts](guide-eip7702-smart-accounts) upgrades an EOA in place by signing a 7702 authorisation tuple alongside the UserOperation — `IAAClient.ConfigureEip7702` takes an `EthECKey ownerKey` directly, because the authorisation tuple's secp256k1 signature has to be produced by the same key path Nethereum's transaction signing uses, not through the generic `IAccountSigningService` seam. An external signer can own a CREATE2-deployed modular account exactly as shown above, but it cannot currently drive the 7702 tier — that tier requires the raw key be present in-process. If your custody model forbids that, use the CREATE2 on-ramp in this guide instead of 7702.

**Every signature is now a remote or hardware call.** Signing a UserOperation via `AccountSigningExternalService` means a network round-trip to a KMS/HSM, or a user physically approving on a hardware device, instead of a microsecond in-memory computation. Account for the added latency in UserOperation timeouts, and for the service being unavailable (KMS throttling, an unplugged Ledger, a network partition to Azure Key Vault) as a distinct failure mode your error handling needs to catch — a failed `SignAsync`/`SignTypedDataJsonAsync` call surfaces as an exception before a UserOperation is ever sent, not as a bundler rejection.

**The signer only ever needs to expose an address and a signing capability.** The on-ramp calls the signer's `GetAddressAsync()` once (to build the account's init data); `AccountSigningExternalService` itself just exposes `SignTypedDataV4`/`PersonalSign` (two properties wrapping the external signer's typed-data and message signing) and never asks the signer for its private key material — Nethereum never holds one either. If your custody policy requires proving that, audit `Nethereum.Accounts.AccountMessageSigning.AccountSigningExternalService` directly — it is a small, two-property wrapper.

## Next Steps

- [Modular Accounts (ERC-7579)](guide-modular-accounts) — install validators, executors, and hooks on the same ECDSA-owned account an external signer controls.
- [Smart Account Deployment](guide-smart-account-deployment#any-signer-the-generic-on-ramp) — the generic on-ramp this guide builds on, including the `EthECKey` convenience overload.
- [WebAuthn Passkeys](guide-webauthn-passkeys) — the other non-raw-key signer axis, using a P-256 passkey instead of ECDSA.
- [EIP-7702 Smart Accounts](guide-eip7702-smart-accounts) — upgrading an existing EOA in place; requires a raw `EthECKey`, not an external signer.
- [Send a UserOperation](guide-send-useroperation) — build and submit a UserOperation by hand once your account is deployed.
