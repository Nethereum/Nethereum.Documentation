---
title: "Gnosis Safe: Multi-Sig Transactions"
sidebar_label: "Gnosis Safe"
sidebar_position: 4
description: Build, sign, and execute multi-signature transactions through Gnosis Safe with Nethereum
---

# Gnosis Safe: Multi-Sig Transactions

:::tip The Simple Way
```csharp
var safeAccount = new SafeAccount(safeAddress, chainId, privateKey);
var web3 = new Web3(safeAccount, rpcUrl);
// Any contract service now executes through the Safe automatically
var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(to, amount);
```
Use `SafeAccount` to route all contract calls through a Safe — no manual transaction wrapping needed.
:::

Gnosis Safe (now "Safe") is the most widely used multi-signature wallet on Ethereum. It requires M-of-N owner signatures before executing any transaction, making it essential for DAO treasuries, team wallets, and high-value operations. Nethereum provides a complete integration — from manually building Safe transactions with EIP-712 signatures, to a transparent `SafeAccount` that makes any contract service execute through a Safe automatically.

```bash
dotnet add package Nethereum.GnosisSafe
```

## The SafeAccount Approach (Recommended)

The simplest way to use Safe is through `SafeAccount`. It wraps a standard account and automatically routes all contract interactions through the Safe's `execTransaction` function:

```csharp
using Nethereum.Web3;
using Nethereum.GnosisSafe;

var privateKey = "0xYOUR_PRIVATE_KEY";
var safeAddress = "0xYOUR_SAFE_ADDRESS";
var chainId = 1;

var safeAccount = new SafeAccount(safeAddress, chainId, privateKey);
var web3 = new Web3(safeAccount, "https://mainnet.infura.io/v3/YOUR_KEY");
```

Now any contract service created from this `web3` instance will automatically execute through the Safe. For example, an ERC-20 transfer:

```csharp
var erc20Service = new Nethereum.Contracts.Standards.ERC20.ERC20ContractService(
    web3.Eth, erc20Address);

// This transfer executes through the Safe — signed by the SafeAccount's key
var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(
    recipientAddress, 1000000);
```

Behind the scenes, `SafeAccount` implements `IContractServiceConfigurableAccount`, which swaps the default contract handler with `SafeExecTransactionContractHandler`. The call data gets packed into a Safe transaction, signed with EIP-712, and submitted via `execTransaction`.

## Manual Contract Handler Swap

If you already have a contract service and want to switch it to Safe execution without creating a new `Web3` instance, use the extension method:

```csharp
using Nethereum.GnosisSafe;
using Nethereum.Contracts.Standards.ERC20;

var web3 = new Web3(new Account(privateKey), rpcUrl);
var erc20Service = new ERC20ContractService(web3.Eth, contractAddress);

// Switch this service to execute through Safe
erc20Service.ChangeContractHandlerToSafeExecTransaction(safeAddress, privateKey);

// All future calls on this service go through the Safe
var receipt = await erc20Service.TransferRequestAndWaitForReceiptAsync(to, amount);
```

This is useful when you need some services to go through the Safe and others to execute directly. Only the services you explicitly switch will use Safe execution.

## Build a Safe Transaction Manually

For full control over the Safe transaction parameters — or when you need to collect signatures from multiple owners — build the transaction manually:

```csharp
using Nethereum.GnosisSafe;
using Nethereum.GnosisSafe.ContractDefinition;

var web3 = new Web3(rpcUrl);
var safeService = new GnosisSafeService(web3, safeAddress);

// Define the transaction
var transactionData = new EncodeTransactionDataFunction
{
    To = targetContractAddress,
    Value = 0,
    Data = encodedFunctionCallData,  // ABI-encoded call data
    Operation = 0,                    // 0 = Call, 1 = DelegateCall
    SafeTxGas = 0,
    BaseGas = 0,
    SafeGasPrice = 0,
    GasToken = AddressUtil.ZERO_ADDRESS,
    RefundReceiver = AddressUtil.ZERO_ADDRESS
};

// Sign with multiple owners
var privateKey1 = "0xOWNER_1_KEY";
var privateKey2 = "0xOWNER_2_KEY";

var execTx = await safeService.BuildTransactionAsync(
    transactionData, chainId, false, privateKey1, privateKey2);

// Execute
var receipt = await safeService.ExecTransactionRequestAndWaitForReceiptAsync(execTx);
```

The `BuildTransactionAsync` method fetches the current Safe nonce, creates the EIP-712 typed data hash, signs it with each provided key, orders the signatures by signer address (required by Safe), and returns a ready-to-submit `ExecTransactionFunction`.

## Multi-Signature Workflow

In real-world scenarios, owners rarely have all private keys in the same place. The typical workflow is:

1. **Build the transaction** and compute its hash
2. **Each owner signs independently** using EIP-712
3. **Collect all signatures**, order them, and submit

### Compute the Safe Transaction Hash

```csharp
var transactionData = new EncodeTransactionDataFunction
{
    To = targetAddress,
    Value = 0,
    Data = callData,
    Operation = 0,
    SafeTxGas = 0,
    BaseGas = 0,
    SafeGasPrice = 0,
    GasToken = AddressUtil.ZERO_ADDRESS,
    RefundReceiver = AddressUtil.ZERO_ADDRESS,
    SafeNonce = await safeService.NonceQueryAsync()
};

var safeHashes = GnosisSafeService.GetSafeHashes(transactionData, chainId, safeAddress);
Console.WriteLine($"Domain Hash: {safeHashes.SafeDomainHash.ToHex()}");
Console.WriteLine($"Message Hash: {safeHashes.SafeMessageHash.ToHex()}");
Console.WriteLine($"Transaction Hash: {safeHashes.SafeTxnHash.ToHex()}");
```

Share the transaction hash with each owner. They can verify the transaction details match what they expect before signing.

### Each Owner Signs

```csharp
var signature = await safeService.SignEncodedTransactionDataAsync(
    transactionData, chainId, convertToSafeVFormat: true);

// Share this signature string with the transaction coordinator
Console.WriteLine($"My signature: {signature}");
```

Safe signatures have a custom V value format — standard Ethereum uses V=27/28, Safe uses V=31/32 (offset by +4). The `convertToSafeVFormat: true` parameter handles this automatically.

### Combine and Execute

```csharp
var signatures = new List<SafeSignature>
{
    new SafeSignature { Address = owner1Address, Signature = signature1 },
    new SafeSignature { Address = owner2Address, Signature = signature2 }
};

var combinedSignatures = safeService.GetCombinedSignaturesInOrder(signatures);
```

Safe requires signatures ordered by signer address (ascending). The `GetCombinedSignaturesInOrder` method handles sorting and concatenation.

## MultiSend: Batch Multiple Actions

MultiSend lets you execute multiple different contract calls in a single Safe transaction. This is useful for batch operations like "approve token + swap" or "transfer to multiple recipients":

```csharp
using Nethereum.Contracts.TransactionHandlers.MultiSend;

var multiSendInputs = new List<IMultiSendInput>
{
    new MultiSendInput
    {
        Operation = MultiSendOperationType.Call,
        To = erc20Address,
        Value = 0,
        Data = approveCallData
    },
    new MultiSendInput
    {
        Operation = MultiSendOperationType.Call,
        To = routerAddress,
        Value = 0,
        Data = swapCallData
    }
};

var transactionData = new EncodeTransactionDataFunction
{
    To = multiSendContractAddress,
    Value = 0,
    SafeTxGas = 0,
    BaseGas = 0,
    SafeGasPrice = 0,
    GasToken = AddressUtil.ZERO_ADDRESS,
    RefundReceiver = AddressUtil.ZERO_ADDRESS
};

var execTx = await safeService.BuildMultiSendTransactionAsync(
    transactionData, chainId, privateKey, false, multiSendInputs.ToArray());

var receipt = await safeService.ExecTransactionRequestAndWaitForReceiptAsync(execTx);
```

MultiSend uses DelegateCall (operation type 1) internally — the `BuildMultiSendTransactionAsync` sets this automatically.

## Query Safe Configuration

```csharp
var safeService = new GnosisSafeService(web3, safeAddress);

var owners = await safeService.GetOwnersQueryAsync();
var threshold = await safeService.GetThresholdQueryAsync();
var nonce = await safeService.NonceQueryAsync();
var version = await safeService.VersionQueryAsync();

Console.WriteLine($"Safe v{version}: {owners.Count} owners, threshold {threshold}, nonce {nonce}");

// Check if an address is an owner
var isOwner = await safeService.IsOwnerQueryAsync(someAddress);
```

## Gas Parameters

Safe transactions have their own gas configuration, separate from the Ethereum transaction gas:

| Parameter | Purpose |
|-----------|---------|
| `SafeTxGas` | Gas for the internal Safe transaction. Set 0 to let the Safe estimate. |
| `BaseGas` | Gas overhead independent of execution. Usually 0. |
| `SafeGasPrice` | Gas price for refund calculation. Set 0 for no refund. |
| `GasToken` | Token to pay gas refunds in. `address(0)` = ETH. |
| `RefundReceiver` | Address receiving the gas refund. `address(0)` = tx.origin. |

For most use cases, setting all gas parameters to 0 is correct — the Safe uses Ethereum's standard gas mechanism.

## Next Steps

- [x402 Payments](guide-x402-payments) -- accept crypto payments in your API
- [Circles UBI](guide-circles) -- interact with the Circles protocol through Safe wallets
- [Nethereum.GnosisSafe Package Reference](../protocols/nethereum-gnosissafe) -- full API including module management, guards, and fallback handlers
