---
title: "Nethereum.AccountAbstraction.Bundler.InProcess"
sidebar_label: "Nethereum.AccountAbstraction.Bundler.InProcess"
sidebar_position: 100
description: "In-process DevChain + ERC-4337 bundler bootstrap, for tests and examples."
custom_edit_url: "https://github.com/Nethereum/Nethereum/edit/master/src/Nethereum.AccountAbstraction.Bundler.InProcess/README.md"
format: md
---

# Nethereum.AccountAbstraction.Bundler.InProcess

> **NuGet**: [`Nethereum.AccountAbstraction.Bundler.InProcess`](https://www.nuget.org/packages/Nethereum.AccountAbstraction.Bundler.InProcess/) | **Source**: [`src/Nethereum.AccountAbstraction.Bundler.InProcess/`](https://github.com/Nethereum/Nethereum/tree/master/src/Nethereum.AccountAbstraction.Bundler.InProcess)
In-process DevChain + ERC-4337 bundler bootstrap, for tests and examples.

## Overview

`InProcessBundlerHost` spins up an in-process `Nethereum.DevChain` node together with an in-process
`Nethereum.AccountAbstraction.Bundler.BundlerService`, with ERC-4337 validation switched on by
default. It exists so integration tests and example apps can exercise the full bundler pipeline -
mempool, validation, gas estimation, bundle execution - without a wire round-trip to a separate
process, and without needing an external `anvil`/`geth` dev node.

This package is test/example infrastructure and is deliberately kept out of
`Nethereum.AccountAbstraction.Bundler` (the shippable core bundler library) and its production-facing
packages (`Nethereum.AccountAbstraction.Bundler.RpcServer` for the standalone JSON-RPC host, `.RocksDB`
for persistent mempool/reputation storage), none of which need an in-process DevChain.

### Key Features

- **`InProcessBundlerHost`**: two-phase startup - `StartAsync` brings up the DevChain and an operator
  `Web3` for deploying the AA contract stack, then `StartBundler` wires the bundler once the
  EntryPoint address is known
- **Validation ON by default**: unlike fixtures that disable validation for speed, the bootstrap
  defaults to `UnsafeMode=false`, `SimulateValidation=true`, `StrictValidation=true`
- **Owns lifetime**: disposing the bootstrap disposes the DevChain node and its temp storage

## Installation

```bash
dotnet add package Nethereum.AccountAbstraction.Bundler.InProcess
```

### Dependencies

- **Nethereum.AccountAbstraction.Bundler** - the bundler service this package wires up in-process
- **Nethereum.DevChain** - the in-process devchain node this package bootstraps

## Quick Start

```csharp
using System.Numerics;
using Nethereum.AccountAbstraction.Bundler.InProcess;
using Nethereum.AccountAbstraction.EntryPoint;
using Nethereum.AccountAbstraction.EntryPoint.ContractDefinition;
using Nethereum.Signer;
using Nethereum.Web3.Accounts;

var chainId = new BigInteger(31337);
var operatorAccount = new Account(EthECKey.GenerateKey(), chainId);
var bundlerAccount = new Account(EthECKey.GenerateKey(), chainId);

// Phase 1: bring up the in-process DevChain and fund the operator/bundler accounts
await using var host = await InProcessBundlerHost.StartAsync(
    operatorAccount,
    chainId,
    new[] { operatorAccount.Address, bundlerAccount.Address },
    Nethereum.Web3.Web3.Convert.ToWei(10000));

// Deploy the EntryPoint through the operator Web3
var entryPointService = await EntryPointService.DeployContractAndGetServiceAsync(
    host.OperatorWeb3, new EntryPointDeployment());

// Phase 2: wire the in-process bundler now that the EntryPoint address is known
var bundler = host.StartBundler(entryPointService.ContractAddress, bundlerAccount);

// bundler is an IAccountAbstractionBundlerService - send/query UserOperations against it
// exactly as you would against a hosted Nethereum.AccountAbstraction.Bundler.RpcServer
var supportedEntryPoints = await bundler.SupportedEntryPoints.SendRequestAsync();

// host.DisposeAsync() (or the `await using` above) disposes the DevChain node and its temp storage
```

## Related Packages

### Dependencies
- **[Nethereum.AccountAbstraction.Bundler](nethereum-accountabstraction-bundler)** - The bundler service (`BundlerService`, `BundlerConfig`) wired up in-process
- **[Nethereum.DevChain](../devchain/nethereum-devchain)** - The in-process devchain node this package bootstraps

### See Also
- **[Nethereum.AccountAbstraction.Bundler.RpcServer](nethereum-accountabstraction-bundler-rpcserver)** - The standalone, deployable/hosted bundler for production use - point real apps at this, not at `InProcessBundlerHost`
- **[Nethereum.AccountAbstraction](nethereum-accountabstraction)** - Core ERC-4337 client-side types and the `IAAClient` on-ramp

## Additional Resources

- [ERC-4337: Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
- [Nethereum Documentation](https://docs.nethereum.com)
