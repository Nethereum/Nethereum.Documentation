---
title: "Smart Sessions and Policies: Scoped, Revocable Session Keys"
sidebar_label: "Smart Sessions & Policies"
sidebar_position: 10
description: Grant a limited, revocable session key — one action, one spending limit, until you revoke it — instead of handing an agent or backend service full control of a smart account, using Nethereum's SmartSession policies (SudoPolicy, UniActionPolicy, ERC20SpendingLimitPolicy).
---

# Smart Sessions and Policies: Scoped, Revocable Session Keys

An automated trading bot, a backend service that pays out rewards, an AI agent that acts on a user's behalf — all of them need to sign UserOperations, but none of them should hold the account owner's key. Handing over the owner key gives that process unlimited, permanent authority: it can call anything, spend anything, forever, until someone rotates the key on every device that has it. A **session key** is the alternative: a fresh, disposable keypair that authenticates through the account's `SmartSession` [ERC-7579](guide-modular-accounts) validator, constrained by one or more **policies** that say exactly what it may do — call this one function, transfer up to this many tokens — and nothing else. Revoke it and the authority is gone; the owner key never left cold storage.

[Modular Accounts](guide-modular-accounts#smart-sessions) already showed the shallow end of this: installing `SmartSession` as a validator and scoping an ERC20 transfer with a spending limit. This guide goes deeper into the **policies axis** specifically — `SudoPolicy` vs `UniActionPolicy`, action-level vs UserOp-level scoping, the on-chain mechanics of a spending limit, and the full session lifecycle: **enable → use → out-of-policy rejection**. It does not re-cover installing the module itself; if you haven't seen `SmartSessionConfig.Create`/`InstallModuleAndWaitForReceiptAsync` yet, start there.

:::tip The Simple Way

```csharp
using Nethereum.AccountAbstraction; // AATransactionReceipt
using Nethereum.AccountAbstraction.Client;
using Nethereum.AccountAbstraction.Contracts.Core.NethereumAccount;
using Nethereum.AccountAbstraction.ERC7579.Modules;
using Nethereum.AccountAbstraction.ERC7579.Modules.SmartSession;
using Nethereum.Signer;

// 1. A fresh keypair - the agent/bot process holds ONLY this, never the account owner's key.
var sessionKey = EthECKey.GenerateKey();

// 2. Scope it to exactly one action: call count() on `counterAddress`, no other function, no other
//    target. SudoPolicy means "no further restriction on the args of THIS action" - see below for
//    when you'd use UniActionPolicy or a spending limit instead.
var salt = new byte[32];
Guid.NewGuid().ToByteArray().CopyTo(salt, 0);

var config = new SmartSessionConfig()
    .WithSessionValidator(sessionValidatorAddress)              // a deployed ECDSASessionValidator
    .WithSessionValidatorInitData(sessionKey.GetPublicAddress())
    .WithSalt(salt)
    // UnrestrictedAction's selector arg is the 4-byte function selector as a hex string, e.g. "0x06661abd".
    .WithAction(ActionDataBuilder.UnrestrictedAction(counterAddress, countSelector, sudoPolicyAddress));

// 3. Enable it: installs SmartSession (first time only) and this session, in one UserOp, signed by
//    the account's OWNER key - the session key never touches this step.
config.ModuleAddress = smartSessionAddress;
var accountService = new NethereumAccountService(web3, account.Address);
accountService.UseAccountAbstraction(account, aaClient);
await accountService.InstallModuleAndWaitForReceiptAsync(config);

// 4. Attach a SEPARATE NethereumSmartAccount for the SAME address, authenticated by the session key.
var permissionId = await smartSession.GetPermissionIdQueryAsync(config.ToSession());
var sessionAccount = aaClient.GetAccount(
    account.Address,
    new SmartSessionKeySigningService(sessionKey, permissionId),
    new SmartSessionValidatorModule(smartSessionAddress, permissionId));

// 5. From here, the session key signs - the owner key is never involved again.
counter.UseAccountAbstraction(sessionAccount, aaClient);
var receipt = (AATransactionReceipt)await counter.CountRequestAndWaitForReceiptAsync();
```

This is the exact shape the AA demo app's "Policies" tab uses (`PoliciesViewModel.CreateScopedSessionKeyAsync`/`UseSessionKeyAsync`), proven end-to-end by `PoliciesViewModelTests` against a real deployed `SmartSession`/`SudoPolicy`/`ECDSASessionValidator` stack and an in-process bundler with ERC-4337 validation on.

:::

## Prerequisites

```bash
dotnet add package Nethereum.Web3
dotnet add package Nethereum.AccountAbstraction
```

You need an `IAAClient` (see [Smart Account Deployment](guide-smart-account-deployment#prerequisites)) and an already-deployed, ERC-7579-compatible smart account with at least one validator (see [Modular Accounts](guide-modular-accounts)). On top of that, this guide's examples deploy four more contracts — all generated Nethereum contract services, none of them requiring hand-written ABI:

| Contract | Generated service | Role |
|---|---|---|
| `SmartSession` | `SmartSessionService` | The `TYPE_VALIDATOR` module every session authenticates through |
| `ECDSASessionValidator` | `ECDSASessionValidatorService` | The `ISessionValidator` a session's signature is checked against — **not** the plain `ECDSAValidator` used for account ownership; it's a separate contract built to recognize a session key address |
| `SudoPolicy` | `SudoPolicyService` | An action/UserOp policy that always allows — "no further restriction" |
| `UniActionPolicy` | `UniActionPolicyService` | An action policy with per-argument conditions and a value limit |
| `ERC20SpendingLimitPolicy` | `ERC20SpendingLimitPolicyService` | An action policy that tracks cumulative ERC-20 spend against a limit (covered in [Modular Accounts](guide-modular-accounts#scope-permissions-with-erc20spendinglimitbuilder); not duplicated here) |

Namespaces used throughout:

```csharp
using System.Numerics;
using Nethereum.Hex.HexConvertors.Extensions;
using Nethereum.AccountAbstraction.ERC7579.Modules.SmartSession;
using Nethereum.AccountAbstraction.Contracts.Modules.SmartSessions.SmartSession;
using Nethereum.AccountAbstraction.Contracts.Modules.SmartSessions.SmartSession.ContractDefinition;
using Nethereum.AccountAbstraction.Contracts.Modules.SmartSessions.Policies.SudoPolicy;
using Nethereum.AccountAbstraction.Contracts.Modules.SmartSessions.Policies.SudoPolicy.ContractDefinition;
using Nethereum.AccountAbstraction.Contracts.Modules.SmartSessions.Policies.UniActionPolicy;
```

## Mental Model: A Session Is a Scoped Permission Set

`SmartSession` is one ERC-7579 validator contract shared by every session on every account. What makes a session *a session* is its `PermissionId` — a `bytes32` deterministically derived from three fields only: `SessionValidator`, `SessionValidatorInitData`, and `Salt` (`SmartSessionConfig.ToSession()`, `src/Nethereum.AccountAbstraction/ERC7579/Modules/SmartSession/SmartSessionConfig.cs`). Two sessions with the same validator, init data, and salt collide on the same `PermissionId` even if their actions differ — confirmed directly against a deployed `SmartSession` contract in `Given_SessionWithActions_When_QueryingPermissionId_Then_OnlyCoreMembersAffectId` (`tests/Nethereum.AccountAbstraction.IntegrationTests/Modules/SmartSession/SmartSessionIntegrationTests.cs`). In practice: always use a fresh, random salt per session, exactly as the tip above does with `Guid.NewGuid()`.

Everything a session is allowed to do is expressed as **policies**, attached at two different scopes:

- **`UserOpPolicies`** (`SmartSessionConfig.WithUserOpPolicy`/`WithSudoPolicy`) — evaluated once per UserOperation, regardless of which function it calls. Use this for session-wide gates (a UserOp policy contract you trust to authorize the operation as a whole).
- **`Actions`** (`SmartSessionConfig.WithAction`/`ActionDataBuilder`) — evaluated per `(target, selector)` pair. This is where most real scoping happens: "this session may call `transfer` on this token" or "this session may call `swap` on this router, with these argument limits."

Both kinds of policy are ordinary contracts implementing `IPolicy`/`IActionPolicy` — `SmartSessionConfig` never hardcodes which one you use. Nethereum ships C# builders for three of them:

| Policy contract | What it allows | Nethereum builder |
|---|---|---|
| `SudoPolicy` | Everything, unconditionally, for the scope it's attached to | `WithSudoPolicy(address)` / `ActionDataBuilder.WithSudoPolicy` |
| `UniActionPolicy` | One function, with per-argument conditions and/or a native-value limit | `UniActionPolicyBuilder` |
| `ERC20SpendingLimitPolicy` | `transfer`/`approve`/`transferFrom` up to a cumulative token limit | `ERC20SpendingLimitBuilder` (see [Modular Accounts](guide-modular-accounts#scope-permissions-with-erc20spendinglimitbuilder)) |

Think of it as a spectrum from "no restriction on this one action" (`SudoPolicy`) to "this argument must equal/be under/be within this value, and I'll track cumulative usage" (`UniActionPolicy`, `ERC20SpendingLimitPolicy`). You choose the policy contract per action — a single session can mix a `SudoPolicy`-scoped action with a `UniActionPolicy`-scoped one, which is exactly what the demo app's Policies tab does (see below).

## SudoPolicy: Unconstrained Within the Scope

`SudoPolicy.checkAction`/`checkUserOpPolicy` always return `VALIDATION_SUCCESS` — no arguments are inspected at all (`contracts/lib/smartsessions/contracts/external/policies/SudoPolicy.sol`). This is proven directly against a deployed `SudoPolicy` contract:

```csharp
// Given: Deploy SudoPolicy
var sudoPolicyService = await SudoPolicyService.DeployContractAndGetServiceAsync(
    _fixture.Web3, new SudoPolicyDeployment());

var configId = new byte[32];
var account = ownerAddress;
var target = "0x1234567890123456789012345678901234567890";
var value = BigInteger.One;
var calldata = "0xa9059cbb".HexToByteArray(); // arbitrary - SudoPolicy never looks at it

// When: Check action (sudo policy should always return 0 = allowed)
var result = await sudoPolicyService.CheckActionQueryAsync(
    configId, account, target, value, calldata);

// Then: Returns 0 (SIG_VALIDATION_SUCCESS)
Assert.Equal(BigInteger.Zero, result);
```

(`Given_SudoPolicy_When_CheckingAction_Then_ReturnsZeroForAllActions`, `SmartSessionIntegrationTests.cs`.)

`SudoPolicy` scoped to a **specific action** (via `ActionDataBuilder.WithSudoPolicy`/`ActionDataBuilder.UnrestrictedAction`) is safe: the session can still only call that one `(target, selector)` — `SudoPolicy` just means "and once it's calling that function, don't restrict the arguments further." `SudoPolicy` scoped as a **`UserOpPolicy`** is a much bigger grant — it removes UserOp-level gating entirely, leaving only whatever action policies you've attached (or none, if you also skip those) as the real boundary. Reach for `SudoPolicy` when a function genuinely has nothing worth restricting — no numeric argument, no value, no recipient to cap (`count()` in the example above takes no arguments at all) — not as a default.

## UniActionPolicy: One Action, With Rules

`UniActionPolicy` is the tool for "this session may call this one function, and here's what its arguments must look like." Configure it with `UniActionPolicyBuilder`:

```csharp
using Nethereum.AccountAbstraction.ERC7579.Modules.SmartSession;

// A DCA bot may call swap() on ONE router, up to 100 (token-unit) worth of value per call.
var maxSwapValue = BigInteger.Parse("100000000");

var policyData = new UniActionPolicyBuilder()
    .WithValueLimit(maxSwapValue)
    .Build();

var session = new SmartSessionConfig()
    .WithSessionValidator(sessionKeyValidator)
    .WithSalt(salt)
    .WithAction(new ActionDataBuilder()
        .WithTarget(uniswapRouter)
        .WithSelector(swapSelector)
        .WithUniActionPolicy(uniActionPolicy, policyData)
        .Build())
    .ToSession();
```

(Adapted from `UseCase4_AutomatedDCA_RecurringBuySession`, `tests/Nethereum.AccountAbstraction.IntegrationTests/Modules/SmartSession/SmartSessionUseCaseTests.cs`.)

`WithValueLimit` caps the native-token `value` sent with the call — it's checked unconditionally by `UniActionPolicy.checkAction` (`require(value <= config.valueLimitPerUse, ...)`, `contracts/lib/smartsessions/contracts/external/policies/UniActionPolicy.sol`) even if you add no argument rules at all. For calldata arguments, add up to 16 `ParamRule`s, each comparing one 32-byte word at a fixed offset into the call's argument data against a reference value:

```csharp
var policyInitData = new UniActionPolicyBuilder()
    .WithEqualityCheck(offset: 0, expectedValue: ownerAddress.HexToByteArray())  // arg 0 must equal owner
    .WithMaxValue(offset: 32, maxValue: capBytes)                                // arg 1 <= cap
    .WithLimitedUsage(offset: 32, refValue: capBytes, limit: totalBudget)        // AND track cumulative usage
    .Build();
```

The offset is into the **argument data**, not the raw calldata — argument 0 starts right after the 4-byte selector, argument 1 at byte 32, and so on (`UniActionPolicyBuilder.WithEqualityCheck`/`WithMaxValue`/`WithMinValue`, `ERC7579/Modules/SmartSession/UniActionPolicyBuilder.cs`; the offset semantics are `UniActionLib.check`'s `data[4 + rule.offset : 4 + rule.offset + 32]`, `contracts/lib/smartsessions/contracts/external/policies/UniActionPolicy.sol`). `WithLimitedUsage` additionally tracks cumulative spend across calls — the same idea `ERC20SpendingLimitPolicy` implements specifically for ERC-20 `transfer`/`approve`/`transferFrom`, generalized to any argument of any function. A function with **no arguments at all** — like `count()` in the tip above — cannot be scoped by `UniActionPolicy`: its `checkAction` requires at least one configured `ParamRule` and unconditionally reads 32 bytes of argument data to evaluate it, so it reverts on a truly zero-argument call. That's exactly why the demo app scopes `count()` with `SudoPolicy` instead and reserves `UniActionPolicy` for `gasWaster(uint256 repeat, string)`, which has an argument to cap (`PoliciesViewModel.cs`, doc comment on `PoliciesViewModel`).

## Session Lifecycle: Enable → Use → Out-of-Policy Rejection

The clearest end-to-end proof of this lifecycle in the codebase is the AA demo app's Policies tab (`src/demos/Nethereum.AccountAbstraction.Example/Nethereum.AccountAbstraction.Example.Core/PoliciesViewModel.cs`), backed by `PoliciesViewModelTests` — a real deployed `SmartSession`/`SudoPolicy`/`UniActionPolicy`/`ECDSASessionValidator` stack, an in-process bundler, and ERC-4337 validation switched on. It scopes one session with two actions: `count()` via `SudoPolicy` (open) and `gasWaster(uint256 repeat, string)` via `UniActionPolicy` capping `repeat` at 3.

### Enable

Enabling installs `SmartSession` (the first time) and the session's policies together, signed by the account's **existing** validator — the session key is not involved yet:

```csharp
var sessionConfig = new SmartSessionConfig()
    .WithSessionValidator(config.SessionValidatorAddress)
    .WithSessionValidatorInitData(sessionKey.GetPublicAddress())
    .WithSalt(salt)
    .WithAction(new ActionDataBuilder()
        .WithTarget(counterAddress).WithSelector(countSelector).WithSudoPolicy(config.SudoPolicyAddress).Build())
    .WithAction(new ActionDataBuilder()
        .WithTarget(counterAddress).WithSelector(gasWasterSelector)
        .WithUniActionPolicy(config.UniActionPolicyAddress, gasWasterCapInitData).Build());

var session = sessionConfig.ToSession();
var permissionId = await smartSession.GetPermissionIdQueryAsync(session);

if (!smartSessionInstalled)
{
    // First session on this account: install SmartSession AND enable this session in the SAME
    // UserOp, via SmartSessionMode.UnsafeEnable (the default install mode - no registry needed).
    sessionConfig.ModuleAddress = config.SmartSessionAddress;
    receipt = (AATransactionReceipt)await accountService.InstallModuleAndWaitForReceiptAsync(sessionConfig);
}
else
{
    // SmartSession already installed (a prior session exists) - onInstall only runs once, so a
    // further session goes through SmartSession's own enableSessions, itself a self-call.
    smartSession.UseAccountAbstraction(account, client);
    receipt = (AATransactionReceipt)await smartSession.EnableSessionsRequestAndWaitForReceiptAsync(
        new List<Session> { session });
}
```

(Adapted from `PoliciesViewModel.CreateScopedSessionKeyAsync`; asserted end-to-end by `Given_a_funded_ecdsa_account_When_creating_a_scoped_session_key_Then_the_session_is_enabled` — `LastReceipt.UserOpSuccess` is true and `HasScopedSession` becomes true, in `PoliciesViewModelTests.cs`.) Both branches call `SmartSessionService.GetPermissionIdQueryAsync(session)` first — that's the id you carry forward to sign with and, later, to revoke.

### Use

`IAAClient.GetAccount` attaches a **second, independent** `NethereumSmartAccount` to the same address, authenticated by the session key through `SmartSessionValidatorModule` instead of the account's owner validator:

```csharp
_sessionAccount = client.GetAccount(
    account.Address,
    new SmartSessionKeySigningService(sessionKey, permissionId),
    new SmartSessionValidatorModule(config.SmartSessionAddress, permissionId));

counter.UseAccountAbstraction(sessionAccount, client);
var receipt = (AATransactionReceipt)await counter.CountRequestAndWaitForReceiptAsync();
```

`SmartSessionKeySigningService.SignTypedDataV4` signs the UserOperation's EIP-712 digest with the raw session key exactly like an ordinary ECDSA signer, then wraps it in SmartSession's USE-mode envelope — `mode(1 byte) || permissionId(32 bytes) || signature(65 bytes)` — which `SmartSessionValidatorModule.ApplySignaturePrefix` prepends the module address to (`ERC7579/Modules/SmartSession/SmartSessionKeySigningService.cs`, `SmartSessionValidatorModule.cs`; the byte layout is locked byte-for-byte by `SmartSessionKeySigningServiceTests`/`SmartSessionValidatorModuleTests` in `tests/Nethereum.AccountAbstraction.UnitTests/Modules/SmartSession/`). `SmartSessionKeySigningService.PersonalSign` throws `NotSupportedException` — SmartSession's ERC-1271 path needs an ERC-7739 nested-EIP-712 signature this service doesn't implement, so only UserOperation signing (`SignTypedDataV4`) works.

`Given_a_scoped_session_key_When_using_it_Then_count_succeeds_and_the_counter_increments` proves this is a genuinely separate signer: `count()` lands, the on-chain counter increments, and the account's owner key never signs anything in this step (`PoliciesViewModelTests.cs`).

### Out-of-Policy Rejection

This is the part that makes a policy worth having: a call the session key *cannot* make actually fails, on-chain, before it does anything.

```csharp
// Within the UniActionPolicy cap of 3 - succeeds.
var allowedReceipt = (AATransactionReceipt)await counter.GasWasterRequestAndWaitForReceiptAsync(
    repeat: 1, "");
// allowedReceipt.UserOpSuccess == true

// Beyond the cap - the session key CANNOT do this, and the call is rejected.
try
{
    var overCapReceipt = (AATransactionReceipt)await counter.GasWasterRequestAndWaitForReceiptAsync(
        repeat: 100, "");
    // Not reached.
}
catch (Exception ex)
{
    // gasWaster(100) was rejected: UniActionPolicy's checkAction failed the argument rule.
}
```

(`PoliciesViewModel.TryOutOfPolicyActionAsync`; asserted end-to-end by `Given_a_scoped_session_key_When_exceeding_the_UniActionPolicy_cap_Then_it_is_rejected`, which checks `vm.OutOfPolicyRejected == true` — the same session key that can call `count()`/`gasWaster(<=3)` genuinely cannot exceed the cap, `PoliciesViewModelTests.cs`.)

Mechanically: `UniActionPolicy.checkAction` returns `VALIDATION_FAILED` when a `ParamRule` doesn't hold (`contracts/lib/smartsessions/contracts/external/policies/UniActionPolicy.sol`). `SmartSession.validateUserOp` calls every attached policy through `PolicyLib.callPolicy`, which treats a failed result as fatal — it reverts with `ISmartSession.PolicyViolation(permissionId, policy)` rather than returning a soft failure (`contracts/lib/smartsessions/contracts/lib/PolicyLib.sol:157`, `ISmartSession.sol:46`). That revert happens during UserOperation **validation**, so the call never executes — no partial state change, no gas spent on the action itself. `ERC20SpendingLimitPolicy.checkAction` follows the identical contract: it returns `VALIDATION_FAILED` the moment `alreadySpent + amount > spendingLimit` (`contracts/lib/smartsessions/contracts/external/policies/ERC20SpendingLimitPolicy.sol`) — a spending-limit session and a `UniActionPolicy`-scoped session fail the same way, for the same reason: whichever action policy you attach, "out of policy" always resolves to `PolicyViolation`, never a quiet partial success.

### Revoke

A session's authority ends when the account calls `SmartSession.removeSession(permissionId)` — a self-call exactly like `enableSessions`, generated as `SmartSessionService.RemoveSessionRequestAsync(byte[] permissionId)` (`Contracts/Modules/SmartSessions/SmartSession/SmartSessionService.gen.cs`; the contract implementation clears every policy and the session validator entry for that `permissionId`, `contracts/lib/smartsessions/contracts/core/SmartSessionBase.sol:333`). Route it through the account exactly like the "enable" self-call above — `smartSession.UseAccountAbstraction(account, aaClient)` then `RemoveSessionRequestAndWaitForReceiptAsync(permissionId)`. No test in this codebase currently exercises a live revoke-then-reject round trip end-to-end; the method itself and its on-chain effect are verified directly from `SmartSessionBase.sol`, not from a tagged doc example.

**This on-chain call is the only thing that actually revokes authority.** `SessionKeyManager`'s `ValidAfter`/`ValidUntil` (see [Modular Accounts](guide-modular-accounts#manage-session-keys)) are bookkeeping in *your* application only — `SessionKeyManager.RemoveSessionKeyAsync` deletes a local record, it does not touch the chain. A session key your app has "forgotten" but never revoked on-chain can still sign valid UserOperations for as long as its policies allow.

## Decision: Session Key vs. Second Validator vs. Social Recovery

All three live under [Modular Accounts](guide-modular-accounts) and solve different problems:

| | Session key (`SmartSession`) | Second validator (e.g. a second `ECDSAValidator`/passkey) | Social recovery |
|---|---|---|---|
| Who holds the key | An automated process, bot, or agent | A person (you, a co-signer) | A set of guardians |
| What it can do | Exactly what its policies allow — one action, a spend cap | Anything the account allows that validator to do — typically full control | Nothing day-to-day; only triggers recovery |
| Revocation | `SmartSession.removeSession(permissionId)` — instant, targeted | Uninstall that validator module | N/A — guardians are the recovery path, not routine access |
| Use it for | Automation: bots, backends, recurring/scheduled operations, delegated portfolio management | A second full-control device or passkey (see [WebAuthn Passkeys](guide-webauthn-passkeys)) | Recovering access after losing every owner key |

Reach for a session key whenever the caller shouldn't have full account control even temporarily — that's the entire point of attaching a policy. Reach for a second validator when the caller genuinely needs the same authority as the primary owner, just through a different credential. Social recovery isn't an access-control tool at all; it's a break-glass mechanism guardians use to restore access, covered in [Social Recovery](guide-social-recovery).

## Gotchas

**A zero-argument function can't be scoped by `UniActionPolicy`.** Its `checkAction` requires at least one `ParamRule` and unconditionally reads 32 bytes of argument data — a function like `count()` has none to read, and the call reverts. Use `SudoPolicy` for the action instead, as shown above.

**The `PermissionId` doesn't depend on `Actions`.** It's derived only from `SessionValidator` + `SessionValidatorInitData` + `Salt`. If you reuse a salt across sessions with different actions, they collide on the same `PermissionId` and the later `enableSessions`/install effectively overwrites the earlier one's action set rather than creating an independent session.

**`ValidAfter`/`ValidUntil` on `SessionKeyManager` are not on-chain.** They're local scheduling metadata your application checks (`GetBestSessionKeyAsync`); the only way to actually stop a session key from signing valid operations is `SmartSession.removeSession` on-chain — see [Revoke](#revoke) above.

**`SmartSessionKeySigningService` has no `PersonalSign`.** It throws `NotSupportedException` — SmartSession's ERC-1271 path needs an ERC-7739 nested-EIP-712 signature this service doesn't implement. Only UserOperation signing (`SignTypedDataV4`) is supported.

**Forgetting `.WithPaymasterPermission(true)`.** Same gotcha as in [Modular Accounts](guide-modular-accounts#common-mistakes) — if a paymaster sponsors this session's gas, the session itself must permit it, or the bundler rejects the UserOperation.

## Next Steps

- [Modular Accounts (ERC-7579)](guide-modular-accounts) — installing `SmartSession` (and every other module type) for the first time, plus the basic ERC-20 spending-limit walkthrough this guide builds on.
- [WebAuthn Passkeys](guide-webauthn-passkeys) — a passkey as a second full validator, the counterpart to the scoped session key covered here.
- [Smart Account Deployment](guide-smart-account-deployment) — `IAAClient.GetAccount`/`CreateAccountAsync` and the generic on-ramp that every signer, including a session key, drives through.
- [Account Abstraction Package Reference](nethereum-accountabstraction) — full API reference for `Nethereum.AccountAbstraction`.
