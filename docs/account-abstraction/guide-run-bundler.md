---
title: Run a Bundler
sidebar_label: Run a Bundler
sidebar_position: 7
description: Run an ERC-4337 bundler in-process, embedded in your application, or as a standalone JSON-RPC server using Nethereum.
---

# Run a Bundler

Nethereum includes a full ERC-4337 bundler — the off-chain service that collects UserOperations, validates them, and submits bundles to the EntryPoint contract. You can run it in-process for testing, as part of your application for app-specific chains, or as a standalone JSON-RPC server for production use.

## Prerequisites

Install the bundler package and, if you want a JSON-RPC endpoint, the RPC server package:

```bash
dotnet add package Nethereum.AccountAbstraction.Bundler
dotnet add package Nethereum.AccountAbstraction.Bundler.RpcServer
```

You will also need:

- A running Ethereum node (local devchain or public RPC)
- A funded EOA to act as the bundler's **beneficiary** (receives bundler fees)
- A deployed EntryPoint contract (or use the canonical addresses from `EntryPointAddresses`)

## Quick Start: In-Process Bundler

The simplest setup creates a `BundlerService` with a config and a web3 connection. The bundler validates incoming UserOperations, stores them in an in-memory mempool, and submits bundles to the EntryPoint on a timer.

```csharp
using Nethereum.AccountAbstraction.Bundler;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

var privateKey = "0xYOUR_BUNDLER_PRIVATE_KEY";
var web3 = new Web3(new Account(privateKey), "http://localhost:8545");

var config = BundlerConfig.CreateAppChainConfig(
    entryPoint: EntryPointAddresses.Latest,
    beneficiary: "0xYourBeneficiaryAddress");

var bundlerService = new BundlerService(web3, config);
```

The bundler is now running. It will automatically bundle UserOperations every `AutoBundleIntervalMs` milliseconds. You can also submit a UserOperation directly and trigger bundling on demand:

```csharp
// Submit a UserOperation
string userOpHash = await bundlerService.SendUserOperationAsync(packedUserOp, EntryPointAddresses.Latest);

// Trigger immediate bundling
BundleResult result = await bundlerService.ExecuteBundleAsync();

// Check operation status
var receipt = await bundlerService.GetUserOperationReceiptAsync(userOpHash);
```

When you are finished, dispose the service to stop the auto-bundle timer:

```csharp
bundlerService.Dispose();
```

## Configuration Presets

`BundlerConfig` provides three presets that cover common scenarios. Each returns a fully configured object you can further customise.

| Preset | Use Case | StrictValidation | ERC-7562 | AutoBundle Interval | MinPriorityFee |
|---|---|---|---|---|---|
| `CreateAppChainConfig` | Private / app-specific chains | `false` | `false` | 1,000 ms | 0 |
| `CreateStandardConfig` | Public testnets, staging | `true` | `true` | 10,000 ms | 1 Gwei |
| `CreateProductionConfig` | Public mainnet | `true` | `true` | 10,000 ms | 1 Gwei + staking |

Create each preset with an entry point and beneficiary address:

```csharp
// App chain — relaxed validation, fast bundling
var appChainConfig = BundlerConfig.CreateAppChainConfig(
    entryPoint: EntryPointAddresses.Latest,
    beneficiary: "0xBeneficiary");

// Standard — strict validation, ERC-7562 opcode checks
var standardConfig = BundlerConfig.CreateStandardConfig(
    entryPoint: EntryPointAddresses.Latest,
    beneficiary: "0xBeneficiary");

// Production — full staking and reputation enforcement
var productionConfig = BundlerConfig.CreateProductionConfig(
    entryPoint: EntryPointAddresses.Latest,
    beneficiary: "0xBeneficiary");
```

All three return a `BundlerConfig` you can modify before passing to `BundlerService`.

## Configuration Reference

Every property on `BundlerConfig` and its default value:

| Property | Type | Default | Description |
|---|---|---|---|
| `SupportedEntryPoints` | `string[]` | *(required)* | EntryPoint contract addresses the bundler will accept |
| `BeneficiaryAddress` | `string` | *(required)* | EOA that receives bundler fees |
| `MaxBundleSize` | `int` | `10` | Maximum UserOperations per bundle |
| `MaxMempoolSize` | `int` | `1000` | Maximum UserOperations in the mempool |
| `MinPriorityFeePerGas` | `BigInteger` | `0` | Minimum priority fee to accept a UserOperation |
| `MaxBundleGas` | `BigInteger` | `15,000,000` | Gas limit for the entire bundle transaction |
| `AutoBundleIntervalMs` | `int` | `10,000` | Milliseconds between automatic bundle submissions (0 = disabled) |
| `StrictValidation` | `bool` | `true` | Enforce ERC-4337 validation rules |
| `SimulateValidation` | `bool` | `true` | Simulate validation before accepting a UserOperation |
| `VerificationGasOverhead` | `BigInteger` | `10,000` | Extra gas added to verification gas estimates |
| `CallGasOverhead` | `BigInteger` | `21,000` | Extra gas added to call gas estimates |
| `UnsafeMode` | `bool` | `false` | Skip all validations — testing only |
| `EnableERC7562Validation` | `bool` | `false` | Enable trace-based opcode validation per ERC-7562 |
| `MinStake` | `BigInteger` | `1 ETH` | Minimum stake for throttled/staked entities |
| `MinUnstakeDelaySec` | `uint` | `86,400` | Minimum unstake delay (24 hours) |
| `WhitelistedAddresses` | `HashSet<string>` | empty | Addresses exempt from reputation checks |
| `BlacklistedAddresses` | `HashSet<string>` | empty | Addresses permanently rejected |
| `ChainId` | `BigInteger?` | auto-detected | Override chain ID (auto-detected from node if null) |
| `EnableBlsAggregation` | `bool` | `false` | Enable BLS signature aggregation |

## Run as JSON-RPC Server

To expose the bundler as a standard ERC-4337 JSON-RPC endpoint, add the RPC server handlers. This makes the bundler accessible to any ERC-4337 compatible client or wallet.

```csharp
using Nethereum.AccountAbstraction.Bundler;
using Nethereum.AccountAbstraction.Bundler.RpcServer;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

var privateKey = "0xYOUR_BUNDLER_PRIVATE_KEY";
var web3 = new Web3(new Account(privateKey), "http://localhost:8545");

var config = BundlerConfig.CreateStandardConfig(
    entryPoint: EntryPointAddresses.Latest,
    beneficiary: "0xBeneficiary");

var bundlerService = new BundlerService(web3, config);

// Create an RPC server and register all bundler handlers
var rpcServer = new RpcServer();
rpcServer.AddBundlerHandlers(bundlerService);
```

You can also skip creating the `BundlerService` yourself and let the extension method create it from the config:

```csharp
var rpcServer = new RpcServer();
rpcServer.AddBundlerHandlers(web3, config);
```

The `AddBundlerHandlers` extension registers all standard and debug RPC handlers listed in the next sections.

## ERC-4337 RPC Methods

These are the standard methods that any ERC-4337 client expects from a bundler:

| RPC Method | Handler | Description |
|---|---|---|
| `eth_sendUserOperation` | `BundlerEthSendUserOperationHandler` | Submit a UserOperation to the mempool |
| `eth_estimateUserOperationGas` | `BundlerEthEstimateUserOperationGasHandler` | Estimate gas for a UserOperation |
| `eth_getUserOperationByHash` | `BundlerEthGetUserOperationByHashHandler` | Look up a UserOperation by its hash |
| `eth_getUserOperationReceipt` | `BundlerEthGetUserOperationReceiptHandler` | Get the receipt for a mined UserOperation |
| `eth_supportedEntryPoints` | `BundlerEthSupportedEntryPointsHandler` | List EntryPoint addresses the bundler supports |
| `eth_chainId` | `BundlerEthChainIdHandler` | Return the chain ID |

## Debug Methods

Debug methods are useful during development and testing. They give you direct control over bundling and visibility into internal state.

| RPC Method | Handler | Description |
|---|---|---|
| `debug_bundler_sendBundleNow` | `BundlerDebugSendBundleNowHandler` | Force immediate bundle submission |
| `debug_bundler_dumpMempool` | `BundlerDebugDumpMempoolHandler` | Return all UserOperations in the mempool |
| `debug_bundler_dumpReputation` | `BundlerDebugDumpReputationHandler` | Return reputation scores for all tracked entities |
| `debug_bundler_setReputation` | `BundlerDebugSetReputationHandler` | Manually set reputation for an address |

## Validation Modes

The bundler supports several validation modes that you can combine depending on your security requirements.

**StrictValidation** (default: `true`) enforces the full ERC-4337 validation rules. When enabled, the bundler checks that UserOperations follow the specification — correct nonce handling, gas limits within bounds, and proper signature format. Disable this for private chains where you control all accounts.

**SimulateValidation** (default: `true`) runs the UserOperation through the EntryPoint's `simulateValidation` before accepting it into the mempool. This catches operations that would revert on-chain, saving gas. Disable only if you trust all submitters.

**EnableERC7562Validation** (default: `false`) adds trace-based opcode validation per the ERC-7562 specification. The bundler traces the validation phase and rejects operations that use forbidden opcodes (like `ORIGIN`, `GASPRICE`, or storage access outside allowed rules). Enable this for public bundlers where untrusted accounts submit operations.

**UnsafeMode** (default: `false`) disables all validation. Every UserOperation is accepted into the mempool without checks. Use this only for local development and testing — never in production.

```csharp
// Development: skip everything for speed
var devConfig = BundlerConfig.CreateAppChainConfig(entryPoint, beneficiary);
devConfig.UnsafeMode = true;

// Public testnet: full validation with ERC-7562 opcode checks
var testnetConfig = BundlerConfig.CreateStandardConfig(entryPoint, beneficiary);
testnetConfig.EnableERC7562Validation = true;
testnetConfig.SimulateValidation = true;
```

## Reputation and Staking

ERC-4337 includes a reputation system that protects the bundler from denial-of-service attacks. Entities (factories, paymasters, aggregators) that cause UserOperations to fail on-chain have their reputation reduced. Entities with low reputation are throttled or banned.

The bundler tracks reputation automatically. You can control it with these config properties:

- **`MinStake`** — Entities that stake at least this amount (default: 1 ETH) get higher rate limits and can bypass some throttling.
- **`MinUnstakeDelaySec`** — The minimum unstake delay (default: 86,400 seconds / 24 hours) required for a stake to count.
- **`WhitelistedAddresses`** — Addresses in this set are exempt from all reputation checks. Use for your own trusted paymasters and factories.
- **`BlacklistedAddresses`** — Addresses in this set are permanently rejected. No UserOperation referencing them will be accepted.

```csharp
var config = BundlerConfig.CreateProductionConfig(entryPoint, beneficiary);

// Trust your own paymaster
config.WhitelistedAddresses.Add("0xYourPaymasterAddress");

// Block a known bad factory
config.BlacklistedAddresses.Add("0xMaliciousFactoryAddress");
```

## Common Mistakes

**No beneficiary address** — `BeneficiaryAddress` is required. Without it the bundler cannot submit bundles because it has no address to receive fees.

**Wrong EntryPoint address** — The bundler only accepts UserOperations targeting an address in `SupportedEntryPoints`. If you pass a v0.6 EntryPoint but your accounts use v0.7, every operation is rejected. Use `EntryPointAddresses.Latest` for the current version, or explicitly set the version your accounts target.

**AutoBundleIntervalMs set to 0 without manual bundling** — Setting the interval to 0 disables the auto-bundle timer. UserOperations accumulate in the mempool but are never submitted. Either keep a positive interval or call `ExecuteBundleAsync()` yourself:

```csharp
config.AutoBundleIntervalMs = 0; // Timer disabled

// You must trigger bundling manually
var result = await bundlerService.ExecuteBundleAsync();
```

**UnsafeMode in production** — `UnsafeMode = true` skips all validation. Malicious or malformed UserOperations will be bundled and waste gas. Only use this for local development.

## Next Steps

- [Send a UserOperation](guide-send-useroperation) — submit UserOperations to the bundler you just started
- [Smart Contracts with AA](guide-smart-contracts-with-aa) — route typed contract calls through the bundler automatically
- [Nethereum.AccountAbstraction.Bundler](nethereum-accountabstraction-bundler) — full package reference for the bundler API
- [Nethereum.AccountAbstraction.Bundler.RpcServer](nethereum-accountabstraction-bundler-rpcserver) — full package reference for the RPC server
