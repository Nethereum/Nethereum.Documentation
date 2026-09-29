---
title: Run a Bundler
sidebar_label: Run a Bundler
sidebar_position: 12
description: Run Nethereum's full ERC-4337 bundler as a standalone JSON-RPC server for production, or embedded in-process for zero-setup testing.
---

# Run a Bundler

A bundler is the off-chain service ERC-4337 relies on: it collects signed UserOperations from wallets and dApps, validates them, packs them into a `handleOps` transaction, and submits that transaction to the EntryPoint contract. Nethereum ships a complete bundler implementation — the validation engine, mempool, reputation tracking, and a standards-compliant JSON-RPC surface — so you don't have to run someone else's Node.js bundler alongside your .NET stack.

There are two ways to run it. **`Nethereum.AccountAbstraction.Bundler.RpcServer`** is a real, deployable JSON-RPC server: run it as its own process (or host it inside your own ASP.NET Core app) and any ERC-4337 wallet or client can send it UserOperations over HTTP. **`Nethereum.AccountAbstraction.Bundler.InProcess`** wraps the same engine with an in-process DevChain, so a test can bring up a fully working bundler with no external node and no separate process — useful for integration tests, not for serving real traffic.

## Prerequisites

```bash
dotnet add package Nethereum.AccountAbstraction.Bundler
dotnet add package Nethereum.AccountAbstraction.Bundler.RpcServer
```

You will also need:

- A running Ethereum node (local devchain or public RPC) that the bundler submits bundle transactions to
- A funded EOA to act as the bundler's **beneficiary** (receives the fees for bundling) and, if it also signs, the bundler's transaction-sending account
- A deployed EntryPoint contract — use `EntryPointAddresses.V08` or `EntryPointAddresses.Latest` (currently v0.9). EntryPoint v0.6 and v0.7 are **not supported**: Nethereum signs the EIP-712 userOpHash introduced in v0.8, and `EntryPointService` calls `EntryPointAddresses.ValidateSupportedUserOpHashVersion` — which throws `NotSupportedException` — the moment you sign a UserOperation against a v0.6/v0.7 EntryPoint address.

:::tip The Simple Way
```bash
dotnet run --project Nethereum.AccountAbstraction.Bundler.RpcServer -- \
  http://localhost:8545 0xYourBeneficiaryAddress 0x433709009B8330FDa32311DF1C2AFA402eD8D009 \
  --privateKey=0xYOUR_BUNDLER_PRIVATE_KEY --chainId=1337
```
That's a full ERC-4337 JSON-RPC bundler listening on `http://localhost:4337` — no hosting code required. The three positional arguments are the node RPC URL, the beneficiary address, and the EntryPoint address. A signer is required: the server refuses to start without `--privateKey` (a bundler has to sign and submit bundle transactions). Pass `--chainId` to match your node too — the shipped `appsettings.json` pins `ChainId` to `1`, so it must be overridden for a local devchain (alternatively set `ChainId` to `0` in configuration to auto-adopt the node's chain id).
:::

## Run the Standalone Hosted Bundler

`Nethereum.AccountAbstraction.Bundler.RpcServer` compiles to an executable (`OutputType=Exe`) built on ASP.NET Core's minimal-API host — it's meant to be run or deployed as its own service, the same way you'd run a geth or Infura-style bundler. Its startup (`Program.cs`) layers configuration from three sources, each overriding the last: `appsettings.json` (bind a `Bundler` section) first, then the positional `<rpc-url> <beneficiary> <entryPoint>` shorthand shown above, then named flags (`--rpc=`, `--beneficiary=`, `--entryPoint=`, `--privateKey=`, `--chainId=`, `--port=`, `--debug=true`, `--unsafe=true`, `--enableErc7562=true`) taking the final say.

Before it binds anything to the network, the host runs a safety check you should know about: `BundlerRpcServerStartup.ValidateAndResolveChainIdAsync` queries the node's real `eth_chainId` and either adopts it (if you left `ChainId` at 0) or aborts startup if your configured chain ID doesn't match the node. A silently wrong chain ID corrupts every userOpHash the bundler validates signatures against, so this fails loudly instead of running broken.

```bash
dotnet publish Nethereum.AccountAbstraction.Bundler.RpcServer -c Release -o ./publish
./publish/Nethereum.AccountAbstraction.Bundler.RpcServer \
  --rpc=https://your-node.example.com \
  --beneficiary=0xYourBeneficiaryAddress \
  --entryPoint=0x433709009B8330FDa32311DF1C2AFA402eD8D009 \
  --privateKey=0xYOUR_BUNDLER_PRIVATE_KEY \
  --port=4337
```

Publishing gives you a self-contained binary you can deploy to a server or container, configured entirely through flags or `appsettings.json` — no source changes needed for a routine deployment.

### Embed the RPC layer in your own ASP.NET Core host

If you'd rather run the bundler's JSON-RPC surface inside an app you already host — alongside your own APIs, behind your own auth, sharing your own logging — reference the package as a library and call `AddBundlerRpcServer` from your own `Program.cs`:

```csharp
using Nethereum.AccountAbstraction.Bundler.RpcServer.Configuration;

var builder = WebApplication.CreateBuilder(args);

var config = BundlerRpcServerConfig.CreateDefault(
    entryPoint: "0x433709009B8330FDa32311DF1C2AFA402eD8D009",
    beneficiary: "0xYourBeneficiaryAddress",
    rpcUrl: "http://localhost:8545",
    chainId: 31337);
config.PrivateKey = "0xYOUR_BUNDLER_PRIVATE_KEY";
config.EnableDebugMethods = false;

builder.Services.AddBundlerRpcServer(config);

var app = builder.Build();
var dispatcher = app.Services.GetRequiredService<Nethereum.CoreChain.Rpc.RpcDispatcher>();
// Map a JSON-RPC POST endpoint that forwards requests to `dispatcher.DispatchAsync(...)`,
// following the same pattern the shipped Program.cs uses for its own "/" route.
app.Run();
```

`AddBundlerRpcServer` wires a `BundlerService`, all the standard and (if `EnableDebugMethods` is set) debug JSON-RPC handlers, and an `RpcDispatcher` into your `IServiceCollection` in one call. It builds the same `RpcHandlerRegistry` and handler set you would by hand (shown below), and additionally wires an `InMemoryReputationService` into the `BundlerService`. Note that the fully manual `new BundlerService(web3, config)` path below leaves reputation tracking inert (no throttle/ban enforcement) — prefer `AddBundlerRpcServer`, or pass a reputation service yourself, if you need reputation:

```csharp
using Nethereum.AccountAbstraction.Bundler;
using Nethereum.AccountAbstraction.Bundler.RpcServer.Rpc;
using Nethereum.CoreChain.Rpc;

var bundlerService = new BundlerService(web3, bundlerConfig);

var registry = new RpcHandlerRegistry();
registry.AddBundlerHandlers(bundlerService);       // eth_sendUserOperation, eth_estimateUserOperationGas, ...
registry.AddBundlerDebugHandlers(bundlerService);  // debug_bundler_* — omit in production

var context = new RpcContext(() => throw new InvalidOperationException("no in-process chain node"), chainId, serviceProvider);
var dispatcher = new RpcDispatcher(registry, context);

// dispatcher.DispatchAsync(request) turns a JSON-RPC request into a JSON-RPC response.
```

This is the manual path worth knowing because it's the same one Nethereum's own tests drive over real HTTP end to end — a typed client encoding a UserOperation, `RpcDispatcher` decoding and routing it through the registered handlers, and a real receipt coming back — proving the wiring above actually works, not just compiles.

### ERC-4337 RPC Methods

Every handler lives in `Nethereum.AccountAbstraction.Bundler.RpcServer.Rpc.Handlers` and extends CoreChain's `RpcHandlerBase`, so it plugs into any `RpcHandlerRegistry`:

| RPC Method | Handler Class | Description |
|---|---|---|
| `eth_sendUserOperation` | `EthSendUserOperationHandler` | Submit a UserOperation to the mempool |
| `eth_estimateUserOperationGas` | `EthEstimateUserOperationGasHandler` | Estimate gas limits for a UserOperation |
| `eth_getUserOperationByHash` | `EthGetUserOperationByHashHandler` | Look up a UserOperation by its hash |
| `eth_getUserOperationReceipt` | `EthGetUserOperationReceiptHandler` | Get the receipt for a mined UserOperation |
| `eth_supportedEntryPoints` | `EthSupportedEntryPointsHandler` | List EntryPoint addresses the bundler supports |
| `eth_chainId` | `BundlerEthChainIdHandler` | Return the chain ID |

### Debug Methods

Debug methods give you direct control over bundling and mempool/reputation state — useful in development and for the eth-infinitism compliance suite, but they let a caller force state changes, so `AddBundlerDebugHandlers` should stay opt-in (`EnableDebugMethods = false`) for anything public-facing.

| RPC Method | Handler Class | Description |
|---|---|---|
| `debug_bundler_sendBundleNow` | `DebugBundlerSendBundleNowHandler` | Force immediate bundle submission |
| `debug_bundler_dumpMempool` | `DebugBundlerDumpMempoolHandler` | Return all UserOperations in the mempool |
| `debug_bundler_clearMempool` | `DebugBundlerClearMempoolHandler` | Clear the mempool only |
| `debug_bundler_dumpReputation` | `DebugBundlerDumpReputationHandler` | Return reputation scores for all tracked entities |
| `debug_bundler_setReputation` | `DebugBundlerSetReputationHandler` | Manually set reputation for an address |
| `debug_bundler_clearReputation` | `DebugBundlerClearReputationHandler` | Clear all reputation entries |
| `debug_bundler_clearState` | `DebugBundlerClearStateHandler` | Clear mempool, reputation, and cached receipts |
| `debug_bundler_setBundlingMode` | `DebugBundlerSetBundlingModeHandler` | Switch between `auto` and `manual` bundling |
| `debug_bundler_getStakeStatus` | `DebugBundlerGetStakeStatusHandler` | Report an entity's on-chain stake and whether it meets the stake thresholds |

## The Bundler Engine: Submitting and Tracking Operations

Whichever way you host it, both the standalone server and the embedded option below are backed by the same `BundlerService` class. It's worth knowing directly, because it's what you interact with when you write tests or embed the engine without the JSON-RPC layer at all — for example inside an app-specific chain that talks to the bundler in-process:

```csharp
using Nethereum.AccountAbstraction.Bundler;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

var web3 = new Web3(new Account(privateKey), "http://localhost:8545");

var config = new BundlerConfig
{
    SupportedEntryPoints = new[] { EntryPointAddresses.Latest },
    BeneficiaryAddress = "0xYourBeneficiaryAddress"
};

var bundlerService = new BundlerService(web3, config);
```

`BundlerService` validates incoming UserOperations against `config`, holds them in an in-memory mempool, and (when `AutoBundleIntervalMs` is non-zero) submits bundles to the EntryPoint on a timer. Once you're done with it, dispose it to stop that timer — `BundlerService` implements `IDisposable`.

With a service in hand, submitting and tracking an operation is three calls. `packedUserOp` here is a signed `PackedUserOperation` — see [Send a UserOperation](guide-send-useroperation) for how to build and sign one with `EntryPointService.SignAndInitialiseUserOperationAsync`:

```csharp
// Submit a signed UserOperation and get back its hash
string userOpHash = await bundlerService.SendUserOperationAsync(packedUserOp, EntryPointAddresses.Latest);

// Look it up again by hash — useful once you only have the hash a client returned
var included = await bundlerService.GetUserOperationByHashAsync(userOpHash);

// Force an immediate bundle instead of waiting for the auto-bundle timer
BundleExecutionResult? result = await bundlerService.ExecuteBundleAsync();
```

`SendUserOperationAsync` throws `BundlerRpcException` (carrying an ERC-7769 error code from `BundlerErrorCodes`) when an operation fails validation — an unsupported EntryPoint, a duplicate, a blacklisted sender — so a caller can distinguish "rejected for a specific spec reason" from a transport failure. `ExecuteBundleAsync` returns `null` when there's nothing pending to bundle, or a `BundleExecutionResult` reporting whether the bundle transaction succeeded.

Once an operation has been included (or has failed) on-chain, `GetUserOperationReceiptAsync` gives you the outcome:

```csharp
var receipt = await bundlerService.GetUserOperationReceiptAsync(userOpHash);
if (receipt is not null)
{
    Console.WriteLine(receipt.Success
        ? $"Included, gas used: {receipt.ActualGasUsed}"
        : $"Reverted: {receipt.Reason}");
}
```

This reads from the EntryPoint's `UserOperationEvent` logs, not just the mempool's own bookkeeping — so it answers correctly even after `ClearStateAsync()` wipes the bundler's in-memory state, which is what makes the receipt endpoint safe to expose on a bundler that's since restarted.

## Embedded Bundler for Testing

`Nethereum.AccountAbstraction.Bundler.InProcess`'s `InProcessBundlerHost` is a **testing convenience**, not a production hosting option: it spins up an in-process `DevChainNode` (no external geth, no Docker) alongside a `BundlerService` wired with EntryPoint `simulateValidation` on and `UnsafeMode` off (ERC-7562 opcode/storage validation is opt-in and off by default here), so an integration test gets a realistic bundler with zero infrastructure. Because deploying the EntryPoint needs a chain first, bring-up is two phases — start the chain, deploy your contracts, then wire the bundler to the EntryPoint you just deployed:

```csharp
using Nethereum.AccountAbstraction.Bundler.InProcess;
using Nethereum.AccountAbstraction.EntryPoint;
using Nethereum.AccountAbstraction.EntryPoint.ContractDefinition;
using Nethereum.Signer;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

var operatorAccount = new Account(EthECKey.GenerateKey(), chainId);
var bundlerAccount = new Account(EthECKey.GenerateKey(), chainId);

// Phase 1: bring up the DevChain and fund both accounts
await using var host = await InProcessBundlerHost.StartAsync(
    operatorAccount,
    chainId,
    new[] { operatorAccount.Address, bundlerAccount.Address },
    Web3.Convert.ToWei(10000));

// Deploy the EntryPoint through the operator's Web3
var entryPointService = await EntryPointService.DeployContractAndGetServiceAsync(
    host.OperatorWeb3, new EntryPointDeployment());

// Phase 2: wire the bundler now that the EntryPoint address is known
var bundler = host.StartBundler(entryPointService.ContractAddress, bundlerAccount);
```

`host.Bundler` implements the same `IAccountAbstractionBundlerService` typed-client interface your app would call against a real hosted bundler, so a test (or a demo) can be written once against that interface and pointed at either `InProcessBundlerHost.StartBundler` or `InProcessBundlerHost.UseHostedUrl(bundlerRpcUrl, chainId)` for a real server, without changing the calling code. Disposing the host disposes the bundler and the DevChain together, including the DevChain's temp storage — no manual cleanup needed at the end of a test.

## Standalone or Embedded?

| | Standalone `RpcServer` | Embedded `InProcessBundlerHost` |
|---|---|---|
| **Use for** | Production, staging, any real ERC-4337 client talking over HTTP | Integration and unit tests, CI |
| **Infrastructure** | Your own process/container + a real or dev node | None — spins up its own in-process DevChain |
| **Talks to your app via** | JSON-RPC over HTTP (`eth_sendUserOperation`, etc.) | Direct C# calls through `IAccountAbstractionBundlerService` |
| **Debug endpoints** | Opt-in (`EnableDebugMethods`), keep off in production | Not applicable — you already have direct access to `BundlerService` |
| **Lifecycle** | Long-running service, deployed once | Created and disposed per test/test run |

## Configuration Reference

Every property on `BundlerConfig`, with its default, verified against source:

| Property | Type | Default | Description |
|---|---|---|---|
| `SupportedEntryPoints` | `string[]` | *(empty, required)* | EntryPoint contract addresses the bundler will accept |
| `BeneficiaryAddress` | `string` | *(required)* | EOA that receives bundler fees |
| `MaxBundleSize` | `int` | `10` | Maximum UserOperations per bundle |
| `MaxMempoolSize` | `int` | `1000` | Maximum UserOperations in the mempool |
| `MinPriorityFeePerGas` | `BigInteger` | `0` | Minimum priority fee to accept a UserOperation |
| `MaxBundleGas` | `BigInteger` | `15,000,000` | Gas limit for the entire bundle transaction |
| `SkipUnderpricedOpsInAutoBundle` | `bool` | `true` | During auto-bundling, skip (never drop) a pending op whose `maxFeePerGas` is below the current base fee, so it can be bundled once the base fee falls. A manually forced bundle (`FlushAsync`/`debug_bundler_sendBundleNow`) includes candidates unconditionally |
| `AutoBundleIntervalMs` | `int` | `10,000` | Milliseconds between automatic bundle submissions (0 = disabled) |
| `ReputationDecayIntervalMs` | `int` | `3,600,000` | Milliseconds between reputation-decay ticks (0 = disabled) |
| `BundleReceiptTimeoutSeconds` | `int` | `90` | Maximum time to wait for a bundle receipt before its operations revert to pending |
| `ReceiptLogLookbackBlocks` | `BigInteger` | `10,000` | How many blocks back `eth_getUserOperationReceipt` scans EntryPoint logs when the mempool no longer knows the operation (0 scans from genesis) |
| `StrictValidation` | `bool` | `true` | Enforce ERC-4337 validation rules |
| `SimulateValidation` | `bool` | `true` | Simulate UserOperations before accepting into the mempool |
| `UnsafeMode` | `bool` | `false` | Skips only the reputation (ban/throttle) check on `SendUserOperationAsync` (and only when an `IReputationService` is injected); UserOperations are still validated. Relax validation with `StrictValidation` / `SimulateValidation` / `EnableERC7562Validation`. Testing only |
| `EnableERC7562Validation` | `bool` | `false` | Enable trace-based opcode/storage validation per ERC-7562 |
| `MinStake` | `BigInteger` | `1 ETH` (`1_000_000_000_000_000_000`) | Minimum stake for entities to use staked-only opcodes (e.g. `BALANCE`, `SELFBALANCE`) |
| `MinUnstakeDelaySec` | `uint` | `86,400` (24 hours) | Minimum unstake delay for staked entities |
| `MaxUnstakedSenderMempoolCount` | `int` | `4` | Maximum UserOperations from a single unstaked sender allowed in the mempool at once (UREP-010); a sender meeting `MinStake`/`MinUnstakeDelaySec` is exempt |
| `WhitelistedAddresses` | `HashSet<string>` | empty | Addresses exempt from reputation checks |
| `BlacklistedAddresses` | `HashSet<string>` | empty | Addresses permanently rejected |
| `MaxVerificationGas` | `int` | `1,500,000` | Ceiling on a UserOperation's `verificationGasLimit` during structural validation |
| `ChainId` | `BigInteger?` | `null` (auto-detected) | Override chain ID; auto-detected from the node if left null |
| `Hardfork` | `string` | unset (`null`) | Pins the hardfork EVM simulation runs under (gas estimation, ERC-7562 validation). Left unset, the bundler resolves the fork itself from the chain's own activation schedule at its current head — set this only to override that auto-detection |
| `EnableBlsAggregation` | `bool` | `false` | Enable BLS signature aggregation for UserOperations |
| `BlsAggregatorAddresses` | `string[]` | empty | Addresses of supported BLS aggregator contracts |

The RpcServer host layer wraps these in its own `BundlerRpcServerConfig` (adding `Host`, `Port`, `RpcUrl`, `PrivateKey`, `Verbose`, `EnableDebugMethods`, and `RequireSigner`) and forwards those fields — other than the BLS pair (`EnableBlsAggregation`/`BlsAggregatorAddresses`), which the host config does not carry — to `BundlerConfig` via `ToBundlerConfig()`. One default differs: `BundlerRpcServerConfig.MaxVerificationGas` defaults to `10,000,000`, comfortably above the engine's own `1,500,000` default, so the shipped server is compliant with the eth-infinitism bundler-spec-tests suite out of the box. `RequireSigner` (default `true`) makes the standalone host fail fast at startup if no `PrivateKey` is configured — a bundler with no signer can never submit `handleOps` — set it `false` only for a read-only/validation-only deployment that never bundles.

### Configuration Presets

`BundlerConfig` provides three presets that cover common scenarios; each returns a fully configured object you can further customise:

| Preset | Use Case | StrictValidation | ERC-7562 | AutoBundle Interval | MinPriorityFee |
|---|---|---|---|---|---|
| `CreateAppChainConfig` | Private / app-specific chains | `false` | `false` | 1,000 ms | 0 |
| `CreateStandardConfig` | Public testnets, staging | `true` | `true` | 10,000 ms | 1 Gwei |
| `CreateProductionConfig` | Public mainnet | `true` | `true` | 10,000 ms | 1 Gwei + 1 ETH stake / 24h unstake delay |

```csharp
var appChainConfig = BundlerConfig.CreateAppChainConfig(EntryPointAddresses.Latest, "0xBeneficiary");
var standardConfig = BundlerConfig.CreateStandardConfig(EntryPointAddresses.Latest, "0xBeneficiary");
var productionConfig = BundlerConfig.CreateProductionConfig(EntryPointAddresses.Latest, "0xBeneficiary");
```

## Validation Modes

The bundler supports several validation modes you combine depending on your security requirements.

**StrictValidation** (default `true`) enforces the full ERC-4337 validation rules — correct nonce handling, gas limits within bounds, proper signature format. Disable it for private chains where you control every account.

**SimulateValidation** (default `true`) runs the UserOperation through the EntryPoint's `simulateValidation` before accepting it into the mempool, catching operations that would revert on-chain before they waste gas. Disable it only if you fully trust every submitter.

**EnableERC7562Validation** (default `false`) adds trace-based opcode validation per ERC-7562: the bundler traces the validation phase and rejects operations using forbidden opcodes (like `ORIGIN` or `GASPRICE`) or disallowed storage access. Enable it for any bundler accepting operations from untrusted accounts.

**UnsafeMode** (default `false`) skips only the reputation (ban/throttle) check on `SendUserOperationAsync`; every UserOperation is still validated. To relax validation use `StrictValidation`, `SimulateValidation` and `EnableERC7562Validation`. Local development only.

```csharp
// Development: relax validation for speed
var devConfig = BundlerConfig.CreateAppChainConfig(entryPoint, beneficiary);
devConfig.SimulateValidation = false;

// Public testnet: full validation with ERC-7562 opcode checks
var testnetConfig = BundlerConfig.CreateStandardConfig(entryPoint, beneficiary);
testnetConfig.EnableERC7562Validation = true;
```

## Reputation and Staking

ERC-4337's reputation system protects the bundler from denial-of-service attacks: entities (factories, paymasters, aggregators) whose UserOperations repeatedly fail on-chain have their reputation reduced, and low-reputation entities are throttled or banned. `BundlerService` tracks this automatically when an `IReputationService` is injected; the config knobs above (`MinStake`, `MinUnstakeDelaySec`, `WhitelistedAddresses`, `BlacklistedAddresses`) tune it:

```csharp
var config = BundlerConfig.CreateProductionConfig(entryPoint, beneficiary);

// Trust your own paymaster — bypasses reputation checks entirely
config.WhitelistedAddresses.Add("0xYourPaymasterAddress");

// Permanently reject a known bad factory
config.BlacklistedAddresses.Add("0xMaliciousFactoryAddress");
```

## Common Mistakes

**Using a v0.6 or v0.7 EntryPoint address** — Nethereum signs the EIP-712 userOpHash introduced in EntryPoint v0.8. `EntryPointService.SignAndInitialiseUserOperationAsync` throws `NotSupportedException` the moment you sign a UserOperation against `EntryPointAddresses.V06` or `V07` — before it's ever sent to the bundler. Use `EntryPointAddresses.V08` or `EntryPointAddresses.Latest`.

**No beneficiary address** — `BeneficiaryAddress` is required; without it the bundler has no address to receive fees and cannot construct a valid `handleOps` call.

**No signer configured on the standalone server** — the RpcServer host's `RequireSigner` defaults to `true` and aborts startup if `PrivateKey` is empty, because a bundler with no signer can never submit a bundle transaction. Configure `PrivateKey`, or set `RequireSigner = false` explicitly for a read-only/validation-only deployment.

**AutoBundleIntervalMs set to 0 without manual bundling** — a zero interval disables the auto-bundle timer; UserOperations accumulate in the mempool but are never submitted. Either keep a positive interval or call `ExecuteBundleAsync()` yourself:

```csharp
config.AutoBundleIntervalMs = 0; // Timer disabled

// You must trigger bundling manually
var result = await bundlerService.ExecuteBundleAsync();
```

**UnsafeMode in production** — `UnsafeMode = true` lets banned or throttled senders, factories and paymasters through the reputation check. Use it only for local development.

## Next Steps

- [The AA Reference Demo](guide-reference-demo) — tour the tabbed app that exercises this exact bundler, embedded and standalone, end to end.
- [Send a UserOperation](guide-send-useroperation) — submit UserOperations to the bundler you just started
- [Smart Contracts with AA](guide-smart-contracts-with-aa) — route typed contract calls through the bundler automatically
- [Nethereum.AccountAbstraction.Bundler](nethereum-accountabstraction-bundler) — full package reference for the bundler engine API
- [Nethereum.AccountAbstraction.Bundler.RpcServer](nethereum-accountabstraction-bundler-rpcserver) — full package reference for the RPC server
