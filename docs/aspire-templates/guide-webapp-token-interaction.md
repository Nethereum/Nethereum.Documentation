---
title: Token Interaction UI
sidebar_label: Token Interaction UI
sidebar_position: 12
description: Build a Blazor page that deploys, mints, transfers, and queries ERC-20 tokens through a browser wallet.
---

# Token Interaction UI

The dApp template's WebApp includes a Token Interaction page that demonstrates the full ERC-20 lifecycle through a browser wallet. This guide walks through how the page is built, so you can adapt it for your own contracts.

After [connecting a wallet](guide-wallet-integration) and switching to the DevChain, the page provides four operations: deploy, mint, transfer, and balance check.

## Page Structure

The page at `WebApp/Components/Pages/TokenInteraction.razor` is wrapped in Blazor's `<AuthorizeView>` — the wallet must be connected before any UI appears. Inside that, the [chain validation](guide-wallet-integration) check determines whether to show the "wrong chain" warning or the interaction UI.

## Deploy a Token

The deploy section lets users create a new ERC-20 token with custom name, symbol, and initial supply:

```csharp
var web3 = await _ethereumHostProvider.GetWeb3Async();
var deployment = new MyTokenDeployment
{
    Name = tokenName,
    Symbol = tokenSymbol,
    InitialSupply = Web3.Convert.ToWei(initialSupplyEth)
};
var receipt = await MyTokenService.DeployContractAndWaitForReceiptAsync(web3, deployment);
contractAddress = receipt.ContractAddress;
tokenService = new MyTokenService(web3, contractAddress);
```

The `GetWeb3Async()` call returns a Web3 instance connected through the browser wallet — all transactions are signed by MetaMask. `Web3.Convert.ToWei` converts the user-friendly decimal amount to wei (the smallest unit, 18 decimal places for ERC-20s).

After deployment, the page stores the `contractAddress` and creates a `MyTokenService` bound to it for subsequent operations.

## Query Token Info

Once deployed, the page can query the token's metadata:

```csharp
var name = await tokenService.NameQueryAsync();
var symbol = await tokenService.SymbolQueryAsync();
var decimals = await tokenService.DecimalsQueryAsync();
var totalSupply = await tokenService.TotalSupplyQueryAsync();
```

These are read-only calls — no gas, no wallet prompt. The results display in a clean info list showing name, symbol, decimals, and total supply (converted from wei with `Web3.Convert.FromWei`).

## Mint Tokens

The mint section sends new tokens to a specified address:

```csharp
var amount = Web3.Convert.ToWei(mintAmountEth);
var receipt = await tokenService.MintRequestAndWaitForReceiptAsync(mintTo, amount);
```

This triggers a MetaMask transaction popup. The user confirms, the transaction is mined by the DevChain (auto-mine is on), and the receipt is returned. The page then refreshes the token info to show the updated total supply.

## Transfer Tokens

Transfer works the same way — specify a recipient and amount:

```csharp
var amount = Web3.Convert.ToWei(transferAmountEth);
var receipt = await tokenService.TransferRequestAndWaitForReceiptAsync(transferTo, amount);
```

Again, MetaMask prompts for confirmation. The transfer is a standard ERC-20 `transfer` call.

## Check Balance

The balance check is a read-only query:

```csharp
var balance = await tokenService.BalanceOfQueryAsync(balanceAddress);
```

No wallet prompt — this calls `balanceOf` on the contract and displays the result converted from wei.

## Adapting for Your Own Contracts

To add interaction with a different contract:

1. **[Write the Solidity contract](guide-solidity-contracts)** and **[generate C# services](guide-codegen)**
2. **Create a new Razor page** following the same pattern — inject `SelectedEthereumHostProviderService`, get Web3 via `GetWeb3Async()`, and use the generated service
3. **Wrap in `<AuthorizeView>`** to require wallet connection
4. **Add chain validation** if your contract is chain-specific

The key pattern is always the same: `GetWeb3Async()` gives you a wallet-connected Web3, and the generated service provides typed methods for every contract function.

## The Light Theme CSS

The WebApp uses a custom light theme (`wwwroot/app.css`) with CSS variables for consistent styling:

```css
:root {
    --bg: #f8fafc;
    --bg-card: #ffffff;
    --primary: #0d9488;
    --text: #1e293b;
    --border: #e2e8f0;
}
```

Cards, form inputs, buttons, and status messages all reference these variables. The wallet component integrates via `--wallet-*` CSS custom properties.

## Next Steps

With the WebApp interacting with contracts through MetaMask:

- **[Explorer ABI Discovery](guide-explorer-abi-discovery)** — See how deployed contracts automatically get ABI decoding in the Explorer
- **[DevChain Template](guide-devchain-template)** — If you want to customise the infrastructure layer
