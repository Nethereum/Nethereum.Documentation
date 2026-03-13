---
title: Smart Contracts with AA
sidebar_label: Smart Contracts with AA
sidebar_position: 3
description: Route existing typed contract services through Account Abstraction — every call becomes a UserOperation automatically.
---

# Smart Contracts with AA

If you already have typed contract services (ERC-20, ERC-721, or your own generated services), you don't need to build UserOperations manually. `ChangeContractHandlerToAA` switches any contract service to route calls through a bundler — every `SendRequestAndWaitForReceiptAsync` becomes a UserOperation automatically.

:::tip The Simple Way

```csharp
erc20Service.ChangeContractHandlerToAA(accountAddress, privateKey, bundlerUrl, entryPointAddress);

var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(
    new TransferFunction { To = recipient, Value = amount });
```

That's it. The handler builds, signs, and submits the UserOperation. Gas estimation is automatic.

:::

## Prerequisites

Install the Account Abstraction package alongside the standard contract libraries:

```bash
dotnet add package Nethereum.AccountAbstraction
dotnet add package Nethereum.Web3
```

You need:

- A **smart contract account** address (SimpleAccount, Safe, or any ERC-4337 compatible wallet).
- A **signer key** that the smart account accepts for validation.
- A **bundler endpoint** (your own Nethereum bundler or a third-party service).
- The **EntryPoint contract address** deployed on your target chain.
- An **ERC-20 contract address** (or any typed service you want to call).

## Switch a Contract Service to AA

Start with any typed contract service and switch its handler to route through the bundler. Here is the full pattern using an ERC-20 token:

```csharp
using Nethereum.AccountAbstraction;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Nethereum.StandardTokenEIP20;

var privateKey = "0xYOUR_SIGNER_PRIVATE_KEY";
var accountAddress = "0xYourSmartAccountAddress";
var bundlerUrl = "http://localhost:4337";
var entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
var tokenAddress = "0xTokenContractAddress";

var web3 = new Web3(new Account(privateKey), "http://localhost:8545");
var erc20Service = new StandardTokenService(web3, tokenAddress);
```

The simplest overload takes the private key and bundler URL as strings:

```csharp
erc20Service.ChangeContractHandlerToAA(
    accountAddress,
    privateKey,
    bundlerUrl,
    entryPointAddress);
```

Every subsequent call on `erc20Service` now creates a UserOperation instead of a regular transaction:

```csharp
var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(
    new TransferFunction
    {
        To = "0xRecipientAddress",
        Value = Web3.Convert.ToWei(100)
    });
```

If you already have an `EthECKey` and an `IAccountAbstractionBundlerService` instance, use the explicit overload for full control:

```csharp
var signerKey = new EthECKey(privateKey);
var bundlerService = new AccountAbstractionBundlerService(new RpcClient(new Uri(bundlerUrl)));

var aaHandler = erc20Service.ChangeContractHandlerToAA(
    accountAddress,
    signerKey,
    bundlerService,
    entryPointAddress);
```

Both overloads return the `AAContractHandler`, which you can further configure with factory, paymaster, and gas settings using fluent methods.

## Use Built-in Services with AA

Nethereum's built-in typed services (`web3.Eth.ERC20`, `web3.Eth.ERC721`, `web3.Eth.ERC1155`, ENS) implement `IContractHandlerService` and use `SwitchToAccountAbstraction` instead of `ChangeContractHandlerToAA`. The API is the same — the method name differs because these services use a different base type.

```csharp
var erc20Service = web3.Eth.ERC20.GetContractService(tokenAddress);

erc20Service.SwitchToAccountAbstraction(
    accountAddress,
    accountKey,
    bundlerService,
    entryPointAddress,
    factory: factoryConfig);

var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(
    recipient, transferAmount);
```

After switching, all write operations on the service go through the bundler as UserOperations. Read operations like `BalanceOfQueryAsync` still use `eth_call` directly — no UserOperation needed for queries.

| Base Type | Method | Used By |
|-----------|--------|---------|
| `ContractWeb3ServiceBase` | `ChangeContractHandlerToAA` | Code-generated services (from ABI) |
| `IContractHandlerService` | `SwitchToAccountAbstraction` | Built-in services (`web3.Eth.ERC20`, ERC721, ERC1155, ENS) |

Both methods configure the same `AAContractHandler` under the hood and accept the same parameters.

## First-Time Account Deployment

When a smart account has not been deployed yet, the UserOperation must include `InitCode` so the EntryPoint creates it on-chain. Pass a `FactoryConfig` to handle this automatically:

```csharp
var factory = new FactoryConfig(
    factoryAddress: "0xSimpleAccountFactoryAddress",
    owner: accountAddress,
    salt: 0);

erc20Service.ChangeContractHandlerToAA(
    accountAddress,
    privateKey,
    bundlerUrl,
    entryPointAddress,
    factory);
```

The handler checks whether the account already has deployed code. If it does, the factory config is ignored and `InitCode` stays empty. If the account has no code, `InitCode` is built from the factory address and the encoded create call.

After the first UserOperation deploys the account, subsequent operations skip the factory automatically.

## Batch Multiple Calls

`AAContractHandler` supports batching multiple contract calls into a single UserOperation. This is useful for approve-then-transfer patterns where you want atomicity and a single signature.

Use the `ToBatchCall` extension method to convert typed function messages into `BatchCall` objects:

```csharp
var approve = new ApproveFunction
{
    Spender = "0xSpenderContractAddress",
    Value = Web3.Convert.ToWei(500)
};

var transfer = new TransferFunction
{
    To = "0xRecipientAddress",
    Value = Web3.Convert.ToWei(500)
};

var receipt = await aaHandler.BatchExecuteAsync(
    approve.ToBatchCall(),
    transfer.ToBatchCall());
```

Both calls execute atomically in one UserOperation. If either reverts, the entire operation reverts.

You can also batch typed function messages directly without converting them first:

```csharp
var receipt = await aaHandler.BatchExecuteAsync(approve, transfer);
```

For calls that send ETH along with the execution, pass the value:

```csharp
var callWithValue = new DepositFunction().ToBatchCall(
    ethValue: Web3.Convert.ToWei(0.1m));
```

## Add a Paymaster

A paymaster sponsors gas so the smart account does not need to hold ETH. Chain the `WithPaymaster` method before executing:

```csharp
var aaHandler = erc20Service.ChangeContractHandlerToAA(
    accountAddress, privateKey, bundlerUrl, entryPointAddress);

aaHandler.WithPaymaster("0xPaymasterContractAddress");

var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(
    new TransferFunction
    {
        To = "0xRecipientAddress",
        Value = Web3.Convert.ToWei(50)
    });
```

If the paymaster requires signed data (a verifying paymaster), provide a `PaymasterConfig` with a data provider callback:

```csharp
aaHandler.WithPaymaster(new PaymasterConfig(
    "0xPaymasterContractAddress",
    async (userOp) =>
    {
        // Call your paymaster backend to get a signature over the UserOperation
        return await paymasterBackend.GetSignatureAsync(userOp);
    }));
```

The callback receives the partially-built UserOperation and must return the paymaster data bytes that get appended to `PaymasterAndData`.

## Inspect the Receipt

`AATransactionReceipt` extends the standard `TransactionReceipt` with UserOperation-specific fields. After any call, inspect the result:

```csharp
var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(
    new TransferFunction { To = "0xRecipient", Value = Web3.Convert.ToWei(10) });

// Standard transaction fields
Console.WriteLine($"Transaction Hash: {receipt.TransactionHash}");
Console.WriteLine($"Block Number: {receipt.BlockNumber}");

// AA-specific fields
Console.WriteLine($"UserOp Hash: {receipt.UserOpHash}");
Console.WriteLine($"UserOp Success: {receipt.UserOpSuccess}");
Console.WriteLine($"Actual Gas Cost: {receipt.ActualGasCost}");
Console.WriteLine($"Actual Gas Used: {receipt.ActualGasUsed}");
Console.WriteLine($"Paymaster: {receipt.Paymaster}");
Console.WriteLine($"Sender: {receipt.Sender}");

if (!receipt.UserOpSuccess)
{
    Console.WriteLine($"Revert Reason: {receipt.RevertReason}");
}
```

Always check `UserOpSuccess` — the transaction itself may succeed (the EntryPoint processed it) while the inner call reverts.

## More Control: Gas Configuration

The handler estimates gas automatically, but you can adjust buffers and multipliers for chains with volatile gas prices or custom gas rules:

```csharp
aaHandler.WithGasConfig(new AAGasConfig
{
    CallGasBuffer = 50000,
    VerificationGasBuffer = 30000,
    PreVerificationGasBuffer = 5000,
    CallGasMultiplier = 1.2m,
    VerificationGasMultiplier = 1.1m,
    ReceiptPollIntervalMs = 2000,
    ReceiptTimeoutMs = 120000
});
```

| Property | Default | Purpose |
|----------|---------|---------|
| `CallGasBuffer` | 0 | Extra gas added to `CallGasLimit` after estimation |
| `VerificationGasBuffer` | 0 | Extra gas added to `VerificationGasLimit` |
| `PreVerificationGasBuffer` | 0 | Extra gas added to `PreVerificationGas` |
| `CallGasMultiplier` | 1.0 | Multiplier applied to estimated `CallGasLimit` |
| `VerificationGasMultiplier` | 1.0 | Multiplier applied to estimated `VerificationGasLimit` |
| `ReceiptPollIntervalMs` | 1000 | Milliseconds between receipt polling attempts |
| `ReceiptTimeoutMs` | 60000 | Maximum wait time before timing out |

Buffers are added after multipliers are applied. A multiplier of `1.2m` means 20% headroom on top of the bundler's estimate.

## Common Mistakes

**Wrong bundler URL.** The bundler has its own RPC endpoint, separate from the Ethereum node. If you pass the node URL to `ChangeContractHandlerToAA`, the bundler methods (`eth_sendUserOperation`, `eth_estimateUserOperationGas`) will fail with method-not-found errors.

**Forgetting the factory config for new accounts.** If the smart account has never been deployed, the bundler rejects the UserOperation because the sender has no code. Always pass a `FactoryConfig` when working with accounts that might not exist on-chain yet.

**Not funding the smart account.** Even though the handler builds the UserOperation, the EntryPoint still charges gas. Without a paymaster, the smart account must hold enough ETH to cover gas costs. Fund the account address before sending operations, or use a paymaster.

**Checking TransactionHash instead of UserOpSuccess.** A successful `TransactionHash` means the bundler included the operation in a bundle. The inner execution can still revert. Always check `receipt.UserOpSuccess` and `receipt.RevertReason`.

## Next Steps

- [Deploy a Smart Account](guide-smart-account-deployment) — create and deploy SimpleAccount or custom smart accounts using `SmartAccountBuilder`.
- [Batching and Paymasters](guide-batching-and-paymasters) — combine multiple calls in one UserOperation and sponsor gas with paymasters.
- [Send a UserOperation Manually](guide-send-useroperation) — build and submit UserOperations with full control over every field when you need it.
