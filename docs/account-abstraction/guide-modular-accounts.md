---
title: ERC-7579 Modular Accounts
sidebar_label: Modular Accounts
sidebar_position: 6
description: Install and manage ERC-7579 modules — validators, executors, hooks, and session keys — on smart accounts using Nethereum.
---

# ERC-7579 Modular Accounts

ERC-7579 defines a standard interface for modular smart accounts. Instead of a monolithic wallet contract, you compose behavior from interchangeable modules — validators that control who can sign, executors that define what actions are allowed, and hooks that intercept calls. This gives you multi-sig, social recovery, session keys, and spending limits as plug-and-play modules.

:::tip The Simple Way

```csharp
// Install a 2-of-3 multisig validator
var config = OwnableValidatorConfig.Create(validatorAddress, threshold: 2, owner1, owner2, owner3);
await accountService.InstallModuleAndWaitForReceiptAsync(config);
```

One call to install any module. Nethereum handles the ABI encoding.

:::

## Prerequisites

Install the Account Abstraction package:

```bash
dotnet add package Nethereum.AccountAbstraction
dotnet add package Nethereum.Web3
```

You need:

- A **deployed ERC-7579 compatible smart account** (such as a modular account from Rhinestone, Biconomy, or your own implementation).
- A **signer key** authorized to manage the account.
- A **bundler endpoint** for submitting UserOperations.
- The **module contract addresses** you want to install (validators, executors, etc.).

Add these namespaces to your code:

```csharp
using Nethereum.AccountAbstraction.ERC7579;
using Nethereum.AccountAbstraction.ERC7579.Modules;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
```

## Module Types

ERC-7579 defines four module types. Each serves a distinct role in the account lifecycle:

| Type | Constant | Value | Purpose | Example |
|------|----------|-------|---------|---------|
| **Validator** | `ERC7579ModuleTypes.TYPE_VALIDATOR` | 1 | Controls who can authorize operations | ECDSA signer, multisig, passkey |
| **Executor** | `ERC7579ModuleTypes.TYPE_EXECUTOR` | 2 | Defines what actions the account can perform | Automated DCA, scheduled transfers |
| **Fallback** | `ERC7579ModuleTypes.TYPE_FALLBACK` | 3 | Handles calls to functions not on the account | Token callbacks, custom interfaces |
| **Hook** | `ERC7579ModuleTypes.TYPE_HOOK` | 4 | Intercepts calls before or after execution | Spending limits, rate limiting |

Every module config in Nethereum implements `IModuleConfig`, which exposes `ModuleTypeId`, `ModuleAddress`, `GetInitData()`, and `GetDeInitData()`. You never need to encode these yourself — the config classes handle it.

## Install a Validator

Validators are the most common module type. They determine how the account verifies signatures on UserOperations.

### ECDSA Validator

The simplest validator: a single EOA address controls the account. Use `ECDSAValidatorConfig` when you want one private key to authorize all operations.

```csharp
var validatorAddress = "0x2222222222222222222222222222222222222222";
var ownerAddress = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";

var config = ECDSAValidatorConfig.Create(validatorAddress, ownerAddress);
var receipt = await accountService.InstallModuleAndWaitForReceiptAsync(config);
```

The init data is the owner address encoded as bytes. After installation, only signatures from that owner will pass validation.

There is also a shortcut that skips the config object entirely:

```csharp
var receipt = await accountService.InstallECDSAValidatorAndWaitForReceiptAsync(
    validatorAddress, ownerAddress);
```

Both approaches produce the same on-chain result.

### Ownable Validator (Multisig)

For multi-signature control, use `OwnableValidatorConfig`. You set a threshold (minimum signers required) and a list of owner addresses.

A 2-of-3 multisig:

```csharp
var validatorAddress = "0x3333333333333333333333333333333333333333";
var owner1 = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";
var owner2 = "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db";
var owner3 = "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB";

var config = OwnableValidatorConfig.Create(validatorAddress, threshold: 2, owner1, owner2, owner3);
var receipt = await accountService.InstallModuleAndWaitForReceiptAsync(config);
```

You can also build the config with fluent methods:

```csharp
var config = new OwnableValidatorConfig(validatorAddress)
    .WithOwner(owner1)
    .WithOwner(owner2)
    .WithOwner(owner3)
    .WithThreshold(2);
```

The shortcut method works here too:

```csharp
var receipt = await accountService.InstallOwnableValidatorAndWaitForReceiptAsync(
    validatorAddress, threshold: 2, owner1, owner2, owner3);
```

After installation, any UserOperation must include valid signatures from at least 2 of the 3 owners.

### Social Recovery

Social recovery lets designated guardians restore access to the account if the primary key is lost. Guardians are trusted addresses (friends, family, hardware wallets) that can collectively authorize a recovery operation.

```csharp
var moduleAddress = "0x4444444444444444444444444444444444444444";
var guardian1 = "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4";
var guardian2 = "0x617F2E2fD72FD9D5503197092aC168c91465E7f2";
var guardian3 = "0x17F6AD8Ef982297579C203069C1DbfFE4348c372";

var config = SocialRecoveryConfig.Create(moduleAddress, threshold: 2, guardian1, guardian2, guardian3);
var receipt = await accountService.InstallModuleAndWaitForReceiptAsync(config);
```

The fluent builder works the same way:

```csharp
var config = new SocialRecoveryConfig(moduleAddress)
    .WithGuardian(guardian1)
    .WithGuardian(guardian2)
    .WithGuardian(guardian3)
    .WithThreshold(2);
```

Or use the shortcut:

```csharp
var receipt = await accountService.InstallSocialRecoveryAndWaitForReceiptAsync(
    moduleAddress, threshold: 2, guardian1, guardian2, guardian3);
```

With a threshold of 2, any two guardians can trigger recovery. The third guardian is a safety net in case one guardian becomes unavailable.

## Install an Executor

Executors define what the account can do on behalf of an authorized caller. An `OwnableExecutorConfig` delegates execution rights to a specific address — useful for automation bots, portfolio managers, or scheduled operations.

```csharp
var executorAddress = "0x5555555555555555555555555555555555555555";
var delegateAddress = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";

var config = OwnableExecutorConfig.Create(executorAddress, delegateAddress);
var receipt = await accountService.InstallModuleAndWaitForReceiptAsync(config);
```

The shortcut:

```csharp
var receipt = await accountService.InstallOwnableExecutorAndWaitForReceiptAsync(
    executorAddress, delegateAddress);
```

Once installed, the delegate address can submit execution calls through the executor module without needing the account owner's signature for each operation. The executor contract enforces its own access control.

## Smart Sessions

Session keys let you grant temporary, scoped permissions to a key without giving it full control of the account. A session defines what a key can do (specific contract calls, token transfers up to a limit) and for how long. This is the foundation for gasless UX, embedded wallets, and dApp-specific permissions.

### Create a Basic Session

Start with `SmartSessionConfig` to define a session tied to a session validator:

```csharp
var sessionModuleAddress = "0x6666666666666666666666666666666666666666";
var sessionValidatorAddress = "0x7777777777777777777777777777777777777777";
var salt = new BigInteger(1);

var config = SmartSessionConfig.Create(sessionModuleAddress, sessionValidatorAddress, salt);
var receipt = await accountService.InstallModuleAndWaitForReceiptAsync(config);
```

If the session validator needs to know the owner address (for ECDSA verification of session signatures), use:

```csharp
var ownerAddress = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";
var config = SmartSessionConfig.CreateWithOwner(
    sessionModuleAddress, sessionValidatorAddress, ownerAddress, salt);
```

### Scope Permissions with ERC20SpendingLimitBuilder

The real power of sessions is scoping. Use `ERC20SpendingLimitBuilder` to encode spending limit policy data for one or more tokens:

```csharp
using Nethereum.AccountAbstraction.ERC7579.Modules.SmartSession;

var usdcToken = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
var spendingLimitPolicy = "0x8888888888888888888888888888888888888888";
var dailyLimit = BigInteger.Parse("100000000"); // 100 USDC (6 decimals)

// Single token — use the static helper
var spendingLimitInitData = ERC20SpendingLimitBuilder.SingleToken(usdcToken, dailyLimit);

var config = new SmartSessionConfig()
    .WithSessionValidator(sessionValidatorAddress)
    .WithSalt(salt)
    .WithERC20TransferAction(usdcToken, spendingLimitPolicy, spendingLimitInitData)
    .WithPaymasterPermission(true);
```

For multiple tokens, use the fluent builder:

```csharp
var initData = new ERC20SpendingLimitBuilder()
    .AddTokenLimit("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", BigInteger.Parse("100000000"))  // 100 USDC
    .AddTokenLimit("0xdAC17F958D2ee523a2206206994597C13D831ec7", BigInteger.Parse("200000000"))  // 200 USDT
    .Build();
```

The builder validates inputs — `BigInteger.Zero` as a limit throws `ArgumentException`, and calling `Build()` with no tokens throws `InvalidOperationException`.

### Define Custom Actions with ActionDataBuilder

When you need both transfer and approve permissions (common in DeFi), use `ActionDataBuilder` to construct the action configuration:

```csharp
var transferAction = ActionDataBuilder.ERC20Transfer(usdcToken, spendingLimitPolicy, limit);
var approveAction = ActionDataBuilder.ERC20Approve(usdcToken, spendingLimitPolicy, limit);

var config = new SmartSessionConfig()
    .WithSessionValidator(sessionKeyValidator)
    .WithSalt(salt)
    .WithAction(transferAction)
    .WithAction(approveAction);
```

Each action targets a specific function selector — `0xa9059cbb` for `transfer(address,uint256)` and `0x095ea7b3` for `approve(address,uint256)`. The policy contract enforces the spending limit independently per action.

### Convert to a Session Object

When you need the session data structure for off-chain use or to pass to other services:

```csharp
Session session = config.ToSession();
```

This produces the `Session` object that the smart session module expects.

### Manage Session Keys

`SessionKeyManager` handles the lifecycle of session keys — generation, storage, retrieval, and cleanup. Use `InMemorySessionKeyStore` for development or implement `ISessionKeyStore` for persistent storage:

```csharp
using Nethereum.AccountAbstraction.SessionKeys;

var sessionKeyStore = new InMemorySessionKeyStore();
var sessionKeyManager = new SessionKeyManager(sessionKeyStore);

// Generate a session key valid for 7 days
var generatedSession = await sessionKeyManager.GenerateSessionKeyAsync(accountAddress, validDays: 7);

// Mark it as registered after on-chain installation
await sessionKeyManager.MarkRegisteredAsync(generatedSession.Key);

// Retrieve the best (most recently registered) session key for an account
var bestKey = await sessionKeyManager.GetBestSessionKeyAsync(accountAddress);

// Remove a session key when it's no longer needed
await sessionKeyManager.RemoveSessionKeyAsync(generatedSession.Key);
```

The manager tracks key states (generated, registered, expired) and `GetBestSessionKeyAsync` returns the most suitable active key for a given account. Use this to build session key rotation or expiry workflows in your application.

## Configure Modules at Account Creation

You don't have to install modules after the account is deployed. `SmartAccountBuilder` lets you bake modules into the account from the start:

```csharp
var builder = new SmartAccountBuilder()
    .WithValidator(validatorAddress);
```

For more control, pass the full module type, address, and init data:

```csharp
var initData = new OwnableValidatorConfig(validatorAddress, threshold: 2, owner1, owner2).GetInitData();

var builder = new SmartAccountBuilder()
    .WithModule(ERC7579ModuleTypes.TYPE_VALIDATOR, validatorAddress, initData);
```

Modules configured at creation time are active from the account's first transaction. This avoids the extra UserOperation that a post-deployment install would require.

## Check and Remove Modules

Before installing a module, check whether it is already present:

```csharp
var config = ECDSAValidatorConfig.Create(validatorAddress, ownerAddress);
bool installed = await accountService.IsModuleInstalledAsync(config);

if (!installed)
{
    await accountService.InstallModuleAndWaitForReceiptAsync(config);
}
```

To remove a module, call uninstall with the same config:

```csharp
var config = OwnableValidatorConfig.Create(validatorAddress, threshold: 2, owner1, owner2, owner3);
var receipt = await accountService.UninstallModuleAndWaitForReceiptAsync(config);
```

The config's `GetDeInitData()` method provides the cleanup data the module needs to remove its state.

If you are working at the lower level with `SmartAccountService` directly, the raw methods accept type IDs and byte arrays:

```csharp
bool installed = await smartAccountService.IsModuleInstalledAsync(
    ERC7579ModuleTypes.TYPE_VALIDATOR, validatorAddress);

await smartAccountService.UninstallModuleAsync(
    ERC7579ModuleTypes.TYPE_VALIDATOR, validatorAddress, deInitData);
```

## Common Mistakes

**Installing a module with the wrong type.** An executor contract installed as a validator will not work. Each module is designed for one type. Check the module documentation or source to confirm its type before installing.

**Setting threshold higher than the owner count.** If you create an `OwnableValidatorConfig` with threshold 3 but only provide 2 owners, the account becomes unusable — you can never gather enough signatures. Always ensure `threshold <= owners.Count`.

**Not checking if a module is already installed.** Installing the same module twice may revert or produce unexpected state. Always call `IsModuleInstalledAsync` before `InstallModuleAsync` unless you are certain the module is not present.

**Removing the last validator.** If you uninstall every validator, the account has no way to authorize operations. Always ensure at least one validator remains active.

**Forgetting to permit the paymaster in sessions.** If your dApp uses a paymaster for gas sponsorship but the session does not call `.WithPaymasterPermission(permit: true)`, the bundler will reject the UserOperation.

## Next Steps

- [Run a Bundler](guide-run-bundler) — set up and run a local ERC-4337 bundler for development.
- [Send a UserOperation](guide-send-useroperation) — build and submit UserOperations manually for full control.
- [Account Abstraction Package Reference](nethereum-accountabstraction) — full API reference for `Nethereum.AccountAbstraction`.
