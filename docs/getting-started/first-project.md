---
title: Your First Project
sidebar_label: Your First Project
sidebar_position: 3
description: Build your first Ethereum project with Nethereum in 5 minutes
---

# Your First Project

In this guide you'll create a console application that connects to Ethereum, reads a balance, and transfers ETH.

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download) or later
- An Ethereum RPC endpoint (we'll use a public one, or you can [run a local DevChain](/docs/devchain/devchain-quickstart))

## Create the Project

```bash
dotnet new console -n MyFirstDapp
cd MyFirstDapp
dotnet add package Nethereum.Web3
```

## Read a Balance

Replace `Program.cs` with:

```csharp
using Nethereum.Web3;

// Connect to Ethereum (replace with your RPC URL)
var web3 = new Web3("https://mainnet.infura.io/v3/YOUR_API_KEY");

// Query the Ethereum Foundation's balance
var address = "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae";
var balance = await web3.Eth.GetBalance.SendRequestAsync(address);

// Convert from Wei to ETH
var etherAmount = Web3.Convert.FromWei(balance.Value);
Console.WriteLine($"Address: {address}");
Console.WriteLine($"Balance: {etherAmount} ETH");
```

Run it:

```bash
dotnet run
```

You should see something like:

```
Address: 0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae
Balance: 499.32 ETH
```

## Transfer ETH

To send transactions, you need an account with a private key:

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

// Create an account from a private key
var account = new Account("YOUR_PRIVATE_KEY");
var web3 = new Web3(account, "https://mainnet.infura.io/v3/YOUR_API_KEY");

// Transfer 0.01 ETH
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync("0xRecipientAddress", 0.01m);

Console.WriteLine($"Transaction: {receipt.TransactionHash}");
Console.WriteLine($"Block: {receipt.BlockNumber}");
Console.WriteLine($"Gas used: {receipt.GasUsed}");
```

:::warning
Never hardcode private keys in production. Use keystores, HD wallets, hardware wallets, or cloud KMS. See [Signing & Key Management](/docs/signing-and-key-management/overview).
:::

## Interact with a Smart Contract

Nethereum includes built-in typed services for standard contracts, and you can [generate C# services](/docs/smart-contracts/code-generation) from any Solidity ABI for full typed access.

Query ERC-20 token info using the built-in services:

```csharp
// Query ERC-20 token info using built-in services
var erc20Service = web3.Eth.ERC20.GetContractService(contractAddress);
var name = await erc20Service.NameQueryAsync();
var symbol = await erc20Service.SymbolQueryAsync();
var decimals = await erc20Service.DecimalsQueryAsync();
var balance = await erc20Service.BalanceOfQueryAsync(myAddress);

Console.WriteLine($"{name} ({symbol}): {Web3.Convert.FromWei(balance, decimals)}");
```

## Use a Local DevChain (No External Node)

Instead of connecting to mainnet, you can run an in-process Ethereum node:

```bash
dotnet add package Nethereum.DevChain
```

```csharp
using Nethereum.DevChain;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

// Create an account and a local dev chain
var account = new Account("0xb5b1870957d373ef0eeffecc6e4812c0fd08f554b37b233526acc331bf1544f7");
var devChain = new DevChainNode();
await devChain.StartAsync(account);

// Connect using the in-process client (signs transactions locally)
var web3 = devChain.CreateWeb3(account);

// Account is pre-funded with 10,000 ETH
var balance = await web3.Eth.GetBalance.SendRequestAsync(account.Address);
Console.WriteLine($"Dev account balance: {Web3.Convert.FromWei(balance.Value)} ETH");
```

## Next Steps

- [Core Foundation](/docs/core-foundation/overview) — understand the fundamentals
- [Deploy a Contract](/docs/smart-contracts/deploy-a-contract) — deploy and interact with contracts
- [Code Generation](/docs/smart-contracts/code-generation) — generate typed C# services from Solidity
- [DevChain](/docs/devchain/devchain-quickstart) — local development without external nodes
- [Component Catalog](/docs/component-catalog) — find the right package for your use case
