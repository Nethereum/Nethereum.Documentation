---
title: Error Handling & Custom Reverts
sidebar_label: "Error Handling"
sidebar_position: 8
description: Handle smart contract reverts and decode custom error types with Nethereum
---

# Error Handling & Custom Reverts

Since Solidity 0.8.4, contracts can revert with custom error types instead of plain strings. Nethereum catches these reverts as `SmartContractCustomErrorRevertException` and provides typed decoding so you can handle each error case in your C# code.

```bash
dotnet add package Nethereum.Web3
```

## Define Custom Error DTOs

Map Solidity custom errors to C# classes using `[Error]` and `[Parameter]` attributes, just like function or event DTOs.

```csharp
using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;

// Solidity: error InsufficientBalance(address account, uint256 balance, uint256 required)
[Error("InsufficientBalance")]
public class InsufficientBalanceError
{
    [Parameter("address", "account", 1)]
    public string Account { get; set; }

    [Parameter("uint256", "balance", 2)]
    public BigInteger Balance { get; set; }

    [Parameter("uint256", "required", 3)]
    public BigInteger Required { get; set; }
}

// Solidity: error Unauthorized(address caller)
[Error("Unauthorized")]
public class UnauthorizedError
{
    [Parameter("address", "caller", 1)]
    public string Caller { get; set; }
}
```

## Catch and Decode a Specific Error

When a contract call reverts with a custom error, Nethereum throws a `SmartContractCustomErrorRevertException`. Use `IsCustomErrorFor<T>()` to check the type and `DecodeError<T>()` to decode the data.

```csharp
using Nethereum.Contracts;

try
{
    var receipt = await contractHandler
        .SendRequestAndWaitForReceiptAsync(transferFunction);
}
catch (SmartContractCustomErrorRevertException ex)
{
    if (ex.IsCustomErrorFor<InsufficientBalanceError>())
    {
        var error = ex.DecodeError<InsufficientBalanceError>();
        Console.WriteLine(
            $"Insufficient balance: account {error.Account} has {error.Balance} but needs {error.Required}");
    }
    else if (ex.IsCustomErrorFor<UnauthorizedError>())
    {
        var error = ex.DecodeError<UnauthorizedError>();
        Console.WriteLine($"Unauthorized caller: {error.Caller}");
    }
    else
    {
        Console.WriteLine($"Unknown contract error: {ex.ExceptionEncodedData}");
    }
}
```

## Automatic Error Decoding with ContractServiceBase

Code-generated contract services (from `ContractServiceBase`) register all their error types. Use `HandleCustomErrorException()` to automatically find and decode the matching error.

```csharp
try
{
    var receipt = await myContractService.TransferRequestAndWaitForReceiptAsync(input);
}
catch (SmartContractCustomErrorRevertException ex)
{
    var typedException = myContractService.FindCustomErrorException(ex);
    if (typedException != null)
    {
        Console.WriteLine($"Error: {typedException.DecodedError}");
        Console.WriteLine($"Error ABI: {typedException.ErrorABI.Name}");
    }
}
```

The `FindCustomErrorException()` method returns a `SmartContractCustomErrorRevertExceptionErrorDecoded` with:
- `DecodedError` -- human-readable decoded error string
- `ErrorABI` -- the `ErrorABI` metadata (name, parameters)
- `ExceptionEncodedData` -- raw hex-encoded revert data

## Typed Exception Factory

For scenarios where you have a list of possible error types, use the factory to create a strongly-typed exception:

```csharp
using Nethereum.Contracts;

var errorTypes = new[] { typeof(InsufficientBalanceError), typeof(UnauthorizedError) };

try
{
    await contractHandler.SendRequestAndWaitForReceiptAsync(function);
}
catch (SmartContractCustomErrorRevertException ex)
{
    var typedException = SmartContractCustomErrorTypedFactory
        .CreateTypedException(ex, errorTypes);

    if (typedException is SmartContractCustomErrorRevertException<InsufficientBalanceError> balanceEx)
    {
        var error = balanceEx.CustomError;
        Console.WriteLine($"Need {error.Required}, have {error.Balance}");
    }
}
```

## Get Error Reason from a Failed Transaction

If a transaction has already been mined and failed, retrieve the error reason from the transaction hash:

```csharp
var errorReason = await web3.Eth.GetContractTransactionErrorReason
    .SendRequestAsync(failedTransactionHash);

Console.WriteLine($"Transaction failed: {errorReason}");
```

This replays the failed transaction at the block it was mined to extract the revert reason string. It handles both legacy and EIP-1559 transactions.

## Decode Error from Raw Hex Data

If you have raw encoded error data (e.g., from a trace or simulation), decode it directly:

```csharp
var errorData = "0x08c379a00000000000000000000000000000000000000000000000000000000000000020...";

var exception = new SmartContractCustomErrorRevertException(errorData);

if (exception.IsCustomErrorFor<InsufficientBalanceError>())
{
    var error = exception.DecodeError<InsufficientBalanceError>();
}
```

## Key Types

- `SmartContractCustomErrorRevertException` -- base exception with `ExceptionEncodedData` and typed decode methods
- `SmartContractCustomErrorRevertException<TError>` -- generic typed exception with `CustomError` property
- `SmartContractCustomErrorRevertExceptionErrorDecoded` -- decoded exception with `DecodedError` string and `ErrorABI`
- `SmartContractCustomErrorTypedFactory` -- factory for creating typed exceptions from a list of error types
- `ContractServiceBase.HandleCustomErrorException()` / `FindCustomErrorException()` -- auto-decode using registered error types
- `web3.Eth.GetContractTransactionErrorReason` -- retrieve error reason from a mined failed transaction

## Common Patterns

| Task | Method |
|------|--------|
| Check error type | `exception.IsCustomErrorFor<TError>()` |
| Decode to typed object | `exception.DecodeError<TError>()` |
| Decode to default (ParameterOutput list) | `exception.DecodeErrorToDefault(errorABI)` |
| Auto-decode from contract service | `contractService.FindCustomErrorException(ex)` |
| Factory decode from type list | `SmartContractCustomErrorTypedFactory.CreateTypedException(ex, types)` |
| Get error from failed tx hash | `web3.Eth.GetContractTransactionErrorReason.SendRequestAsync(hash)` |
## Next Steps

- [Events & Logs](./guide-events.md) -- decode event data from transaction receipts
- [Deploy a Contract](./deploy-a-contract.md) -- handle deployment errors
- [Built-in Contract Standards](./guide-built-in-standards.md) -- typed services with built-in error handling
