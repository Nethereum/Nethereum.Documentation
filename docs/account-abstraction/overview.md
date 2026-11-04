---
title: Account Abstraction
sidebar_label: Overview
sidebar_position: 1
description: ERC-4337 account abstraction with modular ERC-7579 smart accounts, passkeys, EIP-7702, session policies, social recovery, and a deployable bundler in .NET
---

# Account Abstraction (ERC-4337 / ERC-7579)

ERC-4337 replaces externally-owned account (EOA) transactions with **UserOperations** — signed intents processed by a **Bundler** and executed through an on-chain **EntryPoint** contract. This enables smart contract wallets with features impossible with EOAs: batched calls, gas sponsorship, modular validation logic, and authorisation that isn't limited to a single ECDSA private key.

Nethereum's Account Abstraction is a **programmable authorisation platform**, not just an ERC-4337 client. It sits above the signer that owns an account — an EOA key, a passkey, an external KMS/hardware wallet, or a guardian quorum — and above the policies that scope what that signer may do, so the same typed contract services you already use can be driven by whichever combination fits the account.

## Architecture

```
User signs UserOperation
        |
        v
   Bundler (JSON-RPC)
        |
        v
   EntryPoint.handleOps()
        |
        +--> SmartAccount.validateUserOp()
        |         |
        |         +--> ERC-7579 Validator Module (ECDSA, WebAuthn, SmartSession, SocialRecovery, ...)
        |         +--> (optional) Paymaster.validatePaymasterUserOp()
        |
        +--> SmartAccount.execute(callData)
```

The Bundler collects UserOperations from users, validates them, estimates gas, and submits them to the EntryPoint contract in a batch transaction. The EntryPoint verifies each operation's signature by delegating to the smart account's validator module, optionally checks a Paymaster for gas sponsorship, then executes the call.

## What You Can Do

| Capability | How |
|---|---|
| **Modular ERC-7579 accounts** | Compose validators, executors, and hooks on a `NethereumSmartAccount` instead of a monolithic wallet contract. |
| **Passkey signer (no private key)** | Own a smart account with a WebAuthn/passkey (P-256) credential via `Nethereum.AccountAbstraction.WebAuthn`'s `WebAuthnValidatorModule` — no seed phrase, phishing-resistant by construction. |
| **EIP-7702 upgrade-in-place** | Delegate an existing, funded EOA to a `NethereumSmartAccount` implementation in one UserOperation — same address, no CREATE2, no funds to move. |
| **Scoped session keys (SmartSessions)** | Grant a disposable key limited authority — one action, one spending cap — via `SmartSessionConfig` policies (`SudoPolicy`, `UniActionPolicy`, `ERC20SpendingLimitPolicy`) instead of handing out the owner key. |
| **Social recovery** | Install an N-of-M guardian quorum via `SocialRecoveryConfig`/`SocialRecoveryValidatorModule` so a lost owner key can be rotated without any single guardian acting alone. |
| **External/KMS signers** | Own a smart account whose ECDSA key never lives in-process — an `IEthExternalSigner` (cloud KMS, HSM, hardware wallet) signs every UserOperation instead of an in-memory `EthECKey`. |
| **A full, deployable bundler** | `Nethereum.AccountAbstraction.Bundler.RpcServer` is a real standalone JSON-RPC bundler process — not just a client — with mempool, reputation tracking, and bundle submission; `Bundler.InProcess` runs the same engine embedded for zero-setup testing. |

## The Simple Path

Most developers don't need to build UserOperations manually. Nethereum's built-in typed contract services (`IContractHandlerService`, e.g. `web3.Eth.ERC20`) switch to Account Abstraction with `SwitchToAccountAbstraction`; your own code-generated services (`ContractWeb3ServiceBase`) use `ChangeContractHandlerToAA`:

```csharp
using Nethereum.AccountAbstraction;

// Any existing built-in contract service — ERC-20, ERC-721, ERC-1155, ENS
var erc20Service = web3.Eth.ERC20.GetContractService(tokenAddress);

// One line: switch to AA. All future calls become UserOperations.
erc20Service.SwitchToAccountAbstraction(
    accountAddress, accountKey, bundlerService, entryPointAddress);

// Use the service exactly as before — AA is transparent
var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(recipient, amount);
```

Gas estimation, nonce management, signing, and bundler submission are all handled automatically. See [Smart Contracts with AA](guide-smart-contracts-with-aa) for the full picture, including which method applies to which service base type.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **UserOperation** | A signed intent describing what a smart account should execute. Replaces traditional transactions. |
| **Smart Account** | A contract wallet that validates and executes UserOperations. A `NethereumSmartAccount` is ERC-7579 modular; `SmartAccount` also covers non-modular accounts like SimpleAccount. |
| **Bundler** | An off-chain service that collects UserOperations and submits them to the EntryPoint. |
| **EntryPoint** | The singleton on-chain contract that coordinates validation and execution of UserOperations. |
| **Validator Module** | The ERC-7579 module that authorises a UserOperation — ECDSA, WebAuthn/passkey, SmartSession, or SocialRecovery. |
| **Paymaster** | An optional contract that sponsors gas for UserOperations, enabling gasless transactions. |
| **Factory** | A contract that deploys new smart accounts via CREATE2 for deterministic addresses. |

## EntryPoint Versions

| Version | Address | Status |
|---------|---------|--------|
| V09 | `0x433709009B8330FDa32311DF1C2AFA402eD8D009` | **Latest** — `EntryPointAddresses.Latest` |
| V08 | `0x4337084d9e255ff0702461cf8895ce9e3b5ff108` | Supported |
| V07 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | **Not supported** — throws `NotSupportedException` |
| V06 | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` | **Not supported** — throws `NotSupportedException` |

Nethereum signs the EIP-712 userOpHash introduced in EntryPoint v0.8. Signing for v0.6/v0.7 would fail on-chain with `AA24`, so `EntryPointAddresses.ValidateSupportedUserOpHashVersion` rejects them before a signature is ever produced. Use `EntryPointAddresses.Latest` (V09) or `EntryPointAddresses.V08`.

## Packages

| Package | Description |
|---------|-------------|
| `Nethereum.AccountAbstraction` | UserOperation creation, encoding, gas estimation, and validation; the `IAAClient` on-ramp, ERC-7579 modular accounts, and EIP-7702 support |
| `Nethereum.AccountAbstraction.Bundler` | Full ERC-4337 bundler engine: mempool management, reputation tracking, BLS aggregation, bundle building and submission |
| `Nethereum.AccountAbstraction.Bundler.RpcServer` | Standalone JSON-RPC bundler server: `eth_sendUserOperation`, `eth_estimateUserOperationGas`, `eth_getUserOperationByHash`, `eth_getUserOperationReceipt`, `eth_supportedEntryPoints` |
| `Nethereum.AccountAbstraction.Bundler.InProcess` | Embedded host that runs the bundler and an in-process DevChain together for zero-setup testing |
| `Nethereum.AccountAbstraction.Bundler.RocksDB` | RocksDB-backed persistent UserOperation mempool and reputation storage |
| `Nethereum.AccountAbstraction.SimpleAccount` | SimpleAccount smart account and factory interaction (ERC-4337 reference/compliance path; modular accounts are the standard) |
| `Nethereum.AccountAbstraction.WebAuthn` | WebAuthn/passkey (P-256) ERC-7579 validator module and on-ramp extensions for smart accounts |
| `Nethereum.WebAuthn` | WebAuthn/passkey primitives: authenticator and credential-factory abstractions, P-256 signing service, and platform response parsers |
| `Nethereum.WebAuthn.Blazor` | Blazor WebAuthn authenticator over the browser `navigator.credentials` API |
| `Nethereum.WebAuthn.Windows` | Windows Hello WebAuthn authenticator via the native `webauthn.dll` |

## Guides

### Essentials

| Guide | What You'll Learn |
|-------|-------------------|
| [Send a UserOperation](guide-send-useroperation) | Build, sign, and submit your first ERC-4337 UserOperation step by step |
| [Smart Contracts with AA](guide-smart-contracts-with-aa) | Route existing typed contract services through AA with `SwitchToAccountAbstraction`/`ChangeContractHandlerToAA` — the simplest approach |
| [Smart Account Deployment](guide-smart-account-deployment) | Create accounts with `IAAClient`, compute counterfactual CREATE2 addresses, and deploy on the first UserOperation |

### Signer Axis

| Guide | What You'll Learn |
|-------|-------------------|
| [EIP-7702 Smart Accounts](guide-eip7702-smart-accounts) | Upgrade an existing, funded EOA into a modular ERC-7579 account in place — same address, one atomic UserOperation |
| [WebAuthn Passkeys](guide-webauthn-passkeys) | Own a smart account with a WebAuthn/passkey (P-256) credential — no private key, no seed phrase |
| [External Signers](guide-external-signer) | Sign UserOperations with a cloud KMS, HSM, or hardware wallet (Ledger/Trezor) instead of an in-process `EthECKey` |

### Modules & Policies

| Guide | What You'll Learn |
|-------|-------------------|
| [Modular Accounts (ERC-7579)](guide-modular-accounts) | Install validators, executors, and hooks — multisig, session keys, social recovery — as plug-and-play modules |
| [Smart Sessions and Policies](guide-smart-sessions-and-policies) | Scope a disposable session key with `SudoPolicy`, `UniActionPolicy`, and `ERC20SpendingLimitPolicy`, then revoke it |
| [Social Recovery](guide-social-recovery) | Set up an N-of-M guardian quorum and recover a lost owner key without any single guardian acting alone |

### Advanced

| Guide | What You'll Learn |
|-------|-------------------|
| [Batching & Paymasters](guide-batching-and-paymasters) | Execute multiple calls in one UserOperation and sponsor gas with paymasters |
| [Run a Bundler](guide-run-bundler) | Run Nethereum's bundler as a standalone JSON-RPC server (`Bundler.RpcServer`) for production, or embedded (`Bundler.InProcess`) for zero-setup testing |
| [The AA Reference Demo](guide-reference-demo) | Tour the tabbed Blazor/Avalonia reference app that exercises every capability above end to end against a real bundler |
