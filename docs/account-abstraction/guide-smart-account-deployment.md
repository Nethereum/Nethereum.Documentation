---
title: Smart Account Deployment
sidebar_label: Account Deployment
sidebar_position: 4
description: Create ERC-4337 smart accounts with Nethereum's IAAClient — counterfactual CREATE2 addresses, deploy-on-first-op, and attaching to accounts that already exist.
---

# Smart Account Deployment

Before a smart account can send a UserOperation, it needs an address — and usually a deployed contract at that address. ERC-4337 lets you get the address first: a CREATE2 factory makes it deterministic, so you can compute it, fund it, and let the account deploy itself the moment it sends its first UserOperation. Reach for this guide when you're creating a brand-new account for a user, whichever signer backs it. If the account already exists, jump to [Send a UserOperation](guide-send-useroperation) or [Smart Contracts with AA](guide-smart-contracts-with-aa) instead.

:::tip The Simple Way

`IAAClient` is the on-ramp: one call derives the counterfactual address for a fresh owner key, and routing any typed contract service through it deploys the account automatically on the first call.

```csharp
using Nethereum.AccountAbstraction.Client;
using Nethereum.Signer;

var owner = EthECKey.GenerateKey();
var account = await aaClient.CreateAccountAsync(owner);   // NethereumSmartAccount, not deployed yet

// Fund the counterfactual address so it can pay for its own deployment + first UserOperation
await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(account.Address, 0.1m);

myToken.UseAccountAbstraction(account, aaClient);   // switches ContractHandler to AAContractHandler

// First call deploys the account (via its counterfactual InitCode) and executes atomically
var receipt = (AATransactionReceipt)await myToken.TransferRequestAndWaitForReceiptAsync(recipient, amount);
Console.WriteLine($"Deployed + executed. UserOp success: {receipt.UserOpSuccess}");
```

That's it — no factory calls, no InitCode plumbing. `CreateAccountAsync` just computes the address and checks whether it's deployed yet; the actual deployment happens lazily, wrapped into the first UserOperation the account sends.

:::

## Prerequisites

Install the required packages:

```bash
dotnet add package Nethereum.Web3
dotnet add package Nethereum.AccountAbstraction
```

You will also need `IAAClient` registered via dependency injection:

```csharp
using Microsoft.Extensions.DependencyInjection;
using Nethereum.AccountAbstraction;
using Nethereum.AccountAbstraction.Client;
using Nethereum.AccountAbstraction.Configuration;

var deploymentAddresses = new AADeploymentAddresses(
    EntryPointAddress: EntryPointAddresses.Latest,     // always v0.8+ — see EntryPoint Versions below
    NethereumAccountFactoryAddress: "0x...",           // NethereumAccountFactory deployed on your chain
    EcdsaValidatorAddress: "0x...",                    // ECDSAValidator module deployed on your chain
    VerifyingPaymasterAddress: "");                    // optional, leave empty if unused

services.AddNethereumAccountAbstraction(o => o
    .UseWeb3(web3)
    .UseDeploymentAddresses(deploymentAddresses)
    .UseBundlerUrl("https://your-bundler-url"));       // or .UseBundler(myBundlerService)

var aaClient = serviceProvider.GetRequiredService<IAAClient>();
```

`UseWeb3` can be omitted if an `IWeb3` is already registered in the container — `IAAClient` resolves it from there instead.

## Counterfactual Addresses and Deploy-on-First-Op

`NethereumAccountFactory` deploys accounts via CREATE2, so the address is a deterministic function of the factory, a **salt**, and the account's own **init data** (which validator it installs, and that validator's owner). Given the same three inputs, the address is always the same — before the account exists on-chain and after. `CreateAccountAsync` computes this address, checks `eth_getCode` to see whether something is already deployed there, and hands you back a `NethereumSmartAccount` either way:

```csharp
public async Task<NethereumSmartAccount> CreateAccountAsync(
    IAccountSigningService signingService, IErc7579ValidatorModule validator, byte[] initData, byte[]? salt = null)
{
    salt ??= GenerateSalt();
    var address = await _factoryService.GetAddressQueryAsync(salt, initData);

    var code = await _web3.Eth.GetCode.SendRequestAsync(address);
    var isDeployed = !string.IsNullOrEmpty(code) && code != "0x";

    return new NethereumSmartAccount(address, signingService, validator, isDeployed, salt, initData);
}
```

Nothing is sent to the chain here. The predicted address is safe to use immediately — you can fund it, hand it to a user, or register it elsewhere. When `account.IsDeployed` is `false`, `aaClient.Configure`/`UseAccountAbstraction` attaches the account's factory address, salt, and init data to the `AAContractHandler` as `InitCode`; the first UserOperation the handler builds carries that `InitCode`, and the EntryPoint deploys the account before running the call. Every UserOperation after that omits `InitCode`, because by then the account has code.

Changing the salt, the owner, or the validator produces a different address — keep these values consistent between the moment you predict/fund the address and the moment you actually deploy.

## Any Signer: The Generic On-Ramp

`CreateAccountAsync(EthECKey owner, ...)` is a convenience overload for the common ECDSA case — it wraps the key in `AccountSigningOfflineService`, builds an `EcdsaValidatorModule`, and encodes the validator's init data for you. The underlying on-ramp takes any `IAccountSigningService` paired with the `IErc7579ValidatorModule` that authenticates it, so the identical shape works for a KMS/HSM/MPC signer or WebAuthn — with zero changes to `IAAClient` itself (see [External Signer](guide-external-signer) for the KMS/HSM path and its hardware-wallet caveats):

```csharp
using Nethereum.Accounts.AccountMessageSigning;
using Nethereum.AccountAbstraction.Client;
using Nethereum.AccountAbstraction.ERC7579.Modules;
using Nethereum.AccountAbstraction.Signing;
using Nethereum.Signer;

// externalSigner is any IEthExternalSigner - a Key Vault/HSM/hardware-wallet signer whose key never
// lives in-process. Nethereum ships several (AWSKeyManagementExternalSigner, AzureKeyVaultExternalSigner,
// LedgerExternalSigner, TrezorExternalSigner, ...), each in its own package; write your own for anything
// else. (WebAuthn/passkeys plug in one level up, as a full IAccountSigningService of their own -
// WebAuthnAccountSigningService, shipped in Nethereum.WebAuthn - rather than as an IEthExternalSigner.)
IEthExternalSigner externalSigner = /* your Key Vault/HSM/hardware-wallet signer */;
var ownerAddress = await externalSigner.GetAddressAsync();

var signingService = new AccountSigningExternalService(externalSigner);
var validator = new EcdsaValidatorModule(deploymentAddresses.EcdsaValidatorAddress);
var initData = AccountInitDataBuilder.BuildEcdsa(deploymentAddresses.EcdsaValidatorAddress, ownerAddress);

var account = await aaClient.CreateAccountAsync(signingService, validator, initData);   // NethereumSmartAccount
Assert.False(account.IsDeployed);

myToken.UseAccountAbstraction(account, aaClient);
var receipt = (AATransactionReceipt)await myToken.TransferRequestAndWaitForReceiptAsync(recipient, amount);
```

`AccountInitDataBuilder.Build`/`BuildEcdsa` encode the validator's own init payload (`validator ‖ owner` for `EcdsaValidatorModule`); other validator modules (WebAuthn, MPC, session keys, ...) supply their own `IModuleConfig`-driven init data the same way — see [Modular Accounts](guide-modular-accounts). Everything downstream — counterfactual address derivation, deploy-on-first-op, `Configure` — is identical to the `EthECKey` tier above, because `CreateAccountAsync(owner)` calls straight through to this same overload.

On-chain, the account really is owned by the external signer's key, not a copy held by Nethereum: after the deploy-on-first-op UserOperation lands, the installed `ECDSAValidator` reports the external signer's address as owner, and every subsequent call still routes signing through `externalSigner`.

## Attach to an Already-Deployed Account

If the account already exists — created earlier, or by another part of your system — skip `CreateAccountAsync` and wrap the address directly. No factory or init data is attached, so a service configured this way never attempts a deploy-on-first-op:

```csharp
using Nethereum.Accounts.AccountMessageSigning;

// Modular (ERC-7579) account — you also need the validator it was created with
var signingService = new AccountSigningOfflineService(ownerKey);
var validator = new EcdsaValidatorModule(deploymentAddresses.EcdsaValidatorAddress);
var account = aaClient.GetAccount(existingAccountAddress, signingService, validator);   // NethereumSmartAccount

var handler = aaClient.Configure(myToken, account);
var receipt = (AATransactionReceipt)await myToken.TransferRequestAndWaitForReceiptAsync(recipient, amount);
```

For a plain, non-modular ERC-4337 account (e.g. a `SimpleAccount`) that has no ERC-7579 validator at all, drop the validator argument — `GetAccount` has an overload that returns a plain `SmartAccount` instead:

```csharp
var account = aaClient.GetAccount(existingAccountAddress, signingService);   // SmartAccount, no validator
var handler = aaClient.Configure(myToken, account);
```

**Modular vs non-modular, when to use which:** reach for the `NethereumSmartAccount`/validator tier whenever you want ERC-7579 features later — session keys, social recovery, spending-limit policies, swappable validators (see [Modular Accounts](guide-modular-accounts)) — since that's what `NethereumAccountFactory` deploys. Use the plain `SmartAccount` tier only to attach to an account that was never modular in the first place, such as an existing `SimpleAccount` deployment; there is no path to add ERC-7579 modules to it after the fact.

## Deploying Upfront Instead of Lazily

`CreateAccountAsync` defers deployment to the first UserOperation, which is the right default for a new user who hasn't funded their account yet. Sometimes you want the account deployed immediately instead — for example, to hand a fully-live address to another contract. Call the factory directly:

```csharp
using Nethereum.AccountAbstraction.Contracts.Core.NethereumAccountFactory;

var factoryService = new NethereumAccountFactoryService(web3, deploymentAddresses.NethereumAccountFactoryAddress);

var salt = /* 32 bytes, e.g. a per-user counter or random value */;
var initData = AccountInitDataBuilder.BuildEcdsa(deploymentAddresses.EcdsaValidatorAddress, ownerAddress);

// Predict, same address CreateAccountAsync would derive
var predictedAddress = await factoryService.GetAddressQueryAsync(salt, initData);

// Fund it — the factory transaction itself is paid by the caller's EOA, not the new account
await web3.Eth.GetEtherTransferService().TransferEtherAndWaitForReceiptAsync(predictedAddress, 0.05m);

// Deploy immediately as a regular transaction
await factoryService.CreateAccountRequestAndWaitForReceiptAsync(salt, initData);

var accountService = new NethereumAccountService(web3, predictedAddress);
Console.WriteLine($"Deployed: {await accountService.IsDeployedAsync()}");   // true
```

This sends a normal transaction from your `Web3` account, not a UserOperation — useful for setup scripts and admin flows where a bundler isn't involved yet. `NethereumAccountService` here is the generated contract service for the on-chain `NethereumAccount`, distinct from the client-side `NethereumSmartAccount` identity object `IAAClient` hands you; once deployed, you can still drive it through Account Abstraction with `aaClient.GetAccount(predictedAddress, signingService, validator)`.

## Under the Hood: InitCode in a Raw UserOperation

Everything above wraps the same mechanism `UserOperation.InitCode` exposes directly: the factory address concatenated with the calldata for its `createAccount` call. If you're building UserOperations by hand (see [Send a UserOperation](guide-send-useroperation)) rather than through a typed contract service, set `InitCode` yourself. This example uses `SimpleAccountFactoryService` from the separate `Nethereum.AccountAbstraction.SimpleAccount` package — the non-modular `SimpleAccount` factory, whose salt is a `BigInteger` rather than the 32-byte salt `NethereumAccountFactory` takes above:

```csharp
using Nethereum.AccountAbstraction;
using Nethereum.AccountAbstraction.SimpleAccount.SimpleAccountFactory;
using System.Numerics;

var salt = (BigInteger)Random.Shared.NextInt64();
var initCode = accountFactoryService.GetCreateAccountInitCode(ownerAddress, salt);

var userOp = new UserOperation
{
    Sender = counterfactualAddress,
    InitCode = initCode,
    CallData = executeFunction.GetCallData(),
    MaxFeePerGas = maxFeePerGas,
    MaxPriorityFeePerGas = maxPriorityFeePerGas,
    // A correctly-sized dummy signature. A strict bundler runs real signature recovery during
    // simulateValidation, so estimation needs a stub of the right shape (the real signature is
    // produced later, once gas is known). For SimpleAccount this is a 65-byte ECDSA-shaped stub;
    // a modular validator supplies one via IErc7579ValidatorModule.GetEstimationStubSignature().
    Signature = dummySignature
};

// bundlerService here is the in-process Nethereum.AccountAbstraction.Bundler IBundlerService, held
// directly. Over JSON-RPC (AccountAbstractionBundlerService, what UseBundlerUrl wires) the
// equivalent is:
//   var estimate = await bundlerService.EstimateUserOperationGas
//       .SendRequestAsync(UserOperationConverter.ToRpcFormat(userOp), entryPointAddress);
var estimate = await bundlerService.EstimateUserOperationGasAsync(userOp, entryPointAddress);

// Deploying costs real CREATE2 gas on top of validation — the bundler's estimate already
// accounts for it, but pad verificationGasLimit a little further for safety on the first op.
userOp.VerificationGasLimit = (long)(estimate.VerificationGasLimit.Value * 15 / 10);
userOp.CallGasLimit = (long)(estimate.CallGasLimit.Value * 12 / 10);
userOp.PreVerificationGas = (long)estimate.PreVerificationGas.Value;
```

When the EntryPoint sees a `Sender` with no code, it runs `InitCode` first, then proceeds with validation and execution in the same UserOperation — the same one-shot deploy-and-execute the `IAAClient` tiers above give you for free. Once the account exists, subsequent UserOperations must leave `InitCode` empty; sending it again on a deployed account reverts.

## Common Mistakes

**Not funding the counterfactual address** — the account (or its paymaster) needs ETH before its first UserOperation. `EstimateUserOperationGas`/`simulateValidation` checks the balance during validation; an unfunded account fails with an `AA21 didn't pay prefund` error surfaced through the bundler. Fund the predicted address — `account.Address` — before sending the first operation.

**Reusing a salt with a different owner or validator** — the CREATE2 address depends on the factory, the salt, and the init data together. Compute the address with the exact salt/init-data pair you intend to deploy with; changing any of them after predicting gives you a different, unfunded address.

**Passing a `NethereumSmartAccount` where a `SmartAccount` overload is called** — `NethereumSmartAccount` derives from `SmartAccount`, so `Configure`/`UseAccountAbstraction` accepts either statically. Internally it checks the runtime type and always applies the ERC-7579 encoding for a modular account, so this isn't a correctness trap — but if you're attaching to an account you know is modular, prefer the `NethereumSmartAccount` overload of `GetAccount` explicitly so the validator is set and later module operations (session keys, recovery) have something to install against.

**Deploying to the wrong EntryPoint** — a smart account is bound to the EntryPoint its factory was configured with at deployment time. Sending its UserOperations through a different EntryPoint fails validation.

## EntryPoint Versions

```csharp
var entryPointAddress = EntryPointAddresses.Latest; // v0.9
```

| Constant | Version | Notes |
|----------|---------|-------|
| `EntryPointAddresses.V06` | v0.6 | **Not supported** — legacy `keccak256` userOpHash. Throws `NotSupportedException`. |
| `EntryPointAddresses.V07` | v0.7 | **Not supported** — same legacy userOpHash format. Throws `NotSupportedException`. |
| `EntryPointAddresses.V08` | v0.8 | First version this library can sign for (EIP-712 userOpHash). |
| `EntryPointAddresses.V09` | v0.9 | `0x433709009B8330FDa32311DF1C2AFA402eD8D009` |
| `EntryPointAddresses.Latest` | v0.9 | Alias for `V09` — use this unless you need a specific version. |

Nethereum signs the EIP-712 `userOpHash` introduced in EntryPoint v0.8; v0.6/v0.7 used the older `keccak256(abi.encode(...))` scheme, which would produce a signature the older EntryPoint rejects on-chain (`AA24`). `EntryPointAddresses.ValidateSupportedUserOpHashVersion` rejects `V06`/`V07` up front rather than letting that fail at the bundler. Always deploy against `V08` or `V09` (`Latest`).

## Next Steps

- [EIP-7702 Smart Accounts](guide-eip7702-smart-accounts) — upgrade an existing, funded EOA into a modular account in place instead of deploying a new counterfactual address.
- [WebAuthn Passkeys](guide-webauthn-passkeys) — own the account with a passkey instead of an `EthECKey`, using the same generic on-ramp.
- [External Signers](guide-external-signer) — sign with a cloud KMS, HSM, or hardware wallet instead of an in-process key.
- [Modular Accounts](guide-modular-accounts) — install ERC-7579 validators, executors, hooks, and session keys on a modular account.
- [Send a UserOperation](guide-send-useroperation) — build and submit a UserOperation by hand once your account is deployed.
- [Batching and Paymasters](guide-batching-and-paymasters) — combine multiple calls in one UserOperation and sponsor gas with paymasters.
