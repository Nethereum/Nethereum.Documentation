---
title: Batching & Paymasters
sidebar_label: Batching & Paymasters
sidebar_position: 5
description: Execute multiple calls in a single UserOperation and sponsor gas fees with paymasters using Nethereum Account Abstraction.
---

# Batching & Paymasters

Two of the most powerful ERC-4337 features are batching — executing multiple calls in a single UserOperation — and paymasters — letting a third party sponsor gas fees. Together, they enable gasless, multi-step operations in a single atomic transaction. This guide covers both.

:::tip The Simple Way

```csharp
// Batch: approve + transfer in one UserOperation
await handler.BatchExecuteAsync(
    new ApproveFunction { Spender = spender, Value = amount }.ToBatchCall(),
    new TransferFunction { To = recipient, Value = amount }.ToBatchCall());

// Paymaster: sponsor gas
handler.WithPaymaster(paymasterAddress);
```

Batching and gas sponsorship — two lines each.

:::

## Prerequisites

Install the Account Abstraction packages:

```bash
dotnet add package Nethereum.Web3
dotnet add package Nethereum.AccountAbstraction
```

You need:

- A **smart contract account** (SimpleAccount, Safe, or any ERC-4337 wallet).
- A **signer key** that the account accepts for validation.
- A **bundler endpoint** (your own Nethereum bundler or a third-party service).
- The **EntryPoint contract address** deployed on your target chain.
- For paymaster examples: a **deployed paymaster contract** with sufficient funds.

Set up the handler that all examples in this guide use:

```csharp
using Nethereum.AccountAbstraction;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

var privateKey = "0xYOUR_SIGNER_PRIVATE_KEY";
var accountAddress = "0xYourSmartAccountAddress";
var bundlerUrl = "http://localhost:4337";
var entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

var web3 = new Web3(new Account(privateKey), "http://localhost:8545");
var handler = web3.GetAAContractHandler(accountAddress, bundlerUrl, entryPointAddress);
```

## Batch Multiple Calls

Without batching, a "token approve + swap" flow takes two separate UserOperations, each paying gas independently and each waiting for inclusion. Batching combines them into a single atomic operation: either every call succeeds or they all revert together, saving gas and eliminating intermediate states.

### Typed Batch (Same Contract)

When every call targets the same contract, use the generic overload. The handler encodes each message and sends them as a single batch:

```csharp
using Nethereum.StandardTokenEIP20.ContractDefinition;

var mint1 = new TransferFunction { To = "0xRecipient1", Value = Web3.Convert.ToWei(50) };
var mint2 = new TransferFunction { To = "0xRecipient2", Value = Web3.Convert.ToWei(25) };
var mint3 = new TransferFunction { To = "0xRecipient3", Value = Web3.Convert.ToWei(25) };

var receipt = await handler.BatchExecuteAsync<TransferFunction>(mint1, mint2, mint3);
```

All three transfers execute atomically. If recipient3's transfer reverts (for example, insufficient balance), all three revert.

### Mixed Batch (Different Contracts)

Real workflows often span multiple contracts. Use `ToBatchCall()` to convert typed messages into `BatchCall` objects, then batch them together:

```csharp
using Nethereum.StandardTokenEIP20.ContractDefinition;

var tokenAddress = "0xTokenContractAddress";
var dexAddress = "0xDexContractAddress";

// Step 1: Approve the DEX to spend tokens
var approve = new ApproveFunction
{
    Spender = dexAddress,
    Value = Web3.Convert.ToWei(1000)
};

// Step 2: Execute the swap on the DEX
var swap = new SwapExactTokensForTokensFunction
{
    AmountIn = Web3.Convert.ToWei(1000),
    AmountOutMin = Web3.Convert.ToWei(990),
    Path = new List<string> { tokenAddress, wethAddress },
    To = accountAddress,
    Deadline = DateTimeOffset.UtcNow.AddMinutes(20).ToUnixTimeSeconds()
};

var receipt = await handler.BatchExecuteAsync(
    approve.ToBatchCall(),
    swap.ToBatchCall());
```

The approve and swap happen in the same UserOperation. No window exists where the approval is live but the swap hasn't executed yet.

### Batch with ETH Value

Some calls need to send ETH along with calldata. Pass the value when creating the `BatchCall`:

```csharp
var depositCall = new DepositFunction().ToBatchCall(Web3.Convert.ToWei(1));
var stakeCall = new StakeFunction { Amount = Web3.Convert.ToWei(1) }.ToBatchCall();

var receipt = await handler.BatchExecuteAsync(depositCall, stakeCall);
```

You can also construct `BatchCall` directly when you have raw calldata:

```csharp
var call = new BatchCall(encodedCallData, Web3.Convert.ToWei(0.5m));
```

### Raw Calldata Batch

For advanced use cases where you already have encoded calldata (from off-chain computation or another library), pass raw byte arrays:

```csharp
byte[] approveData = new ApproveFunction
{
    Spender = dexAddress,
    Value = Web3.Convert.ToWei(1000)
}.GetCallData();

byte[] swapData = GetSwapCalldataFromExternalSource();

var receipt = await handler.BatchExecuteAsync(approveData, swapData);
```

This is useful when integrating with protocols that provide pre-encoded calldata.

## Batch via SmartAccountService

ERC-7579 modular accounts use the `SmartAccountService` directly. The `ExecuteBatchAsync` method accepts an array of `Call` structs and encodes them using the ERC-7579 execution format:

```csharp
using Nethereum.AccountAbstraction.BaseAccount.ContractDefinition;

var calls = new[]
{
    new Call
    {
        Target = tokenAddress,
        Value = 0,
        Data = new ApproveFunction
        {
            Spender = dexAddress,
            Value = Web3.Convert.ToWei(1000)
        }.GetCallData()
    },
    new Call
    {
        Target = dexAddress,
        Value = 0,
        Data = new SwapExactTokensForTokensFunction
        {
            AmountIn = Web3.Convert.ToWei(1000),
            AmountOutMin = Web3.Convert.ToWei(990),
            Path = new List<string> { tokenAddress, wethAddress },
            To = accountAddress,
            Deadline = DateTimeOffset.UtcNow.AddMinutes(20).ToUnixTimeSeconds()
        }.GetCallData()
    }
};

var receipt = await account.ExecuteBatchAsync(calls);
```

Under the hood, `ExecuteBatchAsync` uses `ERC7579ModeLib.EncodeBatchDefault()` and `ERC7579ExecutionLib.EncodeBatch()` to pack the calls into the standard modular account execution format.

## Gas Sponsorship with Paymasters

A paymaster is a contract that pays gas fees on behalf of users. The EntryPoint calls the paymaster's `validatePaymasterUserOp` before execution and `postOp` after. From the user's perspective, the transaction is gasless.

Attach a paymaster to the handler with a single call:

```csharp
handler.WithPaymaster(paymasterAddress);

// All subsequent operations use this paymaster
var receipt = await handler.BatchExecuteAsync(
    approve.ToBatchCall(),
    swap.ToBatchCall());
```

The bundler includes the paymaster address in the UserOperation. The EntryPoint verifies that the paymaster has staked enough ETH and calls it for validation.

You can also pass additional data that the paymaster contract expects:

```csharp
handler.WithPaymaster(paymasterAddress, paymasterData);
```

## Verifying Paymaster

A verifying paymaster requires an off-chain signature to approve each UserOperation. This is the most common pattern for dApp-sponsored transactions: your backend signs each request after checking business rules (rate limits, user eligibility, etc.).

Retrieve a `VerifyingPaymasterManager` from Web3 using the extension method:

```csharp
using Nethereum.AccountAbstraction.Paymasters;
using Nethereum.AccountAbstraction.Extensions;

var paymasterAddress = "0xYourVerifyingPaymasterAddress";
var paymasterSignerKey = "0xPAYMASTER_SIGNER_PRIVATE_KEY";

var paymaster = await web3.GetVerifyingPaymasterAsync(paymasterAddress, paymasterSignerKey);
```

The paymaster signer key is the private key whose address is registered in the paymaster contract as an authorized signer. The manager handles signing the UserOperation hash with the correct format that the on-chain contract expects.

`VerifyingPaymasterManager` also manages deposits and sponsors UserOperations:

```csharp
// Deposit ETH into the paymaster contract
await paymaster.DepositAsync(Web3.Convert.ToWei(1));

// Check the deposit balance
var deposit = await paymaster.GetDepositAsync();

// Sponsor a UserOperation — signs and attaches paymaster data
var sponsorResult = await paymaster.SponsorUserOperationAsync(userOp);
if (sponsorResult.IsSponsored)
{
    // userOp now has Paymaster, PaymasterData, and gas fields populated
}
```

Wire it into the handler using a `PaymasterConfig`:

```csharp
var config = new PaymasterConfig(paymasterAddress, async userOp =>
{
    return await paymaster.GetPaymasterDataAsync(userOp);
});

handler.WithPaymaster(config);
```

The paymaster signs each UserOperation just before submission, ensuring the signature covers the final gas values.

### More Control: Manual Paymaster Fields

When building UserOperations manually (without `AAContractHandler`), set the paymaster fields directly on the `UserOperation`:

```csharp
var userOp = new UserOperation
{
    Sender = accountAddress,
    CallData = executeFunction.GetCallData(),
    Paymaster = paymasterAddress,
    PaymasterData = Array.Empty<byte>(),
    PaymasterVerificationGasLimit = 100_000,
    PaymasterPostOpGasLimit = 50_000,
    MaxFeePerGas = 2_000_000_000,
    MaxPriorityFeePerGas = 1_000_000_000
};
```

The `Paymaster` field is the paymaster contract address. `PaymasterData` contains any data the paymaster contract requires for validation (empty for accept-all paymasters). `PaymasterVerificationGasLimit` and `PaymasterPostOpGasLimit` control how much gas the paymaster's `validatePaymasterUserOp` and `postOp` functions can consume.

## Deposit Paymaster

A deposit paymaster works differently: users (or a sponsor) deposit funds into the paymaster contract ahead of time. When the user submits a UserOperation, the paymaster deducts from their deposit balance instead of requiring a per-operation signature.

This pattern works well for application chains where all gas is sponsored from a shared pool:

```csharp
var paymasterAddress = "0xYourDepositPaymasterAddress";

var depositPaymaster = web3.GetDepositPaymasterAsync(paymasterAddress);
```

The `DepositPaymasterManager` provides methods to check deposit balances and add deposits. Configure it on the handler:

```csharp
handler.WithPaymaster(paymasterAddress);
```

Since the deposit paymaster validates by checking the sender's on-chain deposit, no dynamic signing is needed — a static paymaster address is sufficient.

## Dynamic Paymaster Data

Some paymasters need data that can only be computed at submission time — a timestamp-based signature, a price oracle quote, or data from a paymaster API. Use the `Func<UserOperation, Task<byte[]>>` overload to compute paymaster data dynamically:

```csharp
var config = new PaymasterConfig(
    paymasterAddress,
    async userOp =>
    {
        // Call your paymaster API with the UserOperation
        var response = await httpClient.PostAsJsonAsync(
            "https://paymaster.example.com/sign",
            new { userOp = userOp });

        var result = await response.Content.ReadFromJsonAsync<PaymasterResponse>();
        return result.PaymasterData.HexToByteArray();
    });

handler.WithPaymaster(config);
```

The function receives the fully populated `UserOperation` (with gas estimates already filled in) and returns the byte array that gets appended to the `paymasterAndData` field. This runs just before the operation is signed and submitted to the bundler.

A common pattern is time-limited sponsorship where the paymaster backend includes a validity window:

```csharp
var config = new PaymasterConfig(
    paymasterAddress,
    async userOp =>
    {
        var validUntil = DateTimeOffset.UtcNow.AddMinutes(10).ToUnixTimeSeconds();
        var validAfter = DateTimeOffset.UtcNow.AddSeconds(-30).ToUnixTimeSeconds();

        // Pack validity window + signature from your paymaster signer
        return await paymaster.GetPaymasterDataWithValidityAsync(
            userOp, validUntil, validAfter);
    });

handler.WithPaymaster(config);
```

## Common Mistakes

**Batch calls targeting the wrong address.** Each `BatchCall` carries only calldata, not a target address. When using `BatchExecuteAsync<T>`, all calls go to the contract the handler is bound to. If you need different target contracts, use the `BatchCall[]` overload and make sure each call is associated with the correct contract through the handler configuration.

**Paymaster not funded.** The EntryPoint checks that the paymaster has sufficient stake and deposit before accepting the UserOperation. If the paymaster contract has no ETH deposited, the bundler rejects the operation with an `AA31` or `AA32` error. Fund the paymaster's deposit on the EntryPoint contract before use.

**Paymaster data expired.** Verifying paymasters typically include a validity window in the signed data. If you pre-sign paymaster data and then submit the UserOperation too late, the on-chain validation fails. Use dynamic paymaster data (the `Func<>` overload) to sign at submission time, and keep validity windows generous enough to account for network latency.

**Mixing batch approaches.** Pick one batching style per operation. Don't mix `BatchExecuteAsync<T>` with raw calldata in the same call — use the `BatchCall[]` overload when you need heterogeneous calls.

**Forgetting gas estimation.** Batched operations consume more gas than single calls. The handler estimates gas automatically, but if you override gas limits manually, ensure they account for every call in the batch.

## Next Steps

- **[Modular Accounts](guide-modular-accounts)** — add session keys and spending policies to your smart account for fine-grained access control.
- **[Run a Bundler](guide-run-bundler)** — deploy your own Nethereum bundler for full control over UserOperation submission and gas pricing.
