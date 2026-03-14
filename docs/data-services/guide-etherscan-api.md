---
title: Etherscan API
sidebar_label: Etherscan API
sidebar_position: 5
description: Query gas prices, account transactions, balances, token transfers, and contract data from Etherscan V2 with Nethereum.DataServices
---

# Etherscan API

Etherscan V2 provides a unified API across all Etherscan-supported chains. The `EtherscanApiService` wraps three sub-services — Contracts, Accounts, and GasTracker — so you can query contract ABIs, transaction history, balances, token transfers, and gas pricing from a single client. The same API key works across all Etherscan-compatible chains (Ethereum, Polygon, Arbitrum, Base, BSC, Optimism, etc.).

**When you need this guide:**

- Displaying gas price estimates so users can choose speed vs. cost before sending a transaction
- Querying account transaction history, balances, or token transfers
- Retrieving contract source code and compilation metadata
- Getting funded-by information for an account

The [ABI Retrieval guide](guide-abi-retrieval) covers Etherscan's contract ABI lookup as part of the composite fallback chain. This guide covers the direct Etherscan API for all other capabilities.

## Prerequisites

Install the package:

```bash
dotnet add package Nethereum.DataServices
```

You need an Etherscan API key. The free tier allows 5 calls/second, shared across all chains.

## Creating the Service

The `EtherscanApiService` takes a chain ID and API key. All sub-services are accessed as properties:

```csharp
using Nethereum.DataServices.Etherscan;

var etherscan = new EtherscanApiService(chain: 1, apiKey: "YOUR_ETHERSCAN_API_KEY");

// Sub-services
var contracts = etherscan.Contracts;
var accounts = etherscan.Accounts;
var gasTracker = etherscan.GasTracker;
```

To target a different chain, change the chain ID:

```csharp
var polygonApi = new EtherscanApiService(chain: 137, apiKey: "YOUR_KEY");
var arbApi = new EtherscanApiService(chain: 42161, apiKey: "YOUR_KEY");
var baseApi = new EtherscanApiService(chain: 8453, apiKey: "YOUR_KEY");
```

## Gas Oracle

Nethereum handles gas estimation automatically when sending transactions. The Etherscan gas oracle provides an alternative source of gas pricing data — three price tiers representing the gas price (in Gwei) needed to land a transaction at different priority levels.

```csharp
var response = await etherscan.GasTracker.GetGasOracleAsync();
var gas = response.Result;

Console.WriteLine($"Safe (slow):     {gas.SafeGasPrice} Gwei");
Console.WriteLine($"Proposed (avg):  {gas.ProposeGasPrice} Gwei");
Console.WriteLine($"Fast:            {gas.FastGasPrice} Gwei");
Console.WriteLine($"Base fee:        {gas.SuggestBaseFee} Gwei");
Console.WriteLine($"Gas used ratio:  {gas.GasUsedRatio}");
```

Here is what each field means:

- **SafeGasPrice** — the lowest price likely to confirm, but it may take several minutes. Good for non-urgent background transactions.
- **ProposeGasPrice** — a middle-ground price that typically confirms within a few blocks. This is the default most wallets show.
- **FastGasPrice** — a premium price for near-immediate inclusion. Use this when speed matters (e.g., DEX trades, time-sensitive mints).
- **SuggestBaseFee** — the current EIP-1559 base fee. On post-London chains, the actual gas cost is `baseFee + priorityFee`, so this tells you the floor.
- **GasUsedRatio** — a comma-separated string of ratios showing how full recent blocks were. Values near 1.0 indicate congestion and rising prices.

### Estimating Confirmation Time

If you already know the gas price you plan to use, you can ask Etherscan how long it will take to confirm. The `gasPriceInWei` parameter must be in Wei, not Gwei — multiply by 10^9.

```csharp
var estimate = await etherscan.GasTracker.GetEstimatedConfirmationTimeAsync(
    gasPriceInWei: 30_000_000_000); // 30 Gwei expressed in Wei

Console.WriteLine($"Estimated seconds to confirm: {estimate.Result}");
```

The returned value is a string representing the estimated number of seconds.

## Account Queries

### Balance

Get the ETH balance for a single account:

```csharp
var balance = await etherscan.Accounts.GetBalanceAsync(
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
Console.WriteLine($"Balance (Wei): {balance.Result}");
```

Or fetch balances for multiple accounts in a single call:

```csharp
var balances = await etherscan.Accounts.GetBalancesAsync(new[]
{
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"
});

foreach (var entry in balances.Result)
    Console.WriteLine($"{entry.Account}: {entry.Balance}");
```

### Transaction History

Get normal (external) transactions for an account with pagination:

```csharp
var txns = await etherscan.Accounts.GetAccountTransactionsAsync(
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    page: 1,
    offset: 10,
    sort: "desc");

foreach (var tx in txns.Result)
    Console.WriteLine($"  {tx.Hash} — {tx.Value} Wei to {tx.To}");
```

Internal transactions (contract-to-contract calls):

```csharp
var internal = await etherscan.Accounts.GetAccountInternalTransactionsAsync(
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    page: 1,
    offset: 10,
    sort: "desc");
```

### Token Transfers

Query ERC-20, ERC-721, and ERC-1155 token transfers:

```csharp
// ERC-20 token transfers
var erc20Transfers = await etherscan.Accounts.GetTokenTransfersAsync(
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");

// ERC-721 (NFT) transfers
var nftTransfers = await etherscan.Accounts.GetErc721TransfersAsync(
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");

// ERC-1155 (multi-token) transfers
var multiTransfers = await etherscan.Accounts.GetErc1155TransfersAsync(
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
```

### Funded By

Find the original funding source for an account:

```csharp
var fundedBy = await etherscan.Accounts.GetFundedByAsync(
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
Console.WriteLine($"Funded by: {fundedBy.Result}");
```

## Contract Data

### ABI and Source Code

Retrieve a contract's ABI as a JSON string:

```csharp
var abiResponse = await etherscan.Contracts.GetAbiAsync(
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
string abi = abiResponse.Result;
```

Get full source code with compilation metadata:

```csharp
var sourceResponse = await etherscan.Contracts.GetSourceCodeAsync(
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
var info = sourceResponse.Result.First();

Console.WriteLine($"Name: {info.ContractName}");
Console.WriteLine($"Compiler: {info.CompilerVersion}");
```

The source code response can also contain compilation metadata that can be deserialized:

```csharp
if (sourceResponse.Result.ContainsSourceCodeCompilationMetadata())
{
    var metadata = sourceResponse.Result.DeserialiseCompilationMetadata();
    var localSource = metadata.GetLocalSourceCode(info.ContractName);
}
```

### Contract Creator

Find who deployed a contract and the creation transaction:

```csharp
var creator = await etherscan.Contracts.GetContractCreatorAndCreationTxHashAsync(
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
```

## Multi-Chain Usage

The same API key works across all Etherscan V2-supported chains. Create separate service instances per chain:

```csharp
var chains = new Dictionary<string, long>
{
    ["Ethereum"] = 1,
    ["Polygon"] = 137,
    ["Arbitrum"] = 42161,
    ["Base"] = 8453,
    ["BSC"] = 56,
    ["Optimism"] = 10
};

foreach (var (name, chainId) in chains)
{
    var api = new EtherscanApiService(chain: chainId, apiKey: "YOUR_KEY");
    var oracle = await api.GasTracker.GetGasOracleAsync();

    if (oracle.Status == "1")
        Console.WriteLine($"{name}: Safe={oracle.Result.SafeGasPrice} Gwei");
    else
        Console.WriteLine($"{name}: Gas tracker not supported");
}
```

Not all chains support every module. Check `response.Status` before accessing `response.Result`.

## Common Gotchas

**API keys are per-account, not per-chain.** A single free-tier key works across all Etherscan V2 chains, but the rate limit (5 calls/second) is shared across all chains.

**Gas prices can go stale fast.** During periods of congestion, gas prices change block-by-block. Do not cache gas oracle results for more than a few seconds if you are displaying them to users making real-time decisions.

**Not all chains support all modules.** The gas tracker module is not available on every Etherscan-supported chain. Always check `response.Status == "1"` before accessing results.

**Historical balance requires PRO API.** `GetHistoricalBalanceAsync(address, blockNumber)` is only available with a paid Etherscan API plan.

**Token transfer queries can return large datasets.** Use pagination (`page`, `offset`) and block range filters to limit results. Without pagination, queries for active accounts may time out.

**Rate limiting across parallel requests.** If you query multiple chains in parallel, all requests share the same 5 calls/second limit. Use a semaphore or delay to throttle concurrent requests.

## Next Steps

- **[Sourcify API](guide-sourcify-api)** — verify contracts, decode selectors, and sync bulk Parquet exports (free, no API key)
- **[ABI Retrieval](guide-abi-retrieval)** — composite ABI lookup with automatic fallback across Sourcify, Etherscan, and 4Byte
- **[Chainlist RPC](guide-chainlist-rpc)** — discover chains and RPC endpoints
- **[CoinGecko API](guide-coingecko-api)** — fetch token metadata and prices
- **[Nethereum.DataServices](nethereum-dataservices)** — full package API reference
