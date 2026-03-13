---
title: "Sending Transactions"
sidebar_label: "Transactions"
sidebar_position: 25
description: "Build, preview, and send transactions from the wallet with EVM state simulation"
---

# Sending Transactions

The Wallet SDK provides a multi-step transaction flow: select account and chain, build the transaction input, optionally preview state changes via the EVM simulator, then sign and broadcast.

## Transaction Architecture

The transaction flow uses two cooperating ViewModels:

- `SendNativeTokenViewModel` -- manages token/chain/account selection, amount input, and the overall wizard steps.
- `TransactionViewModel` -- handles gas configuration, fee estimation, signing, and broadcast.

Both are registered automatically by `AddNethereumWalletUI()`.

## Sending ETH

Using the wallet host provider directly (no UI):

```csharp
@inject NethereumWalletHostProvider WalletHost

@code {
    private async Task SendEther()
    {
        var web3 = await WalletHost.GetWeb3Async();

        var txInput = new TransactionInput
        {
            To = "0xRecipientAddress",
            Value = new HexBigInteger(Web3.Convert.ToWei(0.1m)),
            From = WalletHost.SelectedAccount
        };

        var txHash = await web3.Eth.TransactionManager
            .SendTransactionAsync(txInput);
    }
}
```

The `TransactionManager` handles nonce assignment, gas estimation, and signing using whichever `IAccount` the selected wallet account provides.

## Sending ERC-20 Tokens

Use the typed contract services from `Nethereum.Contracts.Standards`:

```csharp
var web3 = await WalletHost.GetWeb3Async();

var tokenAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC
var erc20 = new ERC20ContractService(web3.Eth, tokenAddress);

var txHash = await erc20.TransferRequestAndWaitForReceiptAsync(
    to: "0xRecipientAddress",
    tokenAmount: BigInteger.Parse("1000000")); // 1 USDC (6 decimals)
```

## Gas Estimation and Fee Strategies

The `TransactionViewModel` exposes gas configuration properties. For EIP-1559 chains:

```csharp
var feeStrategy = new MedianPriorityFeeHistorySuggestionStrategy(web3.Eth);
var fee = await feeStrategy.SuggestFeeAsync();

var txInput = new TransactionInput
{
    To = recipientAddress,
    Value = new HexBigInteger(Web3.Convert.ToWei(amount)),
    From = senderAddress,
    MaxFeePerGas = new HexBigInteger(fee.MaxFeePerGas),
    MaxPriorityFeePerGas = new HexBigInteger(fee.MaxPriorityFeePerGas),
};

var gasEstimate = await web3.Eth.TransactionManager
    .EstimateGasAsync(txInput);
txInput.Gas = gasEstimate;
```

For legacy chains, set `GasPrice` instead:

```csharp
var gasPrice = await web3.Eth.GasPrice.SendRequestAsync();
txInput.GasPrice = gasPrice;
```

## EVM State Preview

Before signing, you can simulate the transaction locally to preview state changes (balance deltas, storage writes, event logs). This uses the [EVM Simulator](../evm-simulator/guide-transaction-simulation):

```csharp
using Nethereum.EVM;
using Nethereum.EVM.BlockchainState;

var nodeDataService = new RpcNodeDataService(web3.Eth, BlockParameter.CreateLatest());
var stateService = new ExecutionStateService(nodeDataService);

var simulator = new TransactionExecutor(stateService);
var result = await simulator.ExecuteTransactionAsync(
    txInput.From,
    txInput.To,
    txInput.Value?.Value ?? 0,
    txInput.Data?.HexToByteArray());

foreach (var transfer in result.Transfers)
{
    Console.WriteLine($"{transfer.From} -> {transfer.To}: {transfer.Value} wei");
}
```

This is useful for showing "you will send X ETH and receive Y tokens" previews in a wallet UI before the user confirms.

## Signing with Different Account Types

The wallet abstracts signing behind `IWalletAccount.GetAccountAsync()`. Each account type returns the appropriate `IAccount`:

```csharp
var walletAccount = vault.Accounts.First(a => a.IsSelected);
var account = await walletAccount.GetAccountAsync();
var web3 = new Web3(account, rpcClient);

// TransactionManager uses the IAccount's signer automatically
var hash = await web3.Eth.TransactionManager.SendTransactionAsync(txInput);
```

- **Mnemonic/PrivateKey** accounts return an in-memory `Account` with the private key.
- **Hardware** accounts return an account backed by USB device signing.
- **View-Only** accounts throw on `GetAccountAsync()` -- they cannot sign.

## Monitoring Transaction Status

Track pending transactions via `IPendingTransactionService`:

```csharp
@inject IPendingTransactionService PendingTxService

@code {
    private async Task MonitorTransaction(string txHash)
    {
        PendingTxService.AddPendingTransaction(txHash, chainId);

        var receipt = await web3.Eth.Transactions.GetTransactionReceipt
            .SendRequestAsync(txHash);

        if (receipt.Succeeded())
        {
            Console.WriteLine($"Confirmed in block {receipt.BlockNumber}");
        }
    }
}
```

The built-in `PendingTransactionNotificationService` (registered by `AddNethereumWalletUI()`) automatically polls and surfaces notifications through the MudBlazor snackbar.

## Token Display

The wallet tracks token holdings through `ITokenManagementService`. Tokens are discovered automatically when the wallet detects ERC-20 transfer events, or added manually:

```csharp
@inject ITokenManagementService TokenService

@code {
    var tokens = await TokenService.GetTokensForAccountAsync(address, chainId);

    foreach (var token in tokens)
    {
        Console.WriteLine($"{token.Symbol}: {token.Balance}");
    }
}
```

## Next Steps

- [EVM Simulator: Transaction Simulation](../evm-simulator/guide-transaction-simulation) -- deeper coverage of state simulation and trace analysis
- [Account Management](guide-wallet-accounts) -- vault encryption and account derivation details
