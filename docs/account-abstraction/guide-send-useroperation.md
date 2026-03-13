---
title: Send a UserOperation
sidebar_label: Send a UserOperation
sidebar_position: 2
description: Send your first ERC-4337 UserOperation using Nethereum's Account Abstraction libraries
---

# Send a UserOperation

ERC-4337 replaces traditional EOA transactions with **UserOperations** — meta-transactions that are executed by a smart contract wallet on your behalf. Instead of broadcasting directly to the mempool, you submit a UserOperation to a **Bundler**, which packages it into a real transaction and sends it through the **EntryPoint** contract. Use UserOperations when you need smart account features like batched calls, gas sponsorship via paymasters, or social recovery.

:::tip The Simple Way

You don't need to build UserOperations by hand. Switch any existing contract service to Account Abstraction mode and every call becomes a UserOperation automatically:

```csharp
using Nethereum.AccountAbstraction;

// Switch any existing contract service to AA — all calls become UserOperations
erc20Service.ChangeContractHandlerToAA(accountAddress, privateKey, bundlerUrl, entryPointAddress);
var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(
    new TransferFunction { To = recipient, Value = amount });
```

That's it — gas estimation, signing, and bundler submission are all automatic. This guide shows what happens under the hood.

:::

## Prerequisites

Install the required packages:

```bash
dotnet add package Nethereum.Web3
dotnet add package Nethereum.AccountAbstraction
dotnet add package Nethereum.AccountAbstraction.SimpleAccount
```

You will also need:

- A deployed smart account (see [Deploy a Smart Account](guide-smart-account-deployment) if you don't have one yet)
- A bundler endpoint URL (your own Nethereum bundler or a third-party service)
- An EOA private key that owns the smart account

## How UserOperations Work

A UserOperation never hits the blockchain directly. It follows this path:

```
Your App
   |
   |  1. Build & sign UserOperation
   v
Bundler (JSON-RPC)
   |
   |  2. Validate and estimate gas
   v
EntryPoint.handleOps()
   |
   |  3. Verify signature & pay gas
   |
   +--> SmartAccount.validateUserOp()
   |         |
   |         +--> (optional) Paymaster.validatePaymasterUserOp()
   |
   |  4. Execute the actual call
   |
   +--> SmartAccount.execute(callData)
```

The Bundler is a JSON-RPC service that accepts UserOperations, validates them, estimates gas, and submits them to the EntryPoint. Nethereum provides `AccountAbstractionBundlerService` to talk to any ERC-4337 compliant bundler.

## Build and Send a UserOperation

This example sends 0.01 ETH from a smart account to a recipient address. We will walk through each step: building the inner call, constructing the UserOperation, estimating gas, signing, and submitting.

### Step 1 — Create the Inner Call

The `ExecuteFunction` describes what the smart account should do once the UserOperation is validated. Set the `Target` address, `Value` in wei, and `Data` (empty for a plain ETH transfer):

```csharp
using Nethereum.AccountAbstraction;
using Nethereum.AccountAbstraction.SimpleAccount;
using Nethereum.Hex.HexConvertors.Extensions;
using Nethereum.Web3;
using Nethereum.Signer;
using System.Numerics;

var recipientAddress = "0xRecipientAddressHere";
var valueInWei = Web3.Convert.ToWei(0.01m); // 0.01 ETH

var executeFunction = new ExecuteFunction
{
    Target = recipientAddress,
    Value = valueInWei,
    Data = new byte[0] // no calldata for a plain ETH transfer
};
```

The `CallData` for the UserOperation is the ABI-encoded `ExecuteFunction`. If you want to call a contract instead, encode that contract's function call as the `Data` field.

### Step 2 — Build the UserOperation

Create a `UserOperation` with the sender address and the encoded call data. Leave gas fields at zero for now — the bundler will estimate them:

```csharp
var smartAccountAddress = "0xYourSmartAccountAddress";
var entryPointAddress = EntryPointAddresses.Latest; // V09

var userOp = new UserOperation
{
    Sender = smartAccountAddress,
    CallData = executeFunction.GetCallData(),
    MaxFeePerGas = Web3.Convert.ToWei(30, Nethereum.Util.UnitConversion.EthUnit.Gwei),
    MaxPriorityFeePerGas = Web3.Convert.ToWei(1, Nethereum.Util.UnitConversion.EthUnit.Gwei)
};
```

If this is the first transaction for a new account, populate `InitCode` with the factory address and deployment calldata. See [Deploy a Smart Account](guide-smart-account-deployment) for details.

### Step 3 — Estimate Gas via the Bundler

Connect to the bundler and request gas estimates. The bundler simulates the UserOperation and returns the three gas fields:

```csharp
var bundlerUrl = "http://localhost:4337"; // your bundler endpoint
var bundlerClient = new Nethereum.JsonRpc.Client.RpcClient(new Uri(bundlerUrl));
var bundlerService = new AccountAbstractionBundlerService(bundlerClient);

var gasEstimate = await bundlerService.EstimateUserOperationGas
    .SendRequestAsync(userOp, entryPointAddress);

Console.WriteLine($"CallGasLimit:         {gasEstimate.CallGasLimit}");
Console.WriteLine($"VerificationGasLimit: {gasEstimate.VerificationGasLimit}");
Console.WriteLine($"PreVerificationGas:   {gasEstimate.PreVerificationGas}");

userOp.CallGasLimit = gasEstimate.CallGasLimit?.Value;
userOp.VerificationGasLimit = gasEstimate.VerificationGasLimit?.Value;
userOp.PreVerificationGas = gasEstimate.PreVerificationGas?.Value;
```

The bundler runs the UserOperation through a local simulation to calculate how much gas each phase needs. Always call this before signing — the gas values are part of the signed payload.

### Step 4 — Sign the UserOperation

Use `EntryPointService` to hash and sign the UserOperation with your EOA key. This produces a `PackedUserOperation` ready for submission:

```csharp
var web3 = new Web3(new Nethereum.Web3.Accounts.Account("0xYourPrivateKey"), "https://your-rpc-url");
var entryPointService = new EntryPointService(web3, entryPointAddress);

var key = new EthECKey("0xYourPrivateKey");
var packedUserOp = await entryPointService.SignAndInitialiseUserOperationAsync(userOp, key);
```

The `SignAndInitialiseUserOperationAsync` method fetches the current nonce from the EntryPoint, hashes the UserOperation following ERC-4337 rules, signs it, and returns a `PackedUserOperation` with the signature attached.

### Step 5 — Send to the Bundler

Convert the packed operation to RPC format and submit it. The bundler returns a UserOperation hash that you can use to track the result:

```csharp
var rpcUserOp = UserOperationConverter.ToRpcFormat(packedUserOp);
var userOpHash = await bundlerService.SendUserOperation
    .SendRequestAsync(rpcUserOp, entryPointAddress);

Console.WriteLine($"UserOperation submitted! Hash: {userOpHash}");
```

The hash is not a transaction hash — it uniquely identifies the UserOperation within the bundler. The bundler will include it in a transaction when it is ready.

## UserOperation Fields

| Field | Type | Description |
|-------|------|-------------|
| `Sender` | `string` | The smart contract wallet address that will execute the call |
| `Nonce` | `BigInteger` | Anti-replay value managed by the EntryPoint, not by your code |
| `InitCode` | `string` | Factory address + calldata to deploy the wallet on first use. Set to `0x` if already deployed |
| `CallData` | `string` | ABI-encoded call the smart account will execute (e.g., `execute(target, value, data)`) |
| `CallGasLimit` | `BigInteger` | Gas allocated for the main execution phase |
| `VerificationGasLimit` | `BigInteger` | Gas allocated for `validateUserOp` and paymaster verification |
| `PreVerificationGas` | `BigInteger` | Extra gas to compensate the bundler for calldata and overhead |
| `MaxFeePerGas` | `BigInteger` | EIP-1559 maximum fee per gas unit |
| `MaxPriorityFeePerGas` | `BigInteger` | EIP-1559 priority tip per gas unit |

## EntryPoint Versions

Nethereum supports multiple EntryPoint versions via `EntryPointAddresses`:

| Constant | Version | Address |
|----------|---------|---------|
| `EntryPointAddresses.V06` | v0.6 | Original ERC-4337 EntryPoint |
| `EntryPointAddresses.V07` | v0.7 | Updated with packed format |
| `EntryPointAddresses.V08` | v0.8 | Incremental improvements |
| `EntryPointAddresses.V09` | v0.9 | `0x433709009B8330FDa32311DF1C2AFA402eD8D009` |
| `EntryPointAddresses.Latest` | v0.9 | Alias for V09 — recommended |

Always use `EntryPointAddresses.Latest` unless you have a specific reason to target an older version. Your smart account must be compatible with the EntryPoint version you choose.

## Check the Result

After submitting, poll the bundler for the receipt. The receipt contains the actual transaction hash and whether the operation succeeded:

```csharp
// Wait briefly for the bundler to include the operation
await Task.Delay(5000);

var receipt = await bundlerService.GetUserOperationReceipt
    .SendRequestAsync(userOpHash);

if (receipt != null)
{
    Console.WriteLine($"Transaction hash: {receipt.Receipt.TransactionHash}");
    Console.WriteLine($"Block number:     {receipt.Receipt.BlockNumber}");
    Console.WriteLine($"Success:          {receipt.Success}");
}
else
{
    Console.WriteLine("UserOperation is still pending...");
}
```

A `Success` value of `true` means the smart account executed the call without reverting. If `Success` is `false`, the UserOperation was included on-chain but the inner call reverted — the gas was still consumed.

## Common Mistakes

**Nonce management** — Do not track nonces yourself. The EntryPoint contract maintains a per-sender nonce. `SignAndInitialiseUserOperationAsync` fetches it automatically. If you set a wrong nonce, the bundler will reject the operation.

**Unfunded smart account** — The smart account (or its paymaster) must have enough ETH to cover gas. If the account has no balance and no paymaster is configured, the bundler will reject the operation during simulation. Fund your smart account before sending operations.

**Wrong EntryPoint address** — Your smart account is bound to a specific EntryPoint version at deployment time. Sending a UserOperation to a different EntryPoint will fail validation. Always verify that the EntryPoint address matches the one your account was deployed with.

**Gas estimation before signing** — The gas limits are part of the signed hash. If you estimate gas after signing, the signature will be invalid. Always estimate first, then sign.

## Next Steps

- [Use AA with Contract Services](guide-smart-contracts-with-aa) — the simpler approach using `ChangeContractHandlerToAA` for any contract interaction
- [Deploy a Smart Account](guide-smart-account-deployment) — create and deploy a SimpleAccount using a factory
- [Batching and Paymasters](guide-batching-and-paymasters) — batch multiple calls in one UserOperation and sponsor gas with paymasters
