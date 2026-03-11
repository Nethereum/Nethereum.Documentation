---
title: Query Account Balances
sidebar_label: "Query Balance"
sidebar_position: 1
description: Check Ether, ERC20 token, and ERC721 NFT balances for any Ethereum account
---

# Query Account Balances

The most common first step in any Ethereum application is checking how much ETH or tokens an address holds. Whether you're building a portfolio tracker, verifying a payment was received, or displaying wallet balances in a UI — it starts here.

:::tip The Simple Way
All balance queries are **read-only** — no gas, signing, or fees needed.

```csharp
var web3 = new Web3("https://mainnet.infura.io/v3/YOUR-PROJECT-ID");

// ETH balance
var balance = await web3.Eth.GetBalance.SendRequestAsync("0xAddress");
var ether = Web3.Convert.FromWei(balance.Value);

// ERC-20 token balance
var tokenBalance = await web3.Eth.ERC20.GetContractService("0xTokenContract")
    .BalanceOfQueryAsync("0xOwner");

// ERC-721 NFT count
var nftCount = await web3.Eth.ERC721.GetContractService("0xNftContract")
    .BalanceOfQueryAsync("0xOwner");
```
:::

```bash
dotnet add package Nethereum.Web3
```

## Connect to Ethereum

To connect to Ethereum mainnet, create an instance of `Web3` with an RPC endpoint URL. You can get a free endpoint from [Infura](https://infura.io) or [Alchemy](https://www.alchemy.com/), or find public endpoints at [chainlist.org](https://chainlist.org).

```csharp
using Nethereum.Web3;

var web3 = new Web3("https://mainnet.infura.io/v3/YOUR-PROJECT-ID");
```

## Query Ether Balance

Use `web3.Eth.GetBalance` to check the balance of any Ethereum address:

```csharp
var balance = await web3.Eth.GetBalance.SendRequestAsync(
    "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae");
Console.WriteLine("Balance in Wei: " + balance.Value);
```

The returned value is in Wei (the smallest Ethereum unit — see [Unit Conversion](guide-unit-conversion)). To make it more human-friendly, convert to Ether using `Web3.Convert.FromWei`:

```csharp
var balanceInEther = Web3.Convert.FromWei(balance.Value);
Console.WriteLine("Balance in Ether: " + balanceInEther);
```

You can also convert back to Wei using `Web3.Convert.ToWei`:

```csharp
var backToWei = Web3.Convert.ToWei(balanceInEther);
```

See [Unit Conversion](guide-unit-conversion) for all denomination conversions including Gwei and custom decimal places.

## Query Balance at a Specific Block

Pass a `BlockParameter` to query a historical balance:

```csharp
using Nethereum.RPC.Eth.DTOs;

var balance = await web3.Eth.GetBalance.SendRequestAsync(
    "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
    new BlockParameter(18000000));
Console.WriteLine("Historical balance: " + Web3.Convert.FromWei(balance.Value) + " Ether");
```

This requires an archive node (archive nodes store full historical state; most public nodes only keep recent state). Standard nodes only serve the latest state.

## Query ERC20 Token Balance

Use the built-in `web3.Eth.ERC20` preset service. No ABI is needed — Nethereum includes the standard ERC20 interface:

```csharp
// Query the Maker (MKR) token contract on mainnet
// Contract: https://etherscan.io/address/0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2
var tokenService = web3.Eth.ERC20.GetContractService(
    "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2");

// Check the balance of an account
// Holder: https://etherscan.io/tokenholdings?a=0x8ee7d9235e01e6b42345120b5d270bdb763624c7
var balance = await tokenService.BalanceOfQueryAsync(
    "0x8ee7d9235e01e6b42345120b5d270bdb763624c7");

// Convert from the token's lowest unit using its decimal places (18 for MKR)
Console.WriteLine(Web3.Convert.FromWei(balance, 18));
```

The second parameter of `Web3.Convert.FromWei` is the token's decimal places. Most tokens use 18, but some differ — USDC and USDT use 6 decimals (see `QueryBalanceDocExampleTests:ShouldConvertErc20BalanceWith6Decimals`).

### Query Token Name, Symbol, and Decimals

```csharp
var tokenService = web3.Eth.ERC20.GetContractService(
    "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2");

var name = await tokenService.NameQueryAsync();
var symbol = await tokenService.SymbolQueryAsync();
var decimals = await tokenService.DecimalsQueryAsync();
var totalSupply = await tokenService.TotalSupplyQueryAsync();

Console.WriteLine($"{name} ({symbol}) - {decimals} decimals, total supply: {totalSupply}");
```

## Query ERC721 (NFT) Balance and Ownership

Use the built-in `web3.Eth.ERC721` preset service. The [ERC721 standard](https://eips.ethereum.org/EIPS/eip-721) defines non-fungible tokens.

This example uses the [PatchworkKingdoms (PWKD)](https://www.patchwork-kingdoms.com/) charity NFT, deployed at [0xd24a7c412f2279b1901e591898c1e96c140be8c5](https://etherscan.io/address/0xd24a7c412f2279b1901e591898c1e96c140be8c5):

```csharp
var nftService = web3.Eth.ERC721.GetContractService(
    "0xd24a7c412f2279b1901e591898c1e96c140be8c5");

// Get the count of tokens an account holds
// Check on Etherscan: https://etherscan.io/token/0xd24a7c412f2279b1901e591898c1e96c140be8c5?a=0xcbf94fcb7ceaf7b61f20560eed8e0dbc4e407f5c
var balance = await nftService.BalanceOfQueryAsync(
    "0xCbf94Fcb7CeaF7b61F20560eED8e0DBC4E407F5C");
Console.WriteLine($"NFT count: {balance}");

// Find who owns a specific token ID
var tokenOwner = await nftService.OwnerOfQueryAsync(737);
Console.WriteLine($"Token 737 owner: {tokenOwner}");
```

## Advanced: Find All Owned NFTs via Transfer Logs

Some contracts don't support the `IEnumerable` standard, so you can't query owned token IDs directly. Instead, retrieve ownership by processing all Transfer events from the contract's deployment block:

```csharp
using System.Threading;
using System.Linq;

var tokensOwned = await web3.Processing.Logs.ERC721
    .GetErc721OwnedByAccountUsingAllTransfersForContract(
        "0xd24a7c412f2279b1901e591898c1e96c140be8c5",
        "0xCbf94Fcb7CeaF7b61F20560eED8e0DBC4E407F5C",
        13991659,  // start block number
        null,
        new CancellationToken());

Console.WriteLine("All tokens owned:");
var tokenIds = tokensOwned.Select(x => (int)x.TokenId).ToArray();
foreach (var tokenId in tokenIds)
{
    Console.WriteLine(tokenId);
}
```

:::note
Scanning all transfer events from the deployment block can be slow on contracts with many transfers. Use a narrow block range or a cached indexer for production use.
:::

## Next Steps

- [Unit Conversion](guide-unit-conversion) — convert between Wei, Ether, and Gwei
- [Transfer Ether](guide-send-eth) — send ETH to an address
- [Query Blocks](guide-query-blocks) — get blocks, transactions, and receipts
