---
title: "EIP-7702 Smart Accounts: Upgrade an EOA in Place"
sidebar_label: "EIP-7702 Smart Accounts"
sidebar_position: 8
description: Upgrade an existing, funded EOA into a modular ERC-7579 smart account in place — same address, one atomic UserOperation — using Nethereum's Account Abstraction EIP-7702 tier.
---

# EIP-7702 Smart Accounts: Upgrade an EOA in Place

Every other account-creation path in Account Abstraction gives you a **new** address: `IAAClient.CreateAccountAsync` derives a counterfactual CREATE2 address and deploys a fresh contract there the first time it sends a UserOperation (see [Smart Account Deployment](guide-smart-account-deployment)). That's fine for a brand-new user, but it's the wrong answer for someone who already has an EOA — with a balance, an on-chain history, and other contracts that trust that address. Moving them to a new smart-account address means transferring funds, updating allowances, and re-pointing anything that references the old one.

EIP-7702 avoids all of that. It lets an EOA delegate its code to a smart-contract implementation while **keeping its own address**. Combined with ERC-4337, the same EOA becomes a modular ERC-7579 account — installs a validator, gains session keys and social recovery, and starts driving UserOperations — without ever moving. This guide covers that specific tier: **AA's EIP-7702 on-ramp**, which upgrades an EOA into a `NethereumSmartAccount` and drives it through Account Abstraction. It is distinct from — and builds on top of — the general EIP-7702 delegation primitive covered in [EIP-7702: EOA Code Delegation](../core-foundation/guide-eip7702), which sends a plain Type-4 transaction with no ERC-4337 involved at all.

:::tip The Simple Way

```csharp
using Nethereum.AccountAbstraction;        // AATransactionReceipt
using Nethereum.AccountAbstraction.Client;
using Nethereum.Signer;

// ownerKey is the EOA's own key — already funded, already has a nonce and history.
var ownerKey = new EthECKey("your-existing-eoa-private-key");

// 1. Build the NethereumSmartAccount identity for that EOA — no address changes, nothing sent yet.
var account = aaClient.CreateEip7702Account(ownerKey, deploymentAddresses.EcdsaValidatorAddress);

// 2. Wire a typed contract service through the EIP-7702 tier.
var accountImplementation = await factory.AccountImplementationQueryAsync(); // NethereumAccountFactory's implementation
aaClient.ConfigureEip7702(myToken, account, ownerKey, accountImplementation);

// 3. Send — this single UserOperation delegates the EOA AND installs the ECDSA validator AND executes.
var receipt = (AATransactionReceipt)await myToken.TransferRequestAndWaitForReceiptAsync(recipient, amount);
Console.WriteLine($"Success: {receipt.UserOpSuccess}, sender (still the EOA): {receipt.Sender}");
```

That's it — no factory, no CREATE2, no address to fund at a new location. `ownerKey` signs both the UserOperation and the EIP-7702 authorisation tuple, and the EOA that sent it is the same address that ends up owning and executing from the smart account.

:::

## Prerequisites

```bash
dotnet add package Nethereum.Web3
dotnet add package Nethereum.AccountAbstraction
```

You will also need `IAAClient` registered (see [Smart Account Deployment](guide-smart-account-deployment) for the full `AddNethereumAccountAbstraction` setup), an already-funded EOA, and a deployed `NethereumAccountFactory` + `ECDSAValidator` pair on the target chain — the same modular-account stack the CREATE2 tier deploys against.

## What Happens On-Chain

A plain EOA has no code. EIP-7702 sets its code to a fixed 23-byte value: the **delegation designator** `0xef0100` followed by the 20-byte implementation address. `0xef` is a banned opcode prefix (EIP-3541), so this exact byte sequence can only ever be produced by a 7702 authorisation — never by a normal deployment — which is how nodes distinguish "this EOA is now delegated" from "this is a real contract."

`ConfigureEip7702` builds an `AAContractHandler` wired with:

- **`WithEip7702Delegation(accountImplementationAddress, factoryData)`** — attaches the signed authorisation tuple to the UserOperation's side channel, and (when `factoryData` is non-null) packs it as a `0x7702`-marker `InitCode` so the EntryPoint treats this as a post-delegation initializer call, not a fresh deploy.
- **`WithErc7579Execution()`** — switches the handler's call encoding to the ERC-7579 `execute` format, because once delegated the EOA behaves exactly like any other `NethereumAccount`.

The `factoryData` is `InitializeAccountFunction { InitData = account.InitData }` — the same `validator ‖ owner` payload `AccountInitDataBuilder.BuildEcdsa` builds for the CREATE2 tier (see [Smart Account Deployment](guide-smart-account-deployment#any-signer-the-generic-on-ramp)), except here it runs as `initializeAccount` directly on the now-delegated EOA instead of being invoked from inside a factory's `createAccount`.

**Delegation and initialization happen atomically, in one UserOperation.** The bundler submits it as a Type-4 transaction that applies the 7702 authorisation on-chain; the EntryPoint then runs `initializeAccount` (installing the ECDSA validator with the EOA itself as owner) and executes your call — all in the same operation. There is no window where the EOA is delegated but not yet initialized, and no separate transaction to forget.

## Decision Guide: 7702 Upgrade vs. a Fresh Account

| | EIP-7702 upgrade (this guide) | Counterfactual CREATE2 (`CreateAccountAsync`) |
|---|---|---|
| Address | Same as the existing EOA | New, derived from factory + salt + init data |
| Best for | An EOA that already holds funds/history/permissions you don't want to move | A brand-new user with no prior on-chain presence |
| Funding | Already funded — no separate deposit to a new address | Must fund the predicted address before first use |
| Reversible? | Delegation can be re-pointed or cleared (see the general [EIP-7702 guide](../core-foundation/guide-eip7702#remove-delegation)) but the address itself never becomes a plain EOA again while delegated | N/A — the smart account was always a separate address |
| Chain support | Requires an EIP-7702-enabled chain (post-Pectra) | Works on any EVM chain with ERC-4337 infra |

If you're greenfield — no existing EOA to preserve — use [Smart Account Deployment](guide-smart-account-deployment) instead; it's simpler and doesn't depend on 7702 chain support.

## The Client Tier: `CreateEip7702Account` + `ConfigureEip7702`

<!-- tag:Eip7702AAContractHandlerTests:Given_ClientCreateEip7702AccountAndConfigureEip7702_When_SendUserOp_Then_DelegatesOnChainAndExecutes -->

```csharp
using Nethereum.AccountAbstraction;        // AATransactionReceipt
using Nethereum.AccountAbstraction.Client;
using Nethereum.AccountAbstraction.Configuration;
using Nethereum.Signer;

var ownerKey = EthECKey.GenerateKey();               // stand-in for an existing, funded EOA's key
var ownerAddress = ownerKey.GetPublicAddress();

// deploymentAddresses wires the same EntryPoint/factory/validator the CREATE2 tier uses.
IAAClient aaClient = new AAClient(web3, deploymentAddresses, bundler);

// Step 1: build the account identity — synchronous, sends nothing. Unlike CreateAccountAsync's
// CREATE2 tier, no address is derived here: the account IS the EOA, so there's no factory query.
var account = aaClient.CreateEip7702Account(ownerKey, deploymentAddresses.EcdsaValidatorAddress);

// Step 2: wire a typed contract service (any ContractWeb3ServiceBase) through the 7702 tier.
var accountImplementation = await factoryService.AccountImplementationQueryAsync();
aaClient.ConfigureEip7702(myToken, account, ownerKey, accountImplementation);

// Step 3: send exactly like any other AA call — the service's own generated Request method.
var receipt = (AATransactionReceipt)await myToken.CountRequestAndWaitForReceiptAsync();
```

`CreateEip7702Account` wraps `ownerKey` in an `AccountSigningOfflineService`, builds an `EcdsaValidatorModule` for `ecdsaValidatorAddress`, and encodes `AccountInitDataBuilder.BuildEcdsa(ecdsaValidatorAddress, ownerAddress)` as the account's `InitData` — the owner is always the EOA itself. `ConfigureEip7702` then takes that `NethereumSmartAccount`, `ownerKey`, and the account implementation address, constructs the `AAContractHandler`, and assigns it to `service.ContractHandler`. From that point the typed service behaves exactly like any AA-routed service (see [Smart Contracts with AA](guide-smart-contracts-with-aa)) — you call its generated `...RequestAndWaitForReceiptAsync` methods and it builds/signs/sends a UserOperation, just with the 7702 authorisation and post-delegation initializer riding along on the first one.

## Lower-Level: `WithEip7702Delegation` + `WithErc7579Execution`

`ConfigureEip7702` is a thin convenience over two `AAContractHandler` fluent methods you can call directly when you need more control — for example, driving the handler with a hand-built `IErc7579ValidatorModule`/`InitData` pair instead of the ECDSA shortcut, or when you're not going through `IAAClient` at all:

<!-- tag:Eip7702AAContractHandlerTests:WithEip7702Delegation_FactoryData_InstallsValidatorOnModularAccount_SendsUserOpFromPlainEoa_DelegatesAndExecutes -->

```csharp
using Nethereum.AccountAbstraction;
using Nethereum.AccountAbstraction.ERC7579.Modules;
using Nethereum.AccountAbstraction.Contracts.Core.NethereumAccount.ContractDefinition;
using Nethereum.Contracts;                 // GetCallData()
using Nethereum.Signer;

var senderKey = EthECKey.GenerateKey();
var senderAddress = senderKey.GetPublicAddress();

// The real modular NethereumAccount stack: same accountImplementation every CREATE2 proxy delegates to.
var accountImplementation = await factoryService.AccountImplementationQueryAsync();

var validator = new EcdsaValidatorModule(ecdsaValidatorAddress);
var initData = AccountInitDataBuilder.BuildEcdsa(ecdsaValidatorAddress, senderAddress);
var factoryData = new InitializeAccountFunction { InitData = initData }.GetCallData();

// The 8-arg ctor overload that takes both an EthECKey (so it can sign the 7702 authorisation tuple)
// and an IErc7579ValidatorModule (so the ERC-7579 signature prefix is correct once delegated).
var handler = new AAContractHandler(
        testCounter.ContractAddress,
        senderAddress,
        senderKey,
        validator,
        bundler,
        entryPointAddress,
        web3)
    .WithEip7702Delegation(accountImplementation, factoryData)
    .WithErc7579Execution();

var receipt = await handler.SendRequestAndWaitForReceiptAsync(new CountFunction());
```

`WithEip7702Delegation(delegateAddress, factoryData)` stores the delegate address and the optional post-delegation initializer calldata; when the handler next builds a UserOperation it signs the authorisation tuple (via the EthECKey-backed `IEip7702AuthSigner`) and — if `factoryData` is supplied — packs the `0x7702`-marker `InitCode`. `WithErc7579Execution()` swaps the handler's call encoder from the SimpleAccount-family default to the ERC-7579 `Erc7579ExecuteEncoder`, which is required once the EOA is driven as a modular `NethereumAccount`. Pass `factoryData: null` if you only want the delegation itself, with no post-delegation initializer call — useful for delegating to a permissive stub or a pre-initialized implementation.

## Gotchas

**Auth is secp256k1-only.** The EIP-7702 authorisation tuple is signed by `IEip7702AuthSigner`, implemented only by raw-key signers (`PrivateKeyEip7702AuthSigner`, wired automatically by the `EthECKey`-taking `AAContractHandler` constructors). A handler built from a generic `IAccountSigningService` — WebAuthn/passkeys, a P-256 signer, anything that isn't backed by a raw `EthECKey` — has no `IEip7702AuthSigner` and throws `NotSupportedException` the moment it tries to apply a 7702 delegation. If your account is signed by something other than an `EthECKey`, use the counterfactual CREATE2 tier instead (see [Smart Account Deployment](guide-smart-account-deployment#any-signer-the-generic-on-ramp)) — `ownerKey` here really must be the EOA's own private key.

**Requires an EIP-7702-enabled chain.** This is a post-Pectra feature. Sending a Type-4-shaped authorisation (or an EntryPoint that expects one) against a chain that doesn't support EIP-7702 fails — there is no fallback path. Check your target chain's fork status before relying on this tier for production traffic.

**Two different nonces are in play.** The authorisation tuple's nonce is the EOA's plain account (transaction) nonce (`eth_getTransactionCount`); the UserOperation's nonce is the EntryPoint's nonce (`EntryPoint.getNonce`). `AAContractHandler` resolves both correctly on your behalf — you don't set either by hand — but if you're debugging a rejected authorisation, don't confuse the two.

**The EOA must start code-less (or already be a 7702 delegation).** A key-controlled EOA either has no code or an existing `0xef0100` delegation designator, and EIP-7702 lets you re-point an existing delegation — but a fresh `initializeAccount` against an already-initialized `NethereumAccount` will revert. (An address holding ordinary contract code is not a plain EOA and cannot be delegated at all.) Check `eth_getCode` first if you're not certain of the account's current state.

## Next Steps

- [EIP-7702: EOA Code Delegation](../core-foundation/guide-eip7702) — the raw delegation primitive this tier builds on, including sponsored delegation and manual authorisation signing.
- [Smart Account Deployment](guide-smart-account-deployment) — the counterfactual CREATE2 tier for accounts that don't need to preserve an existing address.
- [Modular Accounts (ERC-7579)](guide-modular-accounts) — install additional validators, executors, and session keys once the EOA is a modular account.
- [Send a UserOperation](guide-send-useroperation) — what happens under the hood once a service is routed through Account Abstraction.
