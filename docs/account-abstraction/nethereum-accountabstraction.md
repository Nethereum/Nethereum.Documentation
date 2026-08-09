---
title: "Nethereum.AccountAbstraction"
sidebar_label: "Nethereum.AccountAbstraction"
sidebar_position: 100
description: "This guide shows you how to use Account Abstraction with Nethereum, enabling smart contract wallets to execute transactions through UserOperations instead of traditional EOA transactions."
custom_edit_url: "https://github.com/Nethereum/Nethereum/edit/master/src/Nethereum.AccountAbstraction/README.md"
format: md
---

# Nethereum.AccountAbstraction

> **NuGet**: [`Nethereum.AccountAbstraction`](https://www.nuget.org/packages/Nethereum.AccountAbstraction/) | **Source**: [`src/Nethereum.AccountAbstraction/`](https://github.com/Nethereum/Nethereum/tree/master/src/Nethereum.AccountAbstraction)
This guide shows you how to use Account Abstraction with Nethereum, enabling smart contract wallets to execute transactions through UserOperations instead of traditional EOA transactions.

## What is Account Abstraction?

Account Abstraction (ERC-4337) allows smart contracts to act as user accounts. Instead of sending transactions directly, you create **UserOperations** that are:

1. Signed by your key (or any other `IAccountSigningService` - hardware/KMS/MPC, WebAuthn, ...)
2. Sent to a **Bundler** (not directly to the blockchain)
3. Executed by the **EntryPoint** contract via `handleOps`

Benefits include:
- **Gas sponsorship** - Paymasters can pay gas on behalf of users
- **Batched transactions** - Multiple calls in a single operation
- **Custom validation** - Social recovery, multi-sig, session keys (ERC-7579 modules)
- **Account deployment** - Create accounts on first use

## Quick Start

### 1. Register the client (`AddNethereumAccountAbstraction`)

One DI call wires up an `IAAClient`: give it your `Web3`, the network's deployed AA contract addresses, and a bundler.

```csharp
using Microsoft.Extensions.DependencyInjection;
using Nethereum.AccountAbstraction;
using Nethereum.AccountAbstraction.Client;
using Nethereum.AccountAbstraction.Configuration;

var deploymentAddresses = new AADeploymentAddresses(
    EntryPointAddress: EntryPointAddresses.Latest,     // EntryPoint v0.9
    NethereumAccountFactoryAddress: "0x...",           // NethereumAccountFactory on your chain
    EcdsaValidatorAddress: "0x...",                    // ECDSAValidator module on your chain
    VerifyingPaymasterAddress: "");                    // optional, leave empty if unused

services.AddNethereumAccountAbstraction(o => o
    .UseWeb3(web3)
    .UseDeploymentAddresses(deploymentAddresses)
    .UseBundlerUrl("https://your-bundler-url"));       // or .UseBundler(myBundlerService)

// Elsewhere (e.g. constructor injection):
var aaClient = serviceProvider.GetRequiredService<IAAClient>();
```

`UseWeb3` can be omitted if an `IWeb3` is already registered in the container - the client resolves it from there instead.

### 2. The account model

`IAAClient` hands you one of two account types, both signed through the same `IAccountSigningService` seam (an offline `EthECKey`, or any external/hardware/WebAuthn signer):

| Type | Adds | Use it for |
|------|------|------------|
| `SmartAccount` | `IsDeployed` / `Salt` / `InitData` | any ERC-4337 account shape (e.g. a plain `SimpleAccount`) |
| `NethereumSmartAccount : SmartAccount` | `Validator` (`IErc7579ValidatorModule`) | the ERC-7579 modular `NethereumAccount` |

| You want to... | Call | Returns |
|---|---|---|
| create a brand-new modular account | `aaClient.CreateAccountAsync(ownerKey)` | `NethereumSmartAccount` (counterfactual, deploys on first op) |
| create a brand-new modular account for any signer | `aaClient.CreateAccountAsync(signingService, validator, initData)` | `NethereumSmartAccount` (counterfactual, deploys on first op) |
| attach to an already-deployed modular account | `aaClient.GetAccount(address, signingService, validator)` | `NethereumSmartAccount` |
| attach to an already-deployed plain account (e.g. `SimpleAccount`) | `aaClient.GetAccount(address, signingService)` | `SmartAccount` |

`aaClient.Configure(service, account)` then routes a generated typed contract service through Account Abstraction for that account - wiring the signer, the bundler, the EntryPoint, ERC-7579 execute encoding (for the modular tier) and, for a not-yet-deployed account, the factory that deploys it on the first op.

### 2b. Any signer, not just an `EthECKey`

`CreateAccountAsync(ownerKey)` is a convenience wrapper for the ECDSA case. The underlying on-ramp is signer-agnostic: it takes any `IAccountSigningService` together with the `IErc7579ValidatorModule` that authenticates it, and the validator's own `initData` - the same shape works for a hardware/KMS/HSM/MPC signer or WebAuthn, with zero changes to `IAAClient` itself.

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
myToken.UseAccountAbstraction(account, aaClient);
```

`AccountInitDataBuilder.Build`/`BuildEcdsa` encode the validator's own init payload (for `EcdsaValidatorModule`, `validator ‖ owner`); other validator modules (WebAuthn, MPC, session keys, ...) supply their own `IModuleConfig`-driven `initData` the same way. Everything downstream - counterfactual address derivation, deploy-on-first-op, `Configure` - is identical to the `EthECKey` tier above.

### 3. Modular account: create and send

```csharp
using Nethereum.AccountAbstraction.Client;
using Nethereum.Signer;
using Nethereum.StandardTokenEIP20;

var owner = EthECKey.GenerateKey();
var account = await aaClient.CreateAccountAsync(owner);   // NethereumSmartAccount, not deployed yet

// Fund the counterfactual address so it can pay for its own deployment + first UserOperation
await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(account.Address, 0.1m);

var myToken = new StandardTokenService(web3, tokenAddress);
myToken.UseAccountAbstraction(account, aaClient);   // switches ContractHandler to AAContractHandler

// First call deploys the account (via its counterfactual InitCode) and executes atomically
var receipt = (AATransactionReceipt)await myToken.TransferRequestAndWaitForReceiptAsync(recipient, amount);
Console.WriteLine($"UserOp Hash: {receipt.UserOpHash}, Success: {receipt.UserOpSuccess}");
```

### 4. Non-modular account: attach to an already-deployed account

For a plain, already-deployed ERC-4337 account (e.g. a `SimpleAccount`) that has no ERC-7579 validator:

```csharp
using Nethereum.Accounts.AccountMessageSigning;

var signingService = new AccountSigningOfflineService(ownerKey);
var account = aaClient.GetAccount(existingAccountAddress, signingService);   // SmartAccount

var handler = aaClient.Configure(myToken, account);
var receipt = (AATransactionReceipt)await myToken.TransferRequestAndWaitForReceiptAsync(recipient, amount);
```

`Configure` returns the `AAContractHandler` directly, which is how you reach the fluent configuration (paymaster, gas, batching) covered below - `UseAccountAbstraction` in step 3 is a shortcut for `aaClient.Configure(service, account)` that hands the service straight back for the common case where you don't need the handler itself.

### 5. EIP-7702: upgrade an existing EOA in place

The tiers above create a brand-new address (CREATE2, counterfactual). EIP-7702 instead turns an **existing, already-funded EOA** into a modular smart account at its own address: its very first UserOperation carries a signed EIP-7702 authorisation tuple that delegates the EOA to `accountImplementationAddress` (the same `NethereumAccountFactory.accountImplementation` every counterfactual account already runs), then runs `initializeAccount` as the post-delegation initializer to install the validator - no factory/CREATE2 deploy involved, same address before and after.

```csharp
using Nethereum.AccountAbstraction.Client;
using Nethereum.AccountAbstraction.Contracts.Core.NethereumAccountFactory;
using Nethereum.Signer;

var ownerKey = new EthECKey("your-existing-eoa-private-key");   // already funded, already has a nonce
var account = aaClient.CreateEip7702Account(ownerKey, deploymentAddresses.EcdsaValidatorAddress);

var factory = new NethereumAccountFactoryService(web3, deploymentAddresses.NethereumAccountFactoryAddress);
var accountImplementation = await factory.AccountImplementationQueryAsync();

var myToken = new StandardTokenService(web3, tokenAddress);
var handler = aaClient.ConfigureEip7702(myToken, account, ownerKey, accountImplementation);

// This one UserOperation both delegates the EOA and installs the ECDSA validator (ownerKey as owner),
// then executes - atomically, at the EOA's own unchanged address.
var receipt = (AATransactionReceipt)await myToken.TransferRequestAndWaitForReceiptAsync(recipient, amount);
Console.WriteLine($"Success: {receipt.UserOpSuccess}");
```

After that op, `eth_getCode` on `ownerKey`'s address returns the EIP-7702 delegation designator (`0xef0100` ‖ `accountImplementation`, 23 bytes) instead of empty bytecode: the EOA is now a modular `NethereumAccount` at the same address, driven exactly like the counterfactual tier from then on. `ownerKey` signs both the UserOperation (as `account`'s owner) and the 7702 authorisation tuple, so it must be a raw `EthECKey` - the authorisation tuple is secp256k1-only, unlike the fully signer-agnostic counterfactual tier in 2b.

## Batching Multiple Calls

Execute multiple contract calls in a single UserOperation. All calls target the handler's contract:

```csharp
var handler = aaClient.Configure(erc20, account);

// Use ToBatchCall() extension method for clean, type-safe batching
var receipt = await handler.BatchExecuteAsync(
    new TransferFunction { To = addr1, Value = 100 }.ToBatchCall(),
    new TransferFunction { To = addr2, Value = 200 }.ToBatchCall(),
    new TransferFunction { To = addr3, Value = 300 }.ToBatchCall());

// All three operations succeed or fail atomically
if (receipt.UserOpSuccess)
{
    Console.WriteLine("All transfers completed!");
}
```

### Batch API Options

```csharp
// Recommended: Use ToBatchCall() for type safety
await handler.BatchExecuteAsync(
    new TransferFunction { To = addr1, Value = 100 }.ToBatchCall(),
    new ApproveFunction { Spender = spender, Value = 500 }.ToBatchCall());

// With ETH value: ToBatchCall(ethValue)
await handler.BatchExecuteAsync(
    new DepositFunction().ToBatchCall(ethValue: Web3.Convert.ToWei(1)));

// Simple: Just raw call data bytes
await handler.BatchExecuteAsync(callData1, callData2, callData3);

// Generic: Pass FunctionMessage objects directly (all same type)
await handler.BatchExecuteAsync(
    new CountFunction(),
    new CountFunction(),
    new CountFunction());
```

## Gas Sponsorship with Paymasters

Paymasters can sponsor gas costs for your users:

```csharp
handler.WithPaymaster(paymasterAddress);

// Or with custom paymaster data (e.g., for verifying paymasters)
handler.WithPaymaster(paymasterAddress, paymasterData);

// Or with dynamic paymaster data
handler.WithPaymaster(new PaymasterConfig(
    paymasterAddress,
    dataProvider: async (userOp) => {
        // Generate signed paymaster data based on the UserOperation
        return await GetSignedPaymasterData(userOp);
    }));
```

## Configuration Options

### Gas and Timeout Settings

```csharp
handler.WithGasConfig(new AAGasConfig
{
    ReceiptPollIntervalMs = 1000,  // How often to check for receipt
    ReceiptTimeoutMs = 60000,      // Max wait time for mining
    VerificationGasBuffer = 5000,  // Extra gas buffer for verification
    CallGasBuffer = 10000,         // Extra gas buffer for call execution
    PreVerificationGasBuffer = 2000, // Extra gas buffer for pre-verification
    CallGasMultiplier = 1.2,       // Multiplier for call gas estimation
    VerificationGasMultiplier = 1.5 // Multiplier for verification gas estimation
});
```

### Fluent Configuration

`AAContractHandler`'s configuration methods return the handler, allowing chaining, regardless of whether it came from `IAAClient.Configure` or the low-level `ChangeContractHandlerToAA` (see Advanced section below):

```csharp
var handler = aaClient.Configure(erc20, account)
    .WithPaymaster(paymasterAddress)
    .WithGasConfig(gasConfig);
```

## Understanding the Receipt

The `AATransactionReceipt` extends the standard `TransactionReceipt` with AA-specific fields:

```csharp
var receipt = (AATransactionReceipt)await myToken.TransferRequestAndWaitForReceiptAsync(recipient, amount);

// Standard transaction fields (from the bundle transaction)
Console.WriteLine($"Block: {receipt.BlockNumber}");
Console.WriteLine($"Tx Hash: {receipt.TransactionHash}");

// AA-specific fields
Console.WriteLine($"UserOp Hash: {receipt.UserOpHash}");
Console.WriteLine($"Success: {receipt.UserOpSuccess}");
Console.WriteLine($"Revert Reason: {receipt.RevertReason}");
Console.WriteLine($"Actual Gas Used: {receipt.ActualGasUsed}");
Console.WriteLine($"Actual Gas Cost: {receipt.ActualGasCost}");
Console.WriteLine($"Sender: {receipt.Sender}");
Console.WriteLine($"Paymaster: {receipt.Paymaster}");
```

## Inspecting UserOperations

You can inspect a UserOperation before sending it:

```csharp
// Create but don't send
var packedOp = await handler.CreateUserOperationAsync(
    new TransferFunction { To = recipient, Value = amount });

Console.WriteLine($"Sender: {packedOp.Sender}");
Console.WriteLine($"Nonce: {packedOp.Nonce}");
Console.WriteLine($"InitCode length: {packedOp.InitCode?.Length ?? 0}");
Console.WriteLine($"CallData: {packedOp.CallData.ToHex()}");
```

## Estimating Gas

```csharp
// Estimate total gas for a UserOperation
var gas = await myToken.ContractHandler.EstimateGasAsync<TransferFunction>(
    new TransferFunction { To = recipient, Value = amount });

Console.WriteLine($"Estimated gas: {gas.Value}");
// This includes: verificationGasLimit + callGasLimit + preVerificationGas
```

## Error Handling

```csharp
try
{
    var receipt = (AATransactionReceipt)await myToken.TransferRequestAndWaitForReceiptAsync(recipient, amount);

    if (!receipt.UserOpSuccess)
    {
        // UserOp was included but inner execution failed
        Console.WriteLine($"Execution failed: {receipt.RevertReason}");
    }
}
catch (TimeoutException ex)
{
    // UserOp wasn't mined within the timeout period
    Console.WriteLine($"Timeout waiting for UserOp: {ex.Message}");
}
catch (RpcClientUnknownException ex)
{
    // Bundler rejected the UserOp or connection failed
    Console.WriteLine($"Bundler error: {ex.Message}");
}
```

## Advanced / Low-Level: Manual Account Management

`IAAClient` covers the common on-ramp for a fresh or already-deployed `NethereumAccount`/`SimpleAccount`. For anything else - a raw key with no DI container, a custom factory, or driving `AAContractHandler` directly - `ChangeContractHandlerToAA` and `AAContractHandler` remain the underlying building blocks `IAAClient` itself is built on.

### Switching an existing contract service to AA directly

```csharp
using Nethereum.AccountAbstraction;
using Nethereum.Signer;

var ownerKey = new EthECKey("your-private-key");
var bundlerService = new AccountAbstractionBundlerService(
    new RpcClient(new Uri("https://your-bundler-url")));
var entryPointAddress = EntryPointAddresses.Latest; // v0.9

// Switch to Account Abstraction - one line!
var myToken = new StandardTokenService(web3, tokenAddress);
myToken.ChangeContractHandlerToAA(
    accountAddress,
    ownerKey,
    bundlerService,
    entryPointAddress);

// Now all transactions go through UserOperations
var receipt = (AATransactionReceipt)await myToken.TransferRequestAndWaitForReceiptAsync(recipient, amount);
Console.WriteLine($"UserOp Hash: {receipt.UserOpHash}");
Console.WriteLine($"Success: {receipt.UserOpSuccess}");
```

`ChangeContractHandlerToAA` also has overloads that take a standard `IAccount` (its `AccountSigningService` becomes the UserOperation signer) or an explicit `IAccountSigningService` + `IErc7579ValidatorModule?` pair - the same seam `IAAClient` uses internally.

### Auto-Deploying via a `FactoryConfig`

If your smart account doesn't exist yet, have it deployed automatically on the first transaction:

```csharp
using Nethereum.AccountAbstraction.SimpleAccount.SimpleAccountFactory;
using Nethereum.AccountAbstraction.SimpleAccount.SimpleAccountFactory.ContractDefinition;

// Deploy a factory and calculate the account address (it doesn't exist yet)
var factory = await SimpleAccountFactoryService.DeployContractAndGetServiceAsync(
    web3, new SimpleAccountFactoryDeployment { EntryPoint = entryPointAddress });

var accountAddress = await factory.GetAddressQueryAsync(ownerKey.GetPublicAddress(), salt: 0);

// Fund the address so it can pay for deployment + first transaction
await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(accountAddress, 0.1m);

// Switch to AA with a factory config
myToken.ChangeContractHandlerToAA(
    accountAddress,
    ownerKey,
    bundlerService,
    entryPointAddress,
    factory: new FactoryConfig(factory.ContractAddress, ownerKey.GetPublicAddress(), salt: 0));

// First transaction will:
// 1. Deploy the smart account (via initCode)
// 2. Execute your contract call
var receipt = await myToken.TransferRequestAndWaitForReceiptAsync(recipient, amount);
```

The handler automatically checks if the account exists. If not, it includes the `initCode` to deploy it. On subsequent calls, `initCode` is omitted.

## Supported Contract Services

Every **generated contract service** (extending `ContractWeb3ServiceBase`) supports `ChangeContractHandlerToAA()`, including Nethereum's built-in standards:

| Service | Namespace |
|---------|-----------|
| `ERC20ContractService` | `Nethereum.Contracts.Standards.ERC20` |
| `ERC721ContractService` | `Nethereum.Contracts.Standards.ERC721` |
| `ERC1155ContractService` | `Nethereum.Contracts.Standards.ERC1155` |
| `ERC1271ContractService` | `Nethereum.Contracts.Standards.ERC1271` |
| `ERC165SupportsInterfaceContractService` | `Nethereum.Contracts.Standards.ERC165` |
| `EIP3009ContractService` | `Nethereum.Contracts.Standards.EIP3009` |
| `ENSRegistryService` | `Nethereum.Contracts.Standards.ENS` |
| `ETHRegistrarControllerService` | `Nethereum.Contracts.Standards.ENS` |
| `PublicResolverService` | `Nethereum.Contracts.Standards.ENS` |
| `OffchainResolverService` | `Nethereum.Contracts.Standards.ENS` |
| `RegistrarService` | `Nethereum.Contracts.Standards.ENS` |

## Architecture Overview

```
Your Application
       │
       ▼
┌─────────────────────────┐
│   IAAClient              │  (CreateAccountAsync / GetAccount / Configure)
└───────────┬─────────────┘
            │ Configures
            ▼
┌─────────────────────────┐
│   Contract Service      │  (ERC20Service, your generated services, etc.)
│   with AAContractHandler│
└───────────┬─────────────┘
            │ Creates UserOperation
            ▼
┌─────────────────────────┐
│   Bundler Service       │  (IAccountAbstractionBundlerService)
│   eth_sendUserOperation │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Bundler               │  (Collects UserOps, creates bundle)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   EntryPoint Contract   │  (handleOps)
│   0x4337090...eD8D009   │  (v0.9)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Your Smart Account    │  (NethereumAccount, SimpleAccount, etc.)
│   execute(target, data) │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Target Contract       │  (ERC20, your contract, etc.)
└─────────────────────────┘
```

## Further Reading

- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Nethereum Documentation](https://docs.nethereum.com/)
- [Account Abstraction Resources](https://www.erc4337.io/)
