---
title: "Social Recovery: N-of-M Guardian Quorum Account Recovery"
sidebar_label: "Social Recovery"
sidebar_position: 11
description: Recover a smart account after a lost owner key using an N-of-M guardian quorum — no single guardian can act alone — with Nethereum's SocialRecoveryConfig, SocialRecoveryValidatorModule, and MultiGuardianSigningService.
---

# Social Recovery: N-of-M Guardian Quorum Account Recovery

Every signer covered elsewhere in this section — an ECDSA key, a passkey, a session key — assumes you still have *some* working credential to authenticate with. Social recovery answers the question those approaches cannot: **what happens when the owner key itself is gone?** A phone is lost, a seed phrase is destroyed, a hardware wallet dies — and there is no key left to sign anything, so no session key, no second validator, and no policy can help, because all of them still need to be installed or invoked by an existing authorized signer. Social recovery has to be set up *before* that happens: a set of guardians — friends, family, hardware wallets you control, or other trusted parties — is installed on the account in advance, so that later, if the owner key is ever lost, a **quorum** of those guardians (not any single one) can co-sign a UserOperation that rotates the account to a new owner key. No individual guardian can act alone, and guardians have no day-to-day authority over the account at all — only the collective quorum, exercised once, to recover it.

This guide builds on [Modular Accounts](guide-modular-accounts#social-recovery), which showed installing `SocialRecoveryConfig` as a one-liner. Here we go through the full lifecycle: configuring an N-of-M guardian quorum, having that quorum actually recover a lost account by rotating its owner, and proving on-chain that a quorum one guardian short of the threshold is rejected — not just discouraged, genuinely unable to move the account.

:::tip The Simple Way

```csharp
using Nethereum.AccountAbstraction; // AATransactionReceipt
using Nethereum.AccountAbstraction.Client;
using Nethereum.AccountAbstraction.Contracts.Core.NethereumAccount;
using Nethereum.AccountAbstraction.ERC7579.Modules;

var accountService = new NethereumAccountService(web3, account.Address);
accountService.UseAccountAbstraction(account, aaClient);

// Install SocialRecovery with a 2-of-3 guardian quorum, signed by the account's CURRENT owner.
var receipt = (AATransactionReceipt)await accountService.InstallSocialRecoveryAndWaitForReceiptAsync(
    socialRecoveryAddress, threshold: 2, new[] { guardian1, guardian2, guardian3 });
```

That's it — any 2 of those 3 guardians can now recover the account if its owner key is ever lost. ABI-encoding the guardian list, the module type id, fees, gas, and nonce are all automatic.

:::

## Prerequisites

```bash
dotnet add package Nethereum.AccountAbstraction
dotnet add package Nethereum.Web3
```

You need everything [Modular Accounts](guide-modular-accounts#prerequisites) needs — an `IAAClient`, a deployed ERC-7579-compatible `NethereumAccount` with at least one validator installed (typically `ECDSAValidator`) — plus a deployed `SocialRecovery` module contract (`SocialRecoveryService.DeployContractAndGetServiceAsync`, a generated Nethereum contract service — no hand-written ABI). Namespaces used throughout:

```csharp
using System.Linq;
using Nethereum.AccountAbstraction; // AATransactionReceipt
using Nethereum.AccountAbstraction.Client;
using Nethereum.AccountAbstraction.Contracts.Core.NethereumAccount;
using Nethereum.AccountAbstraction.Contracts.Modules.Native.ECDSAValidator;
using Nethereum.AccountAbstraction.ERC7579.Modules;
using Nethereum.AccountAbstraction.ERC7579.Modules.MultiGuardian;
using Nethereum.AccountAbstraction.ERC7579.Modules.SocialRecovery;
using Nethereum.AccountAbstraction.Validation; // Erc7769ErrorCodes
using Nethereum.JsonRpc.Client; // RpcResponseException
using Nethereum.Signer; // EthECKey
```

## Mental Model: Guardians, Threshold, and Recovery-as-Owner-Rotation

`SocialRecovery` is an ERC-7579 `TYPE_VALIDATOR` module, installed on the account exactly like `ECDSAValidator` or `SmartSession`, with two pieces of on-chain configuration per account: a **guardian list** (`List<string>` of addresses) and a **threshold** (`BigInteger`) — the number of guardian signatures a recovery must carry (`SocialRecoveryConfig`, `src/Nethereum.AccountAbstraction/ERC7579/Modules/SocialRecovery/SocialRecoveryConfig.cs`). Guardians never get day-to-day control — they are not a second set of owners. The only thing a guardian quorum can do is co-sign a UserOperation, and that UserOperation is itself restricted on-chain to a single `execute()` call whose target is a currently-installed `TYPE_VALIDATOR` module — in practice, calling `transferOwnership` on the account's `ECDSAValidator` to rotate the owner to a new key.

Recovery is **not** a two-phase "propose, then wait, then approve" flow. It is a single co-signed UserOperation: each guardian in the quorum signs the same userOp hash with their own key, `MultiGuardianSignatureBlobBuilder` concatenates the `threshold` signatures (ascending by guardian address) into one `CheckNSignatures`-compatible blob, and `SocialRecoveryValidatorModule` prefixes that blob with the module's own address — the same 20-bytes-then-signature shape every `IErc7579ValidatorModule` in this codebase uses. Two purpose-built types carry this:

| Type | Role |
|---|---|
| `SocialRecoveryConfig` | Builds the module's install-time init data — `Threshold` + `Guardians` |
| `SocialRecoveryValidatorModule` | The `IErc7579ValidatorModule` that identifies the installed module and prefixes a recovery signature with its address |
| `MultiGuardianSigningService` | The `IAccountSigningService` that has a quorum of guardian keys co-sign a UserOperation — generic over any `CheckNSignatures`-based validator, not SocialRecovery-specific |

Because the guardian quorum is just another `IAccountSigningService` + `IErc7579ValidatorModule` pair, it attaches to the account the exact same way every other signer in this section does — via `IAAClient.GetAccount`, covered in [Smart Account Deployment](guide-smart-account-deployment#any-signer-the-generic-on-ramp).

## Configure an N-of-M Guardian Quorum

Guardians are ordinary `EthECKey`s here — in a real deployment each key would belong to a different trusted party (a friend's wallet, a hardware key, a second device), not all generated by the same process. The on-chain `onInstall` guard requires the guardian list to be **sorted ascending by address and free of duplicates** (`SocialRecovery.sol`'s `isSortedAndUniquified` check, which reverts `NotSortedAndUnique()` otherwise) — `MultiGuardianSignatureBlobBuilder.SortAddressesAscending` gives you that exact ordering, so use it before installing:

```csharp
var guardianKeys = Enumerable.Range(0, guardianCount)
    .Select(_ => EthECKey.GenerateKey())
    .ToArray();

var sortedGuardians = MultiGuardianSignatureBlobBuilder.SortAddressesAscending(
    guardianKeys.Select(k => k.GetPublicAddress()));

var accountService = new NethereumAccountService(web3, account.Address);
accountService.UseAccountAbstraction(account, aaClient);

var receipt = (AATransactionReceipt)await accountService.InstallSocialRecoveryAndWaitForReceiptAsync(
    socialRecoveryAddress, threshold, sortedGuardians);
```

This is signed by the account's **current owner** — the same self-call pattern every module install uses (see [Modular Accounts](guide-modular-accounts#module-types)) — the guardians are not involved in their own installation. It also composes with counterfactual deploy-on-first-op exactly like any other first UserOperation: if the account hasn't been deployed yet, the same op both deploys it (via the factory's `initCode`) and installs `SocialRecovery`.

(Adapted from `SocialRecoveryViewModel.SetupGuardiansAsync`; proven end-to-end by `Given_a_funded_ecdsa_account_When_setting_up_guardians_Then_isModuleInstalled_becomes_true` — `LastReceipt.UserOpSuccess` is true and `IsModuleInstalledAsync` confirms it, `SocialRecoveryViewModelTests.cs`.)

`SocialRecoveryConfig` also has a fluent builder (`.WithGuardian(address).WithThreshold(n)`) and validates itself before ever reaching the chain: `GetInitData()` throws `InvalidOperationException` if `Guardians` is empty, or if `Threshold` is not between 1 and the guardian count — the same rule `SocialRecovery.sol`'s own `onInstall` enforces on-chain, checked client-side first.

## A Guardian Quorum Recovers the Account

The account's owner key is now lost — this is the scenario social recovery exists for. A quorum of `threshold` guardians (any `threshold` of the installed set — order doesn't matter, only which ones sign) co-signs a UserOperation that calls `transferOwnership` on the account's `ECDSAValidator`, through a **second, independent** `NethereumSmartAccount` attached to the same address:

```csharp
var newOwner = EthECKey.GenerateKey();

// A guardian quorum co-signs the recovery userOp - the account's owner is never involved.
var guardianSigningService = new MultiGuardianSigningService(guardianKeys, threshold);
var socialRecoveryValidator = new SocialRecoveryValidatorModule(socialRecoveryAddress, threshold);
var recoveryAccount = aaClient.GetAccount(account.Address, guardianSigningService, socialRecoveryValidator);

// Driven through the RECOVERY TARGET's own typed service (ECDSAValidatorService), not
// NethereumAccountService.ExecuteAsync - see the gotcha below for why that distinction matters.
var ecdsaValidatorService = new ECDSAValidatorService(web3, ecdsaValidatorAddress);
ecdsaValidatorService.UseAccountAbstraction(recoveryAccount, aaClient);

var receipt = (AATransactionReceipt)await ecdsaValidatorService.TransferOwnershipRequestAndWaitForReceiptAsync(
    newOwner.GetPublicAddress());

var rotatedOwner = await ecdsaValidatorService.GetOwnerQueryAsync(account.Address);
// rotatedOwner == newOwner.GetPublicAddress() - the owner has genuinely rotated.
```

(Adapted from `SocialRecoveryViewModel.RecoverAsync`; proven end-to-end by `Given_installed_guardians_When_a_quorum_recovers_Then_the_owner_rotates_to_the_new_key` — the receipt succeeds and `ECDSAValidatorService.GetOwnerQueryAsync` reads back the new owner directly from the validator the guardians never touch themselves, `SocialRecoveryViewModelTests.cs`.)

Notice what did **not** happen: neither the old owner key nor the new owner key ever signed anything. The rotation is authorized entirely by the guardian quorum through `SocialRecoveryValidatorModule`. The same test file also proves the rotation is not merely a value `GetOwner` returns — a plain `count()` UserOperation signed by the *new* owner key genuinely succeeds afterward, confirming the new key controls the account for real (`Given_a_completed_recovery_When_switching_to_the_new_owner_Then_it_genuinely_controls_the_account`, `SocialRecoveryViewModelTests.cs`).

## Under-Threshold Rejection: The Quorum Is Enforced On-Chain

The entire point of a threshold is that fewer guardians than that **cannot** recover the account — not merely that Nethereum's client-side code discourages it, but that the chain itself rejects it. Take one guardian away from a satisfied quorum and attempt the same recovery:

```csharp
var partialGuardianKeys = guardianKeys.Take(threshold - 1).ToArray();
var partialThreshold = partialGuardianKeys.Length; // one short of the installed threshold

var ownerBefore = await ecdsaValidatorService.GetOwnerQueryAsync(account.Address);

// The client-side blob is well-formed for THIS smaller quorum - MultiGuardianSigningService has no
// way to know the real on-chain threshold is higher.
var partialSigningService = new MultiGuardianSigningService(partialGuardianKeys, partialThreshold);
var partialValidator = new SocialRecoveryValidatorModule(socialRecoveryAddress, partialThreshold);
var partialAccount = aaClient.GetAccount(account.Address, partialSigningService, partialValidator);

var attemptedNewOwner = EthECKey.GenerateKey();
ecdsaValidatorService.UseAccountAbstraction(partialAccount, aaClient);

try
{
    await ecdsaValidatorService.TransferOwnershipRequestAndWaitForReceiptAsync(attemptedNewOwner.GetPublicAddress());
}
catch (InvalidOperationException ex) when (ex.InnerException is RpcResponseException rpcEx &&
                                             rpcEx.RpcError.Code == Erc7769ErrorCodes.SimulateValidation)
{
    // Rejected during bundler gas estimation (AA23) - the REAL on-chain threshold is still the
    // installed value, so CheckSignatures' length guard rejects the undersized blob.
}

var ownerAfter = await ecdsaValidatorService.GetOwnerQueryAsync(account.Address);
// ownerAfter == ownerBefore - the under-threshold attempt changed nothing.
```

(Adapted from `SocialRecoveryViewModel.TryUnderThresholdRecoveryAsync`; proven end-to-end by `Given_installed_guardians_When_an_under_threshold_quorum_attempts_recovery_Then_it_is_rejected_and_the_owner_is_unchanged` — the rejection is caught by its specific ERC-4337 error code (`Erc7769ErrorCodes.SimulateValidation`, the client-side equivalent of the bundler's `AA23`), and the test confirms the owner address is byte-for-byte unchanged afterward, `SocialRecoveryViewModelTests.cs`.) The rejection happens during the bundler's gas-estimation simulation, before the real op is ever sent — the (threshold-1)-signature blob is too *short* for `CheckSignatures.recoverNSignatures`' length guard, which reverts `InvalidSignature()` on-chain.

There is a second, distinct rejection path worth knowing about even though it isn't backed by a tagged example here: a **correctly-sized** blob signed entirely by non-guardian keys passes the length guard but fails `SocialRecovery`'s guardian-membership check instead, surfacing as `AA24` at send time rather than `AA23` during estimation — source-verified against `SocialRecovery.sol` and exercised by `Given_a_non_guardian_quorum_When_they_attempt_recovery_Then_it_is_rejected_and_the_owner_is_unchanged` in `tests/Nethereum.AccountAbstraction.IntegrationTests/Modules/SocialRecovery/SocialRecoveryWorkflowE2ETests.cs` (a passing test, not tagged for this guide).

## Advanced: Changing the Guardian Set Later

`SocialRecoveryService` — the generated contract service for the module itself — also exposes `AddGuardianRequestAsync(guardian)`, `RemoveGuardianRequestAsync(prevGuardian, guardian)`, and `SetThresholdRequestAsync(threshold)` (`src/Nethereum.AccountAbstraction/Contracts/Modules/Rhinestone/SocialRecovery/SocialRecoveryService.gen.cs`). On-chain, each of these reads `account = msg.sender` (`SocialRecovery.sol`) — they are self-calls the account makes about its own guardian set, the same shape as installing the module in the first place, and would be driven through whichever validator currently authorizes the account (typically the owner's `ECDSAValidator`), not through the recovery quorum. **No test in this codebase currently exercises them** — this paragraph is source-verified against the generated service and the Solidity contract, not backed by a tagged doc example. Use them to evolve a guardian set (a guardian's key is replaced, a new guardian is added, the threshold is raised) while the account's existing owner key still works — not as part of a lost-key recovery itself.

## Decision: Social Recovery vs. a Second Validator vs. a Session Key

All three modules attach through the same [ERC-7579](guide-modular-accounts) install mechanism, but they solve different problems — see [Smart Sessions and Policies](guide-smart-sessions-and-policies#decision-session-key-vs-second-validator-vs-social-recovery) for the fuller comparison. From the recovery angle specifically:

| | Social recovery | Second validator (e.g. a second `ECDSAValidator`/passkey) | Session key (`SmartSession`) |
|---|---|---|---|
| When it's usable | Only after the primary owner key is lost — it's a break-glass path, not routine access | Any time — it's an alternative full-control credential you already hold | Any time, within its policy scope |
| Who can act alone | Nobody — a quorum is required by design | Yes — a second validator has full authority on its own | Yes, within whatever the policy allows |
| What you need in advance | Guardians installed and a threshold agreed *before* the key is lost | The second credential itself, already installed | A session already enabled |
| Solves "I lost my only key" | Yes — this is exactly what it's for | Only if you still have the *other* credential | No — a session key can't rotate the owner |

Reach for social recovery specifically when you want a way back into the account that does not depend on any single device or person surviving — a second validator is a good idea too, but it's still one more single point of failure unless it's held by someone else entirely. The two are complementary: install both a trusted second validator (fast, no quorum needed) and a guardian quorum (survives losing every device you personally hold).

## Gotchas

**Guardians must be sorted ascending, with no duplicates, at install time.** `SocialRecovery.sol`'s `onInstall` reverts `NotSortedAndUnique()` otherwise. Always run your guardian address list through `MultiGuardianSignatureBlobBuilder.SortAddressesAscending` before building `SocialRecoveryConfig`.

**Drive the recovery call through the TARGET's own typed service, not `NethereumAccountService.ExecuteAsync`.** `SocialRecovery.validateUserOp`'s on-chain decode requires a single `execute()` call targeting a currently-installed `TYPE_VALIDATOR` module. Routing the same call through the account's own `NethereumAccountService(account.Address).ExecuteAsync` would wrap the `(mode, executionCalldata)` pair inside a *second* `execute()` targeting the account itself — a shape `SocialRecovery`'s fixed-offset execution decode does not recognize. Always attach the target module's own generated service (`ECDSAValidatorService` above) via `UseAccountAbstraction`.

**Threshold must be between 1 and the guardian count.** `SocialRecoveryConfig.GetInitData()` throws `InvalidOperationException` client-side for the same cases `SocialRecovery.sol`'s `onInstall` would revert on — an empty guardian list, or a threshold of zero or greater than the guardian count.

**Under-threshold and non-guardian quorums fail differently.** Too few signatures fails the *length* guard during gas estimation (`AA23`, before the op is even sent). Enough signatures from the wrong keys passes the length guard but fails the *membership* check at send time (`AA24`). Both leave the owner unchanged, but catching only one error shape will miss the other.

**Guardian management (`AddGuardian`/`RemoveGuardian`/`SetThreshold`) needs the account's existing authority, not the guardians.** These are self-calls the account makes about its own configuration (`msg.sender == account` on-chain) — they are not part of the guardian-quorum recovery flow and are not something guardians invoke themselves.

## Next Steps

- [Modular Accounts (ERC-7579)](guide-modular-accounts) — the module install mechanism this guide builds on, and the other validator/executor/hook types you can combine with social recovery.
- [Smart Sessions and Policies](guide-smart-sessions-and-policies) — the session-key axis, for scoped delegated access rather than break-glass recovery.
- [WebAuthn Passkeys](guide-webauthn-passkeys) — a passkey as a second full validator, one option for the "second validator" row in the decision table above.
- [Account Abstraction Package Reference](nethereum-accountabstraction) — full API reference for `Nethereum.AccountAbstraction`.
