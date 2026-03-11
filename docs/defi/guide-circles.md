---
title: "Circles: UBI Protocol"
sidebar_label: "Circles UBI"
sidebar_position: 6
description: Interact with the Circles Universal Basic Income protocol on Gnosis Chain using Nethereum
---

# Circles: UBI Protocol

:::tip The Simple Way
```csharp
var client = new RpcClient(new Uri("https://rpc.aboutcircles.com/"));
var getTotalBalance = new GetTotalBalanceV2(client);
string balance = await getTotalBalance.SendRequestAsync(avatarAddress);
```
Query Circles balances and transaction history through the dedicated Circles RPC endpoint — no contract ABI needed.
:::

[Circles](https://aboutcircles.com/faqs) is a decentralized Universal Basic Income protocol running on Gnosis Chain. Every registered participant ("avatar") receives 1 CRC token per hour, with balances subject to ~7% annual demurrage (time-value decay). Tokens can be transferred through trust networks — you can only send your CRC to someone who trusts you. Nethereum's `Nethereum.Circles` package provides both contract services for on-chain operations and custom RPC methods for data queries.

```bash
dotnet add package Nethereum.Circles
```

## Query Balances

The Circles RPC endpoint (`rpc.aboutcircles.com`) exposes custom methods beyond standard Ethereum RPC. The simplest way to check a balance is through the V2 RPC:

```csharp
using Nethereum.JsonRpc.Client;
using Nethereum.Circles.RPC.Requests;

var client = new RpcClient(new Uri("https://rpc.aboutcircles.com/"));

var getTotalBalanceV2 = new GetTotalBalanceV2(client);
string balance = await getTotalBalanceV2.SendRequestAsync("0xAvatarAddress");
Console.WriteLine($"Total CRC Balance: {balance}");
```

This returns the total balance across all Circles token types the avatar holds — their personal CRC plus any group currencies they've received.

## Interact with the Hub Contract

The Hub is the central Circles contract that manages avatar registration, trust relationships, and token minting. Use `HubService` for on-chain operations:

```csharp
using Nethereum.Web3;
using Nethereum.Circles.Contracts.Hub;

var web3 = new Web3("https://rpc.aboutcircles.com/");
var hubAddress = "0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8"; // Gnosis Chain V2

var hubService = new HubService(web3, hubAddress);

// Check if an address is registered as a human avatar
bool isHuman = await hubService.IsHumanQueryAsync("0xSomeAddress");

// Check trust between two addresses
bool isTrusted = await hubService.IsTrustedQueryAsync("0xTruster", "0xTrustee");

// Calculate pending CRC issuance for a human avatar
var issuance = await hubService.CalculateIssuanceQueryAsync("0xHumanAddress");
```

The `IsHumanQueryAsync` and `IsTrustedQueryAsync` calls are read-only — no gas needed. `CalculateIssuanceQueryAsync` returns how much CRC has accumulated since the avatar's last mint.

## Mint Personal CRC

Minting claims the CRC that has accumulated since your last mint. Circles avatars typically use a Gnosis Safe wallet, so minting goes through Safe execution:

```csharp
using Nethereum.Web3.Accounts;
using Nethereum.GnosisSafe;
using Nethereum.Circles.Contracts.Hub;

var privateKey = "0xYOUR_PRIVATE_KEY";
var safeAddress = "0xYOUR_SAFE_ADDRESS";

var web3 = new Web3(new Account(privateKey), "https://rpc.aboutcircles.com/");
var hubService = new HubService(web3, hubAddress);

// Route Hub transactions through the Safe
hubService.ChangeContractHandlerToSafeExecTransaction(safeAddress, privateKey);

// Mint accumulated CRC
await hubService.PersonalMintRequestAndWaitForReceiptAsync();
```

The `ChangeContractHandlerToSafeExecTransaction` extension method from `Nethereum.GnosisSafe` wraps the mint call in a Safe transaction — the Safe is the registered avatar, not the EOA. See the [Gnosis Safe guide](guide-gnosis-safe) for more on this pattern.

## Query Transaction History

The Circles RPC provides paginated transaction history without needing to scan event logs:

```csharp
using Nethereum.Circles.RPC.Requests;

var client = new RpcClient(new Uri("https://rpc.aboutcircles.com/"));
var historyQuery = new GetTransactionHistoryQuery(client);

// Get first page (100 results)
var transactions = await historyQuery.SendRequestAsync("0xAvatarAddress", 100);

foreach (var tx in transactions.Response)
{
    Console.WriteLine($"Hash: {tx.TransactionHash}");
    Console.WriteLine($"  From: {tx.From} → To: {tx.To}");
    Console.WriteLine($"  Value: {tx.Value}");
}

// Get next page
var nextPage = await historyQuery.MoveNextPageAsync(transactions);
```

The pagination is cursor-based — `MoveNextPageAsync` uses the cursor from the previous response to fetch the next page.

## Query Trust Relationships

Trust is the foundation of Circles — you can only receive someone's personal CRC if you trust them. Query trust relationships:

```csharp
var trustQuery = new GetTrustRelationsQuery(client);

var relations = await trustQuery.SendRequestAsync("0xAvatarAddress", 20);

foreach (var relation in relations.Response)
{
    Console.WriteLine($"Truster: {relation.Truster} → Trustee: {relation.Trustee}");
}
```

## Get Avatar Info

Query metadata about a Circles avatar:

```csharp
var avatarInfo = new GetAvatarInfoQuery(client);
var info = await avatarInfo.SendRequestAsync("0xAvatarAddress");
```

This returns the avatar's name, type (human, organization, group), and associated token information.

## Contract Addresses

| Contract | Network | Address |
|----------|---------|---------|
| Hub V2 | Gnosis Chain | `0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8` |
| RPC Endpoint | Gnosis Chain | `https://rpc.aboutcircles.com/` |
| RPC Endpoint | Chiado Testnet | `https://chiado-rpc.aboutcircles.com` |

## Token Types

Circles has two ERC-20 token representations:

| Token Type | Service | Description |
|-----------|---------|-------------|
| **Demurrage** | `DemurrageCirclesService` | Balances decrease ~7%/year — represents "real" purchasing power |
| **Inflationary** | `InflationaryCirclesService` | Nominal balance stays constant — minted amount increases over time |

Both are ERC-20 compatible wrappers around the same underlying Circles balance. Most applications use the demurrage representation.

## Next Steps

- [Gnosis Safe](guide-gnosis-safe) -- the Safe integration Circles uses for avatar wallets
- [Uniswap: Swap Tokens](guide-uniswap-swap) -- swap CRC tokens on Uniswap
- [Nethereum.Circles Package Reference](../protocols/nethereum-circles) -- full API including migration service, name registry, and group currencies
