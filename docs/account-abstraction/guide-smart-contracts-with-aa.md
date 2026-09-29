---
title: Smart Contracts with AA
sidebar_label: Smart Contracts with AA
sidebar_position: 3
description: Route existing typed contract services through Account Abstraction — every call becomes a UserOperation automatically.
---

# Smart Contracts with AA

If you already have typed contract services — Nethereum's built-in ERC-20/ERC-721/ERC-1155/ENS services, or your own code-generated services from an ABI — you don't need to build UserOperations manually (as shown in [Send a UserOperation](guide-send-useroperation)). Two extension methods switch any contract service to route calls through a bundler instead: every `SendRequestAndWaitForReceiptAsync` becomes a UserOperation automatically, and every read-only query still goes straight to `eth_call`.

:::tip The Simple Way

```csharp
erc20Service.SwitchToAccountAbstraction(accountAddress, accountKey, bundlerService, entryPointAddress);

var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(recipient, amount);
```

That's it. The handler builds, signs, and submits the UserOperation. Gas estimation is automatic. `accountKey` is an `EthECKey` and `bundlerService` is an `IAccountAbstractionBundlerService` — see below for how to build both.

:::

## Prerequisites

Install the Account Abstraction package alongside the standard contract libraries:

```bash
dotnet add package Nethereum.AccountAbstraction
dotnet add package Nethereum.Web3
```

You need:

- A **smart contract account** address (SimpleAccount, a modular NethereumAccount, or any ERC-4337-compatible wallet). A modular account needs `.WithErc7579Execution()` on the handler.
- A **signer key** (`EthECKey`, or any `IAccountSigningService` for hardware/KMS/WebAuthn) that the smart account accepts for validation.
- A **bundler** — an `IAccountAbstractionBundlerService`, typically `AccountAbstractionBundlerService` talking to a real bundler's JSON-RPC endpoint.
- The **EntryPoint contract address** for your target chain — use `EntryPointAddresses.Latest` (v0.9) or `V08`; `V06`/`V07` throw `NotSupportedException` (see [Send a UserOperation](guide-send-useroperation#entrypoint-versions)).
- A **token or contract address** to call — this guide uses an ERC-20 token as the running example.

## Switch a Contract Service to AA

There are two extension methods, and which one applies depends on the service's base type:

| Base Type | Method | Used By |
|-----------|--------|---------|
| `IContractHandlerService` | `SwitchToAccountAbstraction` | Nethereum's built-in services — `web3.Eth.ERC20`, `ERC721`, `ERC1155`, ENS |
| `ContractWeb3ServiceBase` | `ChangeContractHandlerToAA` | Your own code-generated services (from an ABI) |

Both methods take the same shape — `(accountAddress, signer, bundlerService, entryPointAddress, factory: ...)` — and configure the same `AAContractHandler` under the hood, returning it for fluent configuration (paymaster, gas, batching — covered below).

### Built-in services (`web3.Eth.ERC20`, ERC721, ERC1155, ENS)

Nethereum's own ERC-20 service comes from `web3.Eth.ERC20.GetContractService(address)`. Switch it to AA the same way you would any typed service, then call it exactly as before — writes become UserOperations, reads stay as `eth_call`:

```csharp
using Nethereum.AccountAbstraction;
using Nethereum.Signer;
using Nethereum.RPC;
using Nethereum.JsonRpc.Client;
using Nethereum.Web3;

var accountKey = EthECKey.GenerateKey();

// accountAddress + factoryConfig come from your SimpleAccountFactoryService — see Deploy a Smart Account for the full derivation.
// FactoryConfig is for SimpleAccountFactory only; a NethereumAccount is created through IAAClient.Configure / CreateAccountAsync.
string accountAddress = "0xYourSmartAccountAddress";
var factoryConfig = new FactoryConfig(factoryAddress: "0xYourFactoryAddress", owner: accountKey.GetPublicAddress(), salt: 0);

// Fund the (counterfactual) account so it can pay for its own deployment + first UserOperation
await web3.Eth.GetEtherTransferService().TransferEtherAndWaitForReceiptAsync(accountAddress, 0.1m);

var bundlerService = new AccountAbstractionBundlerService(new RpcClient(new Uri("https://your-bundler-url")));
var erc20Service = web3.Eth.ERC20.GetContractService(tokenAddress);

erc20Service.SwitchToAccountAbstraction(
    accountAddress,
    accountKey,
    bundlerService,
    EntryPointAddresses.Latest,
    factory: factoryConfig);

// Every write now goes through the bundler as a UserOperation
var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync("0xRecipientAddress", Web3.Convert.ToWei(100));
Console.WriteLine($"UserOp Success: {((AATransactionReceipt)receipt).UserOpSuccess}");

// Reads are unaffected — still a direct eth_call, no UserOperation involved
var balance = await erc20Service.BalanceOfQueryAsync(accountAddress);
```

The `factory` parameter is optional — pass it whenever the account might not be deployed yet (see First-Time Account Deployment below); omit it once you know the account already has code. `SwitchToAccountAbstraction` works identically for `web3.Eth.ERC721`, `web3.Eth.ERC1155`, and the ENS services — they all implement `IContractHandlerService`.

### Code-generated services (`ChangeContractHandlerToAA`)

A service generated from your own contract's ABI extends `ContractWeb3ServiceBase`, so it uses `ChangeContractHandlerToAA` instead. The call shape is identical — only the method name and the base type differ:

```csharp
using Nethereum.AccountAbstraction;
using Nethereum.Signer;

// myContractService is any code-generated service extending ContractWeb3ServiceBase
myContractService.ChangeContractHandlerToAA(
    accountAddress,
    accountKey,
    bundlerService,
    EntryPointAddresses.Latest,
    factory: factoryConfig);

// Calls generated from your contract's ABI now execute via UserOperation
var receipt = await myContractService.YourFunctionRequestAndWaitForReceiptAsync();
```

The exact method name on the last line (`YourFunctionRequestAndWaitForReceiptAsync`) comes from your contract's own ABI-generated methods — Nethereum's own test suite exercises this with a simple `Counter` contract (`TestCounterService`/`CountRequestAndWaitForReceiptAsync`), but the pattern is the same for any generated service.

### Signing from a raw private key

If you're holding a private key as a hex string rather than an `EthECKey`, wrap it before passing it in — there is no string-based overload that takes a raw key or a bundler URL directly:

```csharp
var accountKey = new EthECKey(privateKeyHex);
```

`ChangeContractHandlerToAA` also accepts a standard `IAccount` (its `AccountSigningService` becomes the UserOperation signer) or an explicit `IAccountSigningService` + `IErc7579ValidatorModule?` pair — the same seam used for hardware/KMS/MPC signers and WebAuthn, when you need something other than a raw `EthECKey`. `SwitchToAccountAbstraction` (for built-in services like `web3.Eth.ERC20`) only has the `EthECKey` overload. The `IAccount` / `IAccountSigningService` overloads are constrained to services deriving from `ContractWeb3ServiceBase` (an ABI-generated typed service), so a non-`EthECKey` signer — hardware/KMS/MPC or WebAuthn — needs an ABI-generated service for the same contract driven through `ChangeContractHandlerToAA`; the built-in `web3.Eth.ERC20`/`ERC721`/`ERC1155` services are `EthECKey`-only for AA today.

`ChangeContractHandlerToAA`/`SwitchToAccountAbstraction` are the direct, lower-level entry points shown throughout this guide. [Deploy a Smart Account](guide-smart-account-deployment) covers a different, higher-level on-ramp, `IAAClient` (`aaClient.Configure(service, account)`, exposed to contract services via its own `UseAccountAbstraction` extension method — not to be confused with `SwitchToAccountAbstraction` above) — it's built on top of `ChangeContractHandlerToAA` for the modular `NethereumAccount`/`SmartAccount` model, so it's the same underlying handler reached through a different entry point, not a competing API.

## First-Time Account Deployment

When a smart account has not been deployed yet, the UserOperation must include `InitCode` so the EntryPoint creates it on-chain. Pass a `FactoryConfig` to handle this automatically:

```csharp
var factoryConfig = new FactoryConfig(
    factoryAddress: "0xYourAccountFactoryAddress",
    owner: accountKey.GetPublicAddress(),
    salt: 0);

erc20Service.SwitchToAccountAbstraction(
    accountAddress,
    accountKey,
    bundlerService,
    EntryPointAddresses.Latest,
    factory: factoryConfig);
```

The handler checks whether the account already has deployed code. If it does, the factory config is ignored and `InitCode` stays empty. If the account has no code, `InitCode` is built from the factory address and the encoded create call — the first UserOperation deploys the account and executes your call atomically. Subsequent operations automatically omit the factory once the account exists.

## Batch Multiple Calls

`AAContractHandler` (the object either extension method returns) can batch multiple contract calls into a single UserOperation — useful for approve-then-transfer patterns where you want atomicity and a single signature. Use `ToBatchCall()` to convert typed function messages into `BatchCall` objects, all targeting the handler's own contract address:

```csharp
using Nethereum.Contracts.Standards.ERC20.ContractDefinition;

var handler = erc20Service.SwitchToAccountAbstraction(
    accountAddress, accountKey, bundlerService, EntryPointAddresses.Latest, factory: factoryConfig);

var receipt = await handler.BatchExecuteAsync(
    new ApproveFunction { Spender = spenderAddress, Value = 500 }.ToBatchCall(),
    new TransferFunction { To = recipientAddress, Value = 500 }.ToBatchCall());
```

Both calls execute atomically in one UserOperation — if either reverts, the whole operation reverts. You can also pass raw call data bytes (`handler.BatchExecuteAsync(callData1, callData2)`) or a set of `FunctionMessage` objects of the same type directly (`handler.BatchExecuteAsync(msg1, msg2, msg3)`) when you don't need per-call ETH values. See [Batching and Paymasters](guide-batching-and-paymasters) for the full batching guide, including calls that carry ETH value via `ToBatchCall(ethValue: ...)`.

## Add a Paymaster

A paymaster sponsors gas so the smart account does not need to hold ETH. Chain `WithPaymaster` onto the handler before executing:

```csharp
var handler = erc20Service.SwitchToAccountAbstraction(
    accountAddress, accountKey, bundlerService, EntryPointAddresses.Latest, factory: factoryConfig);

handler.WithPaymaster(paymasterAddress); // omit paymasterData for a paymaster that needs none

var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(recipientAddress, Web3.Convert.ToWei(50));
```

The handler fills in usable `PaymasterVerificationGasLimit`/`PaymasterPostOpGasLimit` values from the bundler's own estimate automatically — you don't need to set them yourself.

If the paymaster requires signed data (a verifying paymaster), provide a `PaymasterConfig` with a data provider callback that receives the `UserOperation` after gas estimation has filled its gas limits and returns the paymaster data bytes:

```csharp
handler.WithPaymaster(new PaymasterConfig(
    paymasterAddress,
    dataProvider: async (userOp) =>
    {
        // Call your paymaster backend to get a signature over the UserOperation
        return await paymasterBackend.GetSignatureAsync(userOp);
    }));
```

The data provider runs after gas estimation, once the UserOperation's final gas values are known — a verifying paymaster typically signs over those values, so it must see the completed operation. This lets a paymaster sponsor even a zero-balance, not-yet-deployed account end to end, since neither the account nor the caller pays for gas.

`WithPaymaster` also has a simpler overload for static data: `WithPaymaster(paymasterAddress, paymasterData)`. See [Batching and Paymasters](guide-batching-and-paymasters) for a deeper walkthrough of paymaster configuration — both the static-data and `PaymasterConfig` data-provider paths shown above are exercised end to end (real bundler estimate, real EntryPoint, sponsored execution) by Nethereum's own test suite.

## Inspect the Receipt

`AATransactionReceipt` extends the standard `TransactionReceipt` with UserOperation-specific fields. Every call routed through AA returns one — cast the result to inspect it:

```csharp
var receipt = (AATransactionReceipt)await erc20Service.TransferRequestAndWaitForReceiptAsync(
    "0xRecipientAddress", Web3.Convert.ToWei(10));

// Standard transaction fields (from the bundle transaction)
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
    // FailureDiagnostic distinguishes a decoded revert from a bare failure with no reason
    // (the shape of an inner-call out-of-gas) — see IsLikelyOutOfGas for the same check as a bool.
    Console.WriteLine(receipt.FailureDiagnostic);
}
```

Always check `UserOpSuccess`, not just that the call returned without throwing — the transaction itself can succeed (the EntryPoint processed it) while the inner call reverts.

## More Control: Gas Configuration

The handler estimates gas automatically, but you can adjust buffers, multipliers, and receipt-polling behavior for chains with volatile gas prices or custom gas rules:

```csharp
handler.WithGasConfig(new AAGasConfig
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
| `CallGasBuffer` | none | Extra gas added to `CallGasLimit` after estimation |
| `VerificationGasBuffer` | none | Extra gas added to `VerificationGasLimit` |
| `PreVerificationGasBuffer` | 1000 | Extra gas added to `PreVerificationGas` — covers signature byte-size variance between the dummy signature used during estimation and the real one |
| `CallGasMultiplier` | 1.0 | Multiplier applied to estimated `CallGasLimit` |
| `VerificationGasMultiplier` | 1.0 | Multiplier applied to estimated `VerificationGasLimit` |
| `ReceiptPollIntervalMs` | 1000 | Milliseconds between receipt polling attempts |
| `ReceiptTimeoutMs` | 60000 | Maximum wait time before timing out |

Buffers are added after multipliers are applied. A multiplier of `1.2m` means 20% headroom on top of the bundler's estimate.

## Common Mistakes

**Passing the node URL instead of the bundler URL.** The bundler has its own JSON-RPC endpoint, separate from the Ethereum node. If `AccountAbstractionBundlerService` points at the node's RPC, the bundler methods (`eth_sendUserOperation`, `eth_estimateUserOperationGas`) fail with method-not-found errors.

**Forgetting the factory config for new accounts.** If the smart account has never been deployed, the bundler rejects the UserOperation because the sender has no code. Always pass a `FactoryConfig` when working with accounts that might not exist on-chain yet.

**Not funding the smart account.** Even though the handler builds the UserOperation for you, the EntryPoint still charges gas. Without a paymaster, the smart account must hold enough ETH to cover gas costs. Fund the account address before sending operations, or use a paymaster.

**Checking that the call didn't throw instead of `UserOpSuccess`.** A `TransferRequestAndWaitForReceiptAsync` call that returns normally only means the bundler included the operation in a bundle — the inner execution can still revert. Always check `receipt.UserOpSuccess` (cast to `AATransactionReceipt`) and `receipt.RevertReason`/`receipt.FailureDiagnostic` when it's `false`.

**Reaching for a string-based "simple" overload.** There is no `ChangeContractHandlerToAA`/`SwitchToAccountAbstraction` overload that takes a private key string and a bundler URL string directly — wrap the key in an `EthECKey` and build an `AccountAbstractionBundlerService` from an `RpcClient`, as shown above.

## Next Steps

- [Deploy a Smart Account](guide-smart-account-deployment) — create and deploy SimpleAccount or custom smart accounts using a factory.
- [Batching and Paymasters](guide-batching-and-paymasters) — combine multiple calls in one UserOperation and sponsor gas with paymasters in depth.
- [Send a UserOperation Manually](guide-send-useroperation) — build and submit UserOperations by hand when you need full control over every field.
