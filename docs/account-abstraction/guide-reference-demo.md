---
title: "The AA Reference Demo: A Tour of the Tabbed Example App"
sidebar_label: "Reference Demo Tour"
sidebar_position: 13
description: A guided tour of Nethereum's tabbed Account Abstraction reference app — its head-agnostic MVVM Core, how to run it against an embedded or real HTTP bundler, and a tab-by-tab map to every capability guide in this section.
---

# The AA Reference Demo: A Tour of the Tabbed Example App

Every other guide in this section shows one capability in isolation — deploying an account, batching calls, installing a session key. `Nethereum.AccountAbstraction.Example` is different: it's a single, runnable app with one tab per capability, all driven against a **real** ERC-4337 bundler (not a mock), so you can click through Setup, Send, Batch, Gasless, Passkey, EIP-7702, Modules, Policies, Workflows, and Social Recovery in one session and watch each one work end to end. It ships with both a Blazor and an Avalonia head over the exact same view models, and it is deliberately built to double as a **template**: the project layout, the DI wiring, and the head-agnostic view models are the shape a real app copies, not throwaway sample code.

This guide is a tour, not a how-to for any single capability — it covers what the demo is, how it's put together, how to run it (including against Nethereum's own standalone bundler as real HTTP servers), and a table mapping every tab to the guide that teaches its underlying capability in depth.

## What the Demo Is

`Nethereum.AccountAbstraction.Example` exercises ERC-4337 Account Abstraction through Nethereum's on-ramp (`AddNethereumAccountAbstraction` + `IAAClient`) using the same idiom you already use for `Web3.Eth` and typed contract services. Across its tabs it covers all three AA axes this section is organized around — **signers** (ECDSA, WebAuthn passkey, EIP-7702-upgraded EOA), **policies** (ERC-7579 modules, SmartSession policies, social recovery), and **workflows** (batching, gasless sponsorship, delegated executors) — plus a **Diagnostics** tab for inspecting a UserOperation's gas and wire form, and a **Setup infra** tab that lets you point the whole app at three different bundler/node topologies without changing any other code.

## Architecture: One Core, Two Heads

The example is split into siblings so the shared logic, its tests, and each UI head stay cleanly separated — this is the layout a real app should copy:

| Project | What it holds |
|---|---|
| `Nethereum.AccountAbstraction.Example.Core` | Head-agnostic view models (one per tab, tab0 included), the mutable `SessionState` infra holder, and the DI registration (`AddExampleCore`). No UI framework, no bundler/infra addresses at startup — `SessionState` starts empty and tab0 publishes into it on demand. Depends on Nethereum client packages — `Nethereum.AccountAbstraction` (+ its WebAuthn package `Nethereum.AccountAbstraction.WebAuthn`) and `Nethereum.Web3` — plus the sibling `Example.Contracts` project; no UI framework. |
| `Nethereum.AccountAbstraction.Example.Core.Tests` | Descriptive Given/When/Then tests as documentation — each one drives a view model against a real in-process bundler (validation on) via `Nethereum.AccountAbstraction.Bundler.InProcess`, never a mock. |
| `Nethereum.AccountAbstraction.Example.Hosting` | `HostBootstrap.StartInfraAsync`/`DeployStackAsync` (the in-process DevChain + bundler, and the AA contract stack + demo contracts + funded paymaster deployed on top) plus the DI registrations every head calls: `AddExampleHostDeferred()` (a running head — nothing deployed yet, tab0 deploys on demand) and `AddExampleHost(infra)` (one-shot bring-up, for test fixtures). No UI framework. |
| `Nethereum.AccountAbstraction.Example.Blazor` | Blazor Server head: thin views bound to the Core view models. `dotnet run` needs no external node, and deploys nothing until you click Deploy on tab0. |
| `Nethereum.AccountAbstraction.Example.Avalonia` | Avalonia desktop head: the same view models and the same `Example.Hosting` bootstrap, native Avalonia views with compiled bindings; every tab past tab0 is gated on `SessionState.IsReady`. |
| `Nethereum.AccountAbstraction.Example.Avalonia.Tests` | Headless UI-wiring smoke tests (`Avalonia.Headless.XUnit`) — each tab View, resolved from the real bootstrapped host, renders and its buttons bind to the exact `[RelayCommand]` instances on its view model. |

The view models raise plain `Action` events (not `EventCallback`), so nothing in Core is tied to a UI framework — each head wires those events to its own rendering. This is what makes the *same* Setup/Send/Batch/... logic drive a web head and a desktop head without duplication: write the capability once against `IAAClient`, and both heads get it for free.

## Running It

### Zero setup: `dotnet run`

The Blazor head needs no external node or bundler at all — everything runs in-process and nothing is deployed until you click **Deploy** on the Setup infra tab:

```bash
dotnet run --project src/demos/Nethereum.AccountAbstraction.Example/Nethereum.AccountAbstraction.Example.Blazor
```

This is the **Embedded** infra mode (below): the bundler and DevChain node come up inside the same process as the demo.

### The scripted local stack: Nethereum's own bundler as real HTTP servers

To see the same client code talk to Nethereum's bundler as an actual standalone process — the point that Nethereum ships a full, runnable ERC-4337 bundler, not just a client library — run the scripted local stack instead:

```
pwsh src/demos/Nethereum.AccountAbstraction.Example/run-local-stack.ps1
```

This starts `Nethereum.DevChain.Server` and `Nethereum.AccountAbstraction.Bundler.RpcServer` as two real, separate HTTP processes, deploys an ERC-4337 EntryPoint onto the node, points the bundler at it, and once both are answering JSON-RPC prints the values to paste into the demo:

```
Paste into tab0 -> External:

  Node RPC url        : http://127.0.0.1:8545
  Bundler url         : http://127.0.0.1:4337/
  Funder private key  : 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Paste those three values into the Setup infra tab, choose **External**, and click Deploy — the demo deploys the rest of the AA stack (factory, validator, paymaster, etc.) against the bundler's own EntryPoint using that funder key. The script then blocks, keeping both servers up for as long as you're using the demo; Ctrl-C stops and tears down both process trees.

The script is Windows-only (it uses `taskkill`/`Get-NetTCPConnection` for process-tree teardown and port checks) — the servers themselves are cross-platform, so on Linux/macOS run the two `dotnet run` commands it wraps (`Nethereum.DevChain.Server` and `Nethereum.AccountAbstraction.Bundler.RpcServer`) directly. Pass `-SmokeTest` to instead bring the stack up, verify it, tear down, and exit non-zero on failure — a CI-friendly check that doesn't need the demo UI at all.

### Running the demo's own tests

```bash
dotnet test src/demos/Nethereum.AccountAbstraction.Example/Nethereum.AccountAbstraction.Example.Core.Tests
```

Each fixture spins up an in-process DevChain + bundler, deploys the EntryPoint, the modular account factory, the ECDSA validator, a demo counter contract and (for the Gasless tab) a funded `VerifyingPaymaster`, then exercises the real end-to-end flow. Tests run serialized (no parallelism) so the shared in-process RPC isn't contended.

## The Three Infra Modes (Setup infra Tab)

Nothing runs at app startup — the **Setup infra** tab (`InfrastructureSetupViewModel`) is where you choose how the rest of the demo talks to a node and bundler, and every other tab is gated on `SessionState.IsReady` until it finishes. All three modes drive the *same* client + bundler API; they differ only in topology:

| Mode | What it does |
|---|---|
| **Embedded** | Brings the bundler up in-process against an in-process DevChain — zero setup, everything in one process. This is what plain `dotnet run` gives you. |
| **External** | Points the same client + bundler API at a node/bundler you already run — test-local vs. real infra is just a different endpoint plus a funder key. The scripted local stack above is the easiest way to get values for this mode without any third-party tooling. |
| **Use existing** | Points that same client at *any* provider's already-deployed standard ERC-7579 modules for client-side interop testing, deploying only this demo's own target contracts. Gasless sponsorship is unavailable in this mode, since no provider ships a paymaster alongside its standard modules. |

## Tab-by-Tab: What Each Tab Teaches, and Where to Read More

This table is the spine of the demo — each row is one tab, its view model, what it demonstrates, and the guide in this section that covers the same capability in full depth with runnable code:

| Tab | View Model | What it demonstrates | Guide |
|---|---|---|---|
| Setup infra | `InfrastructureSetupViewModel` | Choosing Embedded / External / Use-existing bundler+node topology for the rest of the session | [Run a Bundler](guide-run-bundler) |
| Setup | `SetupViewModel` | Creating a counterfactual modular smart account (CREATE2 address, deploys itself on first op), choosing self-funded vs. paymaster-sponsored payment | [Smart Account Deployment](guide-smart-account-deployment) |
| Send | `InteractionViewModel` | Driving a typed contract service through AA — happy path plus a reverting call rejected by the bundler's pre-flight gas estimation | [Smart Contracts with AA](guide-smart-contracts-with-aa) |
| Batch | `BatchViewModel` | Several calls as one atomic ERC-7579 batched UserOperation, all-or-nothing on a failing call | [Batching & Paymasters](guide-batching-and-paymasters) |
| Gasless | `GaslessViewModel` | A `VerifyingPaymaster` sponsors gas so the account's ETH balance stays exactly zero | [Batching & Paymasters](guide-batching-and-paymasters) |
| Custom Contract | `CustomViewModel` | Driving an app-specific contract through AA and decoding its typed custom errors on a rejected call | [Smart Contracts with AA](guide-smart-contracts-with-aa) |
| Passkey | `PasskeyAccountViewModel` | A WebAuthn/P-256 passkey owns and signs for the account — the signer axis, no ECDSA key at all | [WebAuthn Passkeys](guide-webauthn-passkeys) |
| EIP-7702 | `Eip7702AccountViewModel` | Upgrading an existing EOA in place into a smart account and interacting with it | [EIP-7702 Smart Accounts](guide-eip7702-smart-accounts) |
| Modules | `ModulesViewModel` | Installing/uninstalling an ERC-7579 validator on the active account via a self-signed UserOperation | [Modular Accounts (ERC-7579)](guide-modular-accounts) |
| Policies | `PoliciesViewModel` | A SmartSession session key scoped by policy (SudoPolicy / UniActionPolicy), including an out-of-policy rejection | [Smart Sessions and Policies](guide-smart-sessions-and-policies) |
| Workflows | `WorkflowsViewModel` | An OwnableExecutor lets a delegated agent act on the account without signing each op; an unauthorized caller is rejected | [Modular Accounts (ERC-7579)](guide-modular-accounts#install-an-executor) |
| Social Recovery | `SocialRecoveryViewModel` | A guardian quorum rotates the account owner after a lost key; an under-threshold attempt is rejected | [Social Recovery](guide-social-recovery) |
| Diagnostics | `DiagnosticsViewModel` | A developer view of a UserOperation's gas, packed wire form, receipt, and failure/out-of-gas diagnostics | No dedicated guide yet — read `DiagnosticsViewModel` and `DiagnosticsViewModelTests` in `Nethereum.AccountAbstraction.Example.Core.Tests` directly |

Each tab is one small view model over the on-ramp — the point of the whole demo is that AA is used the same way as any other typed Nethereum call, whichever axis you're exercising.

:::note One signer axis this demo doesn't have a tab for
[External Signers](guide-external-signer) (a cloud KMS, an HSM, or a hardware wallet signing instead of an in-memory `EthECKey`) is part of the signer axis this section covers, but the demo has no dedicated tab exercising it — it isn't wired into `Nethereum.AccountAbstraction.Example` today. It composes with the exact same generic on-ramp the Setup and Passkey tabs use (`aaClient.CreateAccountAsync`/`GetAccount` take any `IAccountSigningService`), so nothing about the demo's architecture would need to change to add it — there just isn't a tab for it yet.
:::

## Use It as a Template

Because Core has no UI framework dependency and no bundler/infra address baked in at startup, copying this project layout into a real app is mostly deletion: keep the view models for the capabilities you need, keep `AddExampleCore`/`AddExampleHost*` as the shape your own DI registration follows, and build your own thin views (Blazor, Avalonia, MAUI, or anything else) over them instead of the demo's. The `SessionState.IsReady` gating pattern — nothing past Setup is usable until infra is actually deployed — is worth keeping as-is; it's what lets a real app defer any bundler/node choice to runtime configuration instead of hard-coding it.

## Next Steps

- [Run a Bundler](guide-run-bundler) — the embedded vs. standalone `Bundler.RpcServer` distinction the Setup infra tab and `run-local-stack.ps1` are built on.
- [Smart Account Deployment](guide-smart-account-deployment) — the generic on-ramp (`IAAClient.CreateAccountAsync`/`GetAccount`) every tab in the demo is built over.
- [Modular Accounts (ERC-7579)](guide-modular-accounts) — the module install mechanism behind the Modules, Workflows, and Social Recovery tabs.
- [Smart Sessions and Policies](guide-smart-sessions-and-policies), [Social Recovery](guide-social-recovery), [WebAuthn Passkeys](guide-webauthn-passkeys), [EIP-7702 Smart Accounts](guide-eip7702-smart-accounts), [External Signers](guide-external-signer) — the individual signer and policy guides this tour points into.
- [Account Abstraction Overview](overview) — the full package and concept map for this section.
