---
title: Smart Account Deployment
sidebar_label: Account Deployment
sidebar_position: 4
description: Deploy ERC-4337 smart accounts using SmartAccountBuilder — predict addresses with CREATE2, deploy upfront or lazily via InitCode.
---

# Smart Account Deployment

Before a smart account can execute UserOperations, it needs to be deployed. ERC-4337 supports counterfactual addresses — you can predict the account address before deployment, fund it, and deploy it as part of the first UserOperation. This guide covers both approaches: deploying upfront via `SmartAccountBuilder`, and lazy deployment via `InitCode` in a UserOperation.

:::tip The Simple Way

```csharp
var account = await web3.CreateSmartAccount()
    .WithFactory(factoryAddress)
    .WithOwnerKey(privateKey)
    .BuildAsync();
Console.WriteLine($"Account deployed at: {account.Address}");
```

That's it — the builder predicts the address, deploys via the factory, and returns a ready-to-use service.

:::

## Prerequisites

Install the required packages:

```bash
dotnet add package Nethereum.Web3
dotnet add package Nethereum.AccountAbstraction
dotnet add package Nethereum.AccountAbstraction.SimpleAccount
```

You will also need:

- An EOA private key that will own the smart account
- A deployed factory contract address (SimpleAccountFactory or your own ERC-4337 factory)
- A funded EOA to pay for the deployment transaction (or a bundler endpoint for lazy deployment)

## Predict the Address Before Deployment

ERC-4337 account factories use CREATE2, which means the deployed address is deterministic. Given the same factory, owner, and salt, the address is always the same — regardless of when you deploy. This lets you receive funds at the address before the contract exists on-chain.

Use `GetAddressAsync` on the builder to compute the counterfactual address without sending any transaction:

```csharp
using Nethereum.AccountAbstraction.Builders;
using Nethereum.AccountAbstraction.Extensions;
using Nethereum.Web3;

var web3 = new Web3(new Nethereum.Web3.Accounts.Account(privateKey), rpcUrl);

var predictedAddress = await web3.CreateSmartAccount()
    .WithFactory(factoryAddress)
    .WithOwnerKey(privateKey)
    .WithSalt(0) // default salt
    .GetAddressAsync();

Console.WriteLine($"Counterfactual address: {predictedAddress}");
```

The predicted address is safe to use immediately. You can share it, fund it, or register it in other contracts. The account will appear at that exact address when it is eventually deployed.

Changing any input — the factory, the owner, or the salt — produces a different address. Keep these values consistent between prediction and deployment.

## Deploy with SmartAccountBuilder

`SmartAccountBuilder` provides a fluent API to configure and deploy a smart account in one step. The builder calls the factory contract to deploy the account and returns a `SmartAccountService` that is ready to use.

```csharp
using Nethereum.AccountAbstraction.Builders;
using Nethereum.AccountAbstraction.Extensions;
using Nethereum.AccountAbstraction.Services;
using Nethereum.Web3;
using System.Numerics;

var web3 = new Web3(new Nethereum.Web3.Accounts.Account(privateKey), rpcUrl);

var account = await web3.CreateSmartAccount()
    .WithFactory(factoryAddress)
    .WithOwnerKey(privateKey)
    .WithSalt(BigInteger.Zero)
    .BuildAsync();

Console.WriteLine($"Account address:    {account.Address}");
Console.WriteLine($"EntryPoint address: {account.EntryPointAddress}");
Console.WriteLine($"Is deployed:        {await account.IsDeployedAsync()}");
```

`BuildAsync` deploys the account through the factory if it does not already exist. If the account is already deployed at the predicted address, it skips deployment and returns the service pointed at the existing contract.

### Builder Methods

| Method | Description |
|--------|-------------|
| `WithFactory(string)` | Required. Sets the factory contract address |
| `WithOwner(string)` | Sets the owner address |
| `WithOwnerKey(EthECKey)` | Sets the owner from a key (also derives the address) |
| `WithOwnerKey(string)` | Convenience overload accepting a private key string |
| `WithSalt(BigInteger)` | Sets the CREATE2 salt. Default is 0 |
| `WithSalt(byte[])` | Sets the salt as raw 32 bytes |
| `WithInitData(byte[])` | Provides custom initialization calldata for the factory |
| `WithValidator(string)` | Sets the ERC-7579 validator module address |
| `WithModule(BigInteger, string, byte[])` | Adds a module (type ID, address, init data) |
| `FromExisting(string)` | Loads an already-deployed account (skips deployment) |
| `BuildAsync()` | Deploys (if needed) and returns `SmartAccountService` |
| `GetAddressAsync()` | Returns the counterfactual address without deploying |
| `GetInitCodeAsync()` | Returns the init code bytes for use in a UserOperation |

## Load an Existing Account

If the smart account is already deployed, you can load it directly without going through the builder's deploy flow.

Using `FromExisting` on the builder:

```csharp
var account = await web3.CreateSmartAccount()
    .FromExisting(existingAccountAddress)
    .BuildAsync();

Console.WriteLine($"Loaded account at: {account.Address}");
Console.WriteLine($"Nonce: {await account.GetNonceAsync()}");
```

Or use the extension method for a shorter path:

```csharp
var account = await web3.GetSmartAccountAsync(existingAccountAddress);
Console.WriteLine($"Deposit: {await account.GetDepositAsync()}");
```

Both approaches return a `SmartAccountService` connected to the existing contract. No deployment transaction is sent.

## Lazy Deployment via InitCode

In many applications, you want to predict the address, let the user fund it, and deploy the account only when the first UserOperation is submitted. ERC-4337 supports this natively through the `InitCode` field of a UserOperation.

When the EntryPoint processes a UserOperation and finds that the sender has no code, it uses the `InitCode` to deploy the account first, then proceeds with validation and execution.

Get the init code from the builder:

```csharp
var builder = web3.CreateSmartAccount()
    .WithFactory(factoryAddress)
    .WithOwnerKey(privateKey)
    .WithSalt(0);

var counterfactualAddress = await builder.GetAddressAsync();
var initCode = await builder.GetInitCodeAsync();

Console.WriteLine($"Address: {counterfactualAddress}");
Console.WriteLine($"InitCode length: {initCode.Length} bytes");
```

The `initCode` contains the factory address concatenated with the calldata that the EntryPoint will use to call the factory's `createAccount` method. Set this as the `InitCode` field on your UserOperation, and the bundler will deploy the account as part of the first operation.

When using `AAContractHandler` (via `ChangeContractHandlerToAA`), lazy deployment is handled automatically. If you configure a `FactoryConfig` on the handler, it includes the `InitCode` in the first UserOperation and omits it from subsequent ones:

```csharp
using Nethereum.AccountAbstraction;

erc20Service.ChangeContractHandlerToAA(
    counterfactualAddress,
    privateKey,
    bundlerUrl,
    entryPointAddress,
    new FactoryConfig
    {
        FactoryAddress = factoryAddress,
        Owner = ownerAddress,
        Salt = 0
    });

// First call deploys the account + executes the transfer in one UserOperation
var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(
    new TransferFunction { To = recipient, Value = amount });
```

The `FactoryConfig` tells the handler to generate `InitCode` when the account does not yet exist. After the first operation deploys the account, subsequent operations omit `InitCode` automatically.

## Manage EntryPoint Deposits

Smart accounts interact with the EntryPoint to pay for gas. The EntryPoint maintains a deposit balance per account. If no paymaster is used, the account's deposit (or its own ETH balance) covers the gas cost.

Check the current deposit:

```csharp
var deposit = await account.GetDepositAsync();
Console.WriteLine($"Current deposit: {Web3.Convert.FromWei(deposit)} ETH");
```

Add ETH to the deposit:

```csharp
await account.AddDepositAsync(Web3.Convert.ToWei(0.1m));
Console.WriteLine("Deposit added");
```

Withdraw deposit to a specific address:

```csharp
var withdrawTo = "0xYourWithdrawAddress";
var withdrawAmount = Web3.Convert.ToWei(0.05m);
await account.WithdrawDepositToAsync(withdrawTo, withdrawAmount);
Console.WriteLine("Deposit withdrawn");
```

Keep enough deposit to cover gas for your UserOperations. If the deposit runs out and no paymaster is configured, the bundler will reject the operation during simulation.

## EntryPoint Versions

Nethereum supports multiple EntryPoint versions. Your smart account is bound to a specific version at deployment time.

| Constant | Version | Notes |
|----------|---------|-------|
| `EntryPointAddresses.V06` | v0.6 | Original ERC-4337 EntryPoint |
| `EntryPointAddresses.V07` | v0.7 | Introduces packed UserOperation format |
| `EntryPointAddresses.V08` | v0.8 | Incremental improvements |
| `EntryPointAddresses.V09` | v0.9 | Address: `0x433709009B8330FDa32311DF1C2AFA402eD8D009` |
| `EntryPointAddresses.Latest` | v0.9 | Alias for V09 — use this unless you need a specific version |

Always use `EntryPointAddresses.Latest` for new deployments. Only target an older version if you are integrating with an existing account or infrastructure that requires it.

## Common Mistakes

**Not funding the counterfactual address** — The account must have ETH (or a paymaster configured) before the first UserOperation. The EntryPoint checks the balance during validation. If the address has no funds and no paymaster covers the gas, the bundler rejects the operation. Send ETH to the predicted address before submitting the first UserOperation.

**Changing the salt changes the address** — The CREATE2 address depends on the factory, the owner, and the salt. If you use `WithSalt(1)` during prediction but `WithSalt(0)` during deployment, you get a different address. Always use the same salt value for both.

**Using the wrong factory** — Each factory produces accounts with a specific implementation. If you predict an address using factory A but deploy using factory B, the resulting address will be different (or the deployment will fail). Make sure the factory address is consistent across your entire flow.

**Deploying to the wrong EntryPoint** — A smart account is bound to a single EntryPoint at deployment time. Sending UserOperations to a different EntryPoint version will fail validation. Verify the EntryPoint address matches what the factory uses.

## Next Steps

- [Batching and Paymasters](guide-batching-and-paymasters) — combine multiple calls in one UserOperation and sponsor gas with paymasters.
- [Modular Accounts](guide-modular-accounts) — add ERC-7579 validators, executors, and hooks to your smart account.
- [Smart Contracts with AA](guide-smart-contracts-with-aa) — route any typed contract service through Account Abstraction automatically.
