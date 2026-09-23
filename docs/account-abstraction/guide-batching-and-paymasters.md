---
title: Batching & Paymasters
sidebar_label: Batching & Paymasters
sidebar_position: 11
description: Execute multiple calls in a single UserOperation and sponsor gas fees with paymasters using Nethereum Account Abstraction.
---

# Batching & Paymasters

Two of the most powerful ERC-4337 features are batching — executing multiple calls in a single UserOperation — and paymasters — letting a third party sponsor gas fees. This guide covers both in depth. If you haven't switched a contract service to Account Abstraction yet, start with [Use AA with Contract Services](guide-smart-contracts-with-aa) — `AAContractHandler` (the object it returns) is what every example below builds on.

:::tip The Simple Way

```csharp
// Batch: three calls to the SAME contract in one UserOperation
var receipt = await handler.BatchExecuteAsync(
    new TransferFunction { To = recipient1, Value = amount }.ToBatchCall(),
    new TransferFunction { To = recipient2, Value = amount }.ToBatchCall());

// Paymaster: sponsor gas
handler.WithPaymaster(paymasterAddress);
```

Batching and gas sponsorship — a couple of lines each. Read on for what each call actually does and where the sharp edges are.

:::

## Prerequisites

Install the Account Abstraction packages:

```bash
dotnet add package Nethereum.Web3
dotnet add package Nethereum.AccountAbstraction
```

You need:

- A **smart contract account** (SimpleAccount or any ERC-4337-compatible wallet) already switched to Account Abstraction via `ChangeContractHandlerToAA`/`SwitchToAccountAbstraction` (see [Use AA with Contract Services](guide-smart-contracts-with-aa)).
- A **bundler endpoint** (your own Nethereum bundler or a third-party service).
- The **EntryPoint contract address** — use `EntryPointAddresses.Latest` (v0.9) or `V08`; `V06`/`V07` throw `NotSupportedException` (see [Send a UserOperation](guide-send-useroperation#entrypoint-versions)).
- For paymaster examples: a **deployed paymaster contract** with sufficient stake and deposit at the EntryPoint.

Set up the handler that the batching examples in this guide use — a code-generated service (from your contract's ABI) switched to AA:

```csharp
using Nethereum.AccountAbstraction;
using Nethereum.Signer;
using Nethereum.Web3;

var accountKey = new EthECKey("0xYOUR_SIGNER_PRIVATE_KEY");
var accountAddress = "0xYourSmartAccountAddress";
var bundlerService = new AccountAbstractionBundlerService(
    new Nethereum.JsonRpc.Client.RpcClient(new Uri("http://localhost:4337")));

// myTokenService is any code-generated service extending ContractWeb3ServiceBase
// (e.g. web3.Eth.ERC20.GetContractService(tokenAddress))
// factoryConfig comes from your account factory (see Deploy a Smart Account) - omit once the account is deployed
var handler = myTokenService.ChangeContractHandlerToAA(
    accountAddress,
    accountKey,
    bundlerService,
    EntryPointAddresses.Latest,
    factory: factoryConfig);
```

## Batch Multiple Calls

Without batching, a multi-step flow takes several separate UserOperations, each paying gas and waiting for inclusion independently. Batching combines them into a single atomic operation: either every call succeeds or they all revert together, saving gas and eliminating intermediate states.

`AAContractHandler.BatchExecuteAsync` has three overloads, and all three encode into the account's `executeBatch(...)` call — **every call in the batch targets the same contract: the one `handler` is bound to** (its `ContractAddress`, set when you called `ChangeContractHandlerToAA`/`SwitchToAccountAbstraction`). `BatchCall` carries only calldata and an optional ETH value, not a target address, so there is no way to send different calls in one batch to different contracts today — see Common Mistakes below.

### Typed Batch via `ToBatchCall()`

Convert typed `FunctionMessage` objects into `BatchCall`s with the `ToBatchCall()` extension method, then pass them to `BatchExecuteAsync`:

```csharp
using Nethereum.Contracts.Standards.ERC20.ContractDefinition;

var receipt = await handler.BatchExecuteAsync(
    new TransferFunction { To = "0xRecipient1", Value = Web3.Convert.ToWei(50) }.ToBatchCall(),
    new TransferFunction { To = "0xRecipient2", Value = Web3.Convert.ToWei(25) }.ToBatchCall(),
    new TransferFunction { To = "0xRecipient3", Value = Web3.Convert.ToWei(25) }.ToBatchCall());

Console.WriteLine($"Batch UserOp Success: {receipt.UserOpSuccess}"); // false + RevertReason if any call reverted
```

All three transfers execute atomically against the ERC-20 contract `handler` is bound to — if the third transfer reverts (for example, insufficient balance), all three revert. `ToBatchCall()` works with any `FunctionMessage`, so you can freely mix different call types (e.g. `ApproveFunction` and `TransferFunction`) in the same batch as long as they all belong to the contract the handler targets.

### Raw Calldata Batch

For advanced use cases where you already have encoded calldata (from off-chain computation or another library), pass raw byte arrays directly — `BatchExecuteAsync(params byte[][])` wraps each one in a zero-value `BatchCall` for you:

```csharp
byte[] approveSpender1 = new ApproveFunction { Spender = spender1, Value = Web3.Convert.ToWei(1000) }.GetCallData();
byte[] approveSpender2 = new ApproveFunction { Spender = spender2, Value = Web3.Convert.ToWei(500) }.GetCallData();

var receipt = await handler.BatchExecuteAsync(approveSpender1, approveSpender2);
```

This is useful when integrating with protocols that provide pre-encoded calldata, or when replaying calldata captured elsewhere. Each `BatchCall` (and the `ToBatchCall(ethValue: …)` overload) also carries an optional ETH value, forwarded to the account's `execute` call for that item — so a batch can attach ETH to individual calls, not just calldata.

## Gas Sponsorship with Paymasters

A paymaster is a contract that pays gas fees on behalf of users. The EntryPoint calls the paymaster's `validatePaymasterUserOp` before execution and `postOp` after. From the user's perspective, the transaction is gasless. Configure a paymaster once on the handler — it applies to every subsequent operation, including batches:

```csharp
handler.WithPaymaster(paymasterAddress);

var receipt = await handler.BatchExecuteAsync(
    new TransferFunction { To = recipient1, Value = amount }.ToBatchCall(),
    new TransferFunction { To = recipient2, Value = amount }.ToBatchCall());
```

The handler fills in `PaymasterVerificationGasLimit`/`PaymasterPostOpGasLimit` from the bundler's own gas estimate automatically — you don't set them yourself. This is enough for a paymaster that accepts every operation unconditionally (an "accept-all" paymaster, or one that gates purely on its own on-chain deposit).

### Static Paymaster Data

If the paymaster contract expects a fixed byte payload for every operation, pass it as the second argument:

```csharp
handler.WithPaymaster(paymasterAddress, paymasterData);

var receipt = (AATransactionReceipt)await myTokenService.TransferRequestAndWaitForReceiptAsync(recipient, amount);
Console.WriteLine($"Paymaster-sponsored UserOp Success: {receipt.UserOpSuccess}");
```

### Dynamic Paymaster Data: `PaymasterConfig` with a Data Provider

A **verifying paymaster** requires an off-chain signature over each UserOperation — the common pattern for dApp-sponsored transactions, where your backend signs after checking business rules (rate limits, eligibility, and so on). Because the signature typically covers the operation's final gas values, the data provider must run *after* gas estimation — pass a `PaymasterConfig` with a callback instead of static bytes, and the handler invokes it once the UserOperation is fully estimated:

```csharp
using Nethereum.AccountAbstraction;
using Nethereum.AccountAbstraction.Contracts.Paymaster.VerifyingPaymaster;
using Nethereum.Hex.HexConvertors.Extensions;
using Nethereum.Signer;
using System.Linq;

async Task<byte[]> SignVerifyingPaymasterDataAsync(
    VerifyingPaymasterService paymaster, UserOperation userOp, EthECKey signerKey)
{
    var validUntil = (ulong)DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds();
    const ulong validAfter = 0;

    // getHash excludes paymasterAndData, so it can be computed before the signature exists.
    var packedForHash = UserOperationBuilder.PackUserOperation(userOp);
    packedForHash.InitCode ??= Array.Empty<byte>();
    packedForHash.CallData ??= Array.Empty<byte>();
    packedForHash.PaymasterAndData ??= Array.Empty<byte>();
    packedForHash.Signature ??= Array.Empty<byte>();

    var hash = await paymaster.GetHashQueryAsync(packedForHash, validUntil, validAfter);
    var signature = new EthereumMessageSigner().Sign(hash, signerKey).HexToByteArray();

    // The reference ERC-4337 VerifyingPaymaster expects validUntil(6) || validAfter(6) || signature —
    // the exact layout is paymaster-specific, so check your contract's own _parsePaymasterData.
    return PackValidity(validUntil, validAfter, signature);
}

byte[] PackValidity(ulong validUntil, ulong validAfter, byte[] signature)
{
    byte[] ToUInt48BigEndian(ulong value)
    {
        var bytes = new byte[6];
        for (var i = 5; i >= 0; i--) { bytes[i] = (byte)value; value >>= 8; }
        return bytes;
    }

    return ToUInt48BigEndian(validUntil).Concat(ToUInt48BigEndian(validAfter)).Concat(signature).ToArray();
}

handler.WithPaymaster(new PaymasterConfig(
    paymasterAddress,
    userOp => SignVerifyingPaymasterDataAsync(verifyingPaymasterService, userOp, paymasterSignerKey)));

// Estimation now succeeds (no AA33) and the op lands fully sponsored — even for a counterfactual
// account with a zero ETH balance, since only the paymaster ever pays.
var receipt = (AATransactionReceipt)await myTokenService.TransferRequestAndWaitForReceiptAsync(recipient, amount);
Console.WriteLine($"Sponsored UserOp Success: {receipt.UserOpSuccess}"); // true even though the account holds 0 ETH
```

This is the pattern Nethereum's own test suite proves end to end: a real, deployed, deposit-funded `VerifyingPaymaster` sponsors a not-yet-deployed account that holds zero ETH, with the signature computed after the bundler's gas estimate comes back.

### Manual Paymaster Fields (No `AAContractHandler`)

When you build a `UserOperation` by hand instead of going through `AAContractHandler` (see [Send a UserOperation](guide-send-useroperation)), set the paymaster fields directly:

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

`Paymaster` is the paymaster contract address; `PaymasterData` is whatever bytes that paymaster's validation expects (empty for an accept-all paymaster). Estimate gas via the bundler and sign, exactly as in [Send a UserOperation](guide-send-useroperation) — the only difference from a self-funded operation is that these two fields are populated before estimation. This manual-fields path — a single sponsored transfer, a sponsored batch across several recipients, and repeated sequential sponsored operations — is exercised end to end by Nethereum's own test suite against a real bundler and EntryPoint.

## Choosing an Approach

| Scenario | Approach |
|----------|----------|
| Smart account holds its own ETH | No paymaster — omit `WithPaymaster` entirely |
| Gas sponsored unconditionally (accept-all or self-funded-deposit paymaster) | `handler.WithPaymaster(paymasterAddress)`, optionally with static `paymasterData` |
| Sponsorship gated by a backend decision, rate limit, or per-request signature | `handler.WithPaymaster(new PaymasterConfig(paymasterAddress, dataProvider))` |
| Building UserOperations by hand, without `AAContractHandler` | Set `userOp.Paymaster`/`PaymasterData`/gas-limit fields directly |

## Common Mistakes

**Assuming a batch can span multiple contracts.** `BatchCall` carries only calldata and an ETH value, not a target address — every call in a `BatchExecuteAsync` batch is sent to `handler`'s own `ContractAddress`. There is currently no `AAContractHandler` API for batching calls to *different* contracts (an "approve on the token, then swap on the DEX" pattern) in one UserOperation. If you need that, you must drive the account's own `execute`/`executeBatch` calldata yourself (see [Send a UserOperation](guide-send-useroperation)) rather than going through `BatchExecuteAsync`.

**Paymaster not funded.** The EntryPoint checks that the paymaster has a sufficient deposit before accepting the UserOperation. A zero-deposit paymaster is rejected at admission with `AA31` — fund the paymaster's EntryPoint deposit before use.

**Paymaster data expired.** Verifying paymasters typically include a validity window in the signed data. If you pre-sign paymaster data and then submit late, on-chain validation fails. Use the `PaymasterConfig` data-provider path to sign at submission time, and keep validity windows generous enough for network latency — the data provider sees the fully-estimated operation, so signing happens as late as possible.

**Forgetting `await` on paymaster setup calls.** `WithPaymaster` itself is synchronous (it just stores configuration on the handler), but if your `PaymasterConfig` data provider calls an async signer, backend API, or contract query, make sure that call is awaited inside the callback — an un-awaited `Task<byte[]>` returned as `byte[]` won't compile, but an un-awaited *inner* call (e.g. a fire-and-forget HTTP request) silently races the real submission.

**Reaching for a deleted `SmartAccountService`.** Older examples of Nethereum AA batching referenced a `SmartAccountService` type — it has been removed. Batching goes through `AAContractHandler.BatchExecuteAsync` as shown above. ERC-7579 modular accounts have their own execution encoding (`WithErc7579Execution()`); see [ERC-7579 Modular Accounts](guide-modular-accounts) for that model.

## Next Steps

- **[Run a Bundler](guide-run-bundler)** — deploy your own Nethereum bundler for full control over UserOperation submission and gas pricing.
- **[ERC-7579 Modular Accounts](guide-modular-accounts)** — add session keys and spending policies to your smart account for fine-grained access control.
- **[Use AA with Contract Services](guide-smart-contracts-with-aa)** — the `ChangeContractHandlerToAA`/`SwitchToAccountAbstraction` entry points every example on this page builds on.
