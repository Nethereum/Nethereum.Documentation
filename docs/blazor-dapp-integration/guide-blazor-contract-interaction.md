---
title: "Dynamic Contract Interaction"
sidebar_label: "Contract Interaction"
sidebar_position: 30
description: "Interact with any smart contract dynamically in Blazor without code generation"
---

# Dynamic Contract Interaction

`Nethereum.Blazor` includes a set of components that render contract function UIs dynamically from an ABI definition. You can call read functions, send transactions, and query events on any contract without code generation.

For typed, compile-time-safe contract interaction, use [code-generated services](../smart-contracts/guide-smart-contract-interaction) instead.

## Dynamic Components

| Component | Purpose |
|-----------|---------|
| `DynamicQueryFunction` | Renders a view/pure function with inputs, a Query button, and decoded results |
| `DynamicTransactionFunction` | Renders a state-changing function with inputs, gas settings, ETH value (if payable), and receipt display |
| `DynamicStructInput` | Recursively renders input fields for tuple parameters |
| `DynamicArrayInput` | Handles dynamic array parameters with add/remove controls |
| `DynamicResultOutput` | Displays decoded return values |
| `DynamicErrorDisplay` | Shows revert reasons and decoded custom errors |
| `DynamicGasSettings` | Collapsible gas configuration (limit, nonce, EIP-1559 fees) |
| `DynamicReceiptDisplay` | Shows transaction receipt after submission |

All components use the `neth-` CSS class prefix for styling.

## Setup

```bash
dotnet add package Nethereum.Blazor
```

You need a connected wallet (see [Wallet Connection](guide-blazor-wallet-connect)) to send transactions. Read-only calls work with any `Web3` instance.

## Loading an ABI

An ABI can come from multiple sources:

### From Sourcify or Etherscan

Use `Nethereum.DataServices` to fetch a verified ABI by contract address:

```csharp
using Nethereum.DataServices.Sourcify;
using Nethereum.ABI.FunctionEncoding;

var sourcifyService = new SourcifyApiService();
var abiJson = await sourcifyService.GetContractABIAsync(
    chainId: 1, contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7");

var contractAbi = new ContractABI(abiJson);
```

### From a JSON String

```csharp
using Nethereum.ABI.Model;

var abiJson = "[{\"inputs\":[],\"name\":\"name\",\"outputs\":[{\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]";
var contractAbi = ABIDeserialiser.DeserialiseContract(abiJson);
```

## Calling Read Functions

Use `DynamicQueryFunction` to call a view/pure function and display the result:

```razor
@using Nethereum.Blazor.DynamicContract
@using Nethereum.ABI.Model

<DynamicQueryFunction FunctionABI="@selectedFunction"
                      ContractAddress="@contractAddress"
                      Web3="@web3" />

@code {
    private string contractAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    private FunctionABI selectedFunction;
    private Nethereum.Web3.IWeb3 web3;
}
```

The component renders input fields matching the function's parameters, a Query button, and displays the decoded return values in `DynamicResultOutput`.

## Sending Transactions

`DynamicTransactionFunction` handles state-changing calls. It includes gas settings and, for payable functions, an ETH value input:

```razor
<DynamicTransactionFunction FunctionABI="@transferFunction"
                            ContractAddress="@contractAddress"
                            Web3="@web3" />
```

After submission, `DynamicReceiptDisplay` shows the transaction hash, status, gas used, and block number. If the transaction reverts, `DynamicErrorDisplay` decodes the revert reason or custom error using the ABI.

## Building a Contract Explorer Page

Combine the components to build a page that lets users pick any function from an ABI:

```razor
@page "/contract/{Address}"
@using Nethereum.Blazor.DynamicContract
@using Nethereum.ABI.Model
@inject IEthereumHostProvider WalletProvider

<h3>Contract: @Address</h3>

@if (contractAbi != null)
{
    <h4>Read Functions</h4>
    @foreach (var func in contractAbi.Functions.Where(f => f.Constant))
    {
        <DynamicQueryFunction FunctionABI="@func"
                              ContractAddress="@Address"
                              Web3="@web3" />
    }

    <h4>Write Functions</h4>
    @foreach (var func in contractAbi.Functions.Where(f => !f.Constant))
    {
        <DynamicTransactionFunction FunctionABI="@func"
                                    ContractAddress="@Address"
                                    Web3="@web3" />
    }
}

@code {
    [Parameter] public string Address { get; set; }

    private ContractABI contractAbi;
    private Nethereum.Web3.IWeb3 web3;

    protected override async Task OnParametersSetAsync()
    {
        web3 = await WalletProvider.GetWeb3Async();

        var abiJson = await LoadAbiForContract(Address);
        if (abiJson != null)
        {
            contractAbi = ABIDeserialiser.DeserialiseContract(abiJson);
        }
    }

    private async Task<string> LoadAbiForContract(string address)
    {
        var sourcify = new Nethereum.DataServices.Sourcify.SourcifyApiService();
        return await sourcify.GetContractABIAsync(
            chainId: 1, contractAddress: address);
    }
}
```

## Event Querying

To query contract events, use `Nethereum.Contracts` event filters through the connected Web3 instance:

```csharp
var web3 = await WalletProvider.GetWeb3Async();
var transferEvent = web3.Eth.GetEvent<TransferEventDTO>(contractAddress);

var filter = transferEvent.CreateFilterInput(
    fromBlock: new Nethereum.RPC.Eth.DTOs.BlockParameter(19000000),
    toBlock: Nethereum.RPC.Eth.DTOs.BlockParameter.CreateLatest());

var logs = await transferEvent.GetAllChangesAsync(filter);
```

For dynamic (non-typed) event querying, use the ABI event definition with `EventABI.DecodeAllEventsForEvent`.

## Styling

All dynamic components use CSS classes prefixed with `neth-`. Override them in your app's stylesheet:

```css
.neth-query-function { margin-bottom: 1rem; }
.neth-transaction-function { margin-bottom: 1rem; }
.neth-result-output { background: #f5f5f5; padding: 0.5rem; }
.neth-error-display { color: red; }
```

## Next Steps

- [Wallet Connection](guide-blazor-wallet-connect) -- connect a wallet before interacting with contracts
- [Smart Contract Interaction](../smart-contracts/guide-smart-contract-interaction) -- typed, code-generated contract services
- [Nethereum.Blazor](nethereum-blazor) -- full package API reference
