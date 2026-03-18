---
title: Integration Testing
sidebar_label: Integration Testing
sidebar_position: 10
description: Run end-to-end tests against a live Aspire AppHost with DevChain, Indexer, and Explorer.
---

# Integration Testing

The dApp template includes an `IntegrationTests/` project for end-to-end testing against the full Aspire stack. Unlike the [fast unit tests](guide-csharp-unit-testing) that use an embedded DevChain, integration tests connect to a running AppHost over HTTP — testing the real network stack, service discovery, and indexer processing.

## Prerequisites

The AppHost must be running:

```bash
dotnet run --project AppHost
```

Wait until all services show healthy in the Aspire dashboard before running tests.

## Run the Tests

```bash
dotnet test IntegrationTests/
```

By default, the tests connect to `http://localhost:8545`. If the DevChain is on a different port (Aspire assigns dynamic ports), set the `DEVCHAIN_URL` environment variable:

```bash
DEVCHAIN_URL=http://localhost:12345 dotnet test IntegrationTests/
```

## What the Template Tests

The template ships with three E2E tests:

### 1. DevChain Health Check

Verifies the DevChain is running and responding to JSON-RPC:

```csharp
var web3 = new Web3(rpcUrl);
var blockNumber = await web3.Eth.Blocks.GetBlockNumber.SendRequestAsync();
Assert.True(blockNumber.Value >= 0);
```

### 2. Deploy and Query

Deploys MyToken to the live DevChain and verifies the contract state:

```csharp
var deployment = new MyTokenDeployment
{
    Name = "E2EToken",
    Symbol = "E2E",
    InitialSupply = Web3.Convert.ToWei(1_000_000)
};

var receipt = await MyTokenService.DeployContractAndWaitForReceiptAsync(web3, deployment);
var tokenService = new MyTokenService(web3, receipt.ContractAddress);

var name = await tokenService.NameQueryAsync();
Assert.Equal("E2EToken", name);
```

### 3. Transfer with Indexing

Deploys a token, transfers tokens, then waits for the Indexer to process the transaction. This tests the full pipeline — DevChain → Indexer → PostgreSQL:

```csharp
var transferReceipt = await tokenService.TransferRequestAndWaitForReceiptAsync(
    DevChainAccounts.Account3.Address,
    Web3.Convert.ToWei(100));

// Wait for indexer to process
await Task.Delay(3000);

// Query the chain to verify
var balance = await tokenService.BalanceOfQueryAsync(DevChainAccounts.Account3.Address);
Assert.Equal(Web3.Convert.ToWei(100), balance);
```

The `Task.Delay(3000)` gives the Indexer time to pick up and process the new block. In production tests, you'd poll a health endpoint or database query instead.

## Writing Your Own Integration Tests

Integration tests are best for scenarios that span multiple services:

- **Contract deploys visible in Explorer** — deploy, wait for indexing, query the Explorer's API
- **Token transfers indexed correctly** — transfer tokens, verify the Indexer wrote them to PostgreSQL
- **Load generator creates expected transactions** — verify transaction count increases over time
- **ABI auto-discovery works** — deploy a contract from the Foundry project, verify the Explorer resolves the ABI

## When to Use Integration Tests vs Unit Tests

| Aspect | C# Unit Tests (`Tests/`) | Integration Tests (`IntegrationTests/`) |
|--------|--------------------------|----------------------------------------|
| **Requires** | Nothing (in-process) | Running AppHost + Docker |
| **Speed** | Seconds | Minutes (startup + processing) |
| **Tests** | Contract logic via typed services | Full pipeline across services |
| **Network** | In-process, no HTTP | Real HTTP, real ports |
| **Use for** | TDD loop, fast feedback | CI pipeline, deployment verification |

Use unit tests during development (fast feedback), integration tests before merging or deploying (full confidence).

## Next Steps

With both testing tiers covered, move on to building the user-facing dApp:

- **[Wallet Integration](guide-wallet-integration)** — Connect MetaMask and handle chain switching in the Blazor WebApp
- **[Token Interaction UI](guide-webapp-token-interaction)** — Build the deploy/mint/transfer UI
