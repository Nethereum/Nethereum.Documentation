---
title: Unit Test with C#
sidebar_label: Unit Test (C#)
sidebar_position: 9
description: Write fast TDD tests against an embedded DevChain — no Docker, no Aspire, pure in-process.
---

# Unit Test with C#

The dApp template includes a `Tests/` project for fast, in-process contract testing. These tests use an **embedded DevChain** — no Docker, no Aspire, no HTTP. They deploy contracts, call functions, and verify results in seconds, making them ideal for your TDD development loop.

This complements [Forge testing](guide-forge-testing) — Forge tests verify Solidity logic at the EVM level, while C# tests verify the typed service layer and .NET integration.

## Run the Template Tests

```bash
dotnet test Tests/
```

All 7 tests should pass in a few seconds:

```
Passed!  - Failed: 0, Passed: 7, Skipped: 0, Total: 7
```

## How It Works

The test project uses `DevChainNode.CreateAndStartAsync()` to spin up a full Ethereum node in-process. No ports, no containers — just a C# object that speaks JSON-RPC in memory.

```csharp
var node = await DevChainNode.CreateAndStartAsync();
var web3 = node.CreateWeb3(DevChainAccounts.Account2.PrivateKey);
```

`DevChainAccounts` provides 10 pre-funded accounts (10,000 ETH each), matching the standard Hardhat/Foundry test accounts.

## The Template Test Pattern

Open `Tests/MyTokenTests.cs`. Each test follows the same pattern:

1. **Create a DevChain** and Web3 instance
2. **Deploy the contract** using the generated `MyTokenService`
3. **Call functions** and **assert results**

Here's the deploy and query test:

```csharp
[Fact]
public async Task ShouldDeployAndQueryTokenInfo()
{
    var node = await DevChainNode.CreateAndStartAsync();
    var web3 = node.CreateWeb3(DevChainAccounts.Account2.PrivateKey);

    var deployment = new MyTokenDeployment
    {
        Name = "TestToken",
        Symbol = "TT",
        InitialSupply = Web3.Convert.ToWei(1_000_000)
    };

    var receipt = await MyTokenService.DeployContractAndWaitForReceiptAsync(web3, deployment);
    var tokenService = new MyTokenService(web3, receipt.ContractAddress);

    var name = await tokenService.NameQueryAsync();
    var symbol = await tokenService.SymbolQueryAsync();
    var supply = await tokenService.TotalSupplyQueryAsync();

    Assert.Equal("TestToken", name);
    Assert.Equal("TT", symbol);
    Assert.Equal(Web3.Convert.ToWei(1_000_000), supply);
}
```

And the mint test:

```csharp
[Fact]
public async Task ShouldMintTokens()
{
    var node = await DevChainNode.CreateAndStartAsync();
    var web3 = node.CreateWeb3(DevChainAccounts.Account2.PrivateKey);

    var deployment = new MyTokenDeployment
    {
        Name = "TestToken",
        Symbol = "TT",
        InitialSupply = Web3.Convert.ToWei(1_000_000)
    };

    var receipt = await MyTokenService.DeployContractAndWaitForReceiptAsync(web3, deployment);
    var tokenService = new MyTokenService(web3, receipt.ContractAddress);

    var mintReceipt = await tokenService.MintRequestAndWaitForReceiptAsync(
        DevChainAccounts.Account3.Address,
        Web3.Convert.ToWei(500));

    Assert.Equal(1, (int)mintReceipt.Status.Value);

    var balance = await tokenService.BalanceOfQueryAsync(DevChainAccounts.Account3.Address);
    Assert.Equal(Web3.Convert.ToWei(500), balance);
}
```

## Writing Your Own Tests

When you [add a new contract](guide-solidity-contracts) and [generate C# services](guide-codegen), add tests following the same pattern:

```csharp
[Fact]
public async Task ShouldDeployMyNFTAndMint()
{
    var node = await DevChainNode.CreateAndStartAsync();
    var web3 = node.CreateWeb3(DevChainAccounts.Account2.PrivateKey);

    // Deploy your new contract
    var receipt = await MyNFTService.DeployContractAndWaitForReceiptAsync(web3,
        new MyNFTDeployment { Name = "TestNFT", Symbol = "TNFT" });

    var nftService = new MyNFTService(web3, receipt.ContractAddress);

    // Call functions
    var mintReceipt = await nftService.MintRequestAndWaitForReceiptAsync(
        DevChainAccounts.Account2.Address);

    Assert.Equal(1, (int)mintReceipt.Status.Value);
}
```

## When to Use C# Tests vs Forge Tests

| Aspect | Forge Tests | C# Unit Tests |
|--------|------------|---------------|
| **Language** | Solidity | C# |
| **Speed** | Very fast (native EVM) | Fast (in-process DevChain) |
| **What it tests** | Contract logic (internal) | Service layer + .NET integration |
| **Fuzz testing** | Built-in | Manual |
| **Use when** | Testing Solidity edge cases, gas optimization | Testing C# code that calls contracts, verifying codegen output |

Both test tiers complement each other — Forge tests catch Solidity bugs, C# tests catch integration issues.

## Next Steps

These unit tests verify individual contract interactions. For full-stack testing:

- **[Integration Testing](guide-integration-testing)** — Run E2E tests against the live Aspire AppHost with DevChain, Indexer, and Explorer all running together
