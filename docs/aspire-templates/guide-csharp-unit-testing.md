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
var account = new Account("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", chainId);
var recipient = new Account("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", chainId);
var node = await DevChainNode.CreateAndStartAsync(account, recipient);
var web3 = node.CreateWeb3(account);
```

`CreateAndStartAsync(params Account[])` pre-funds the accounts you pass in.

## The Template Test Pattern

Open `Tests/MyTokenTests.cs`. Each test follows the same pattern:

1. **Create a DevChain** and Web3 instance once, in `InitializeAsync`
2. **Deploy the contract** using the generated `MyTokenService`
3. **Call functions** and **assert results**

The test class creates the node and the two funded accounts once, and a helper deploys the token:

```csharp
public async Task InitializeAsync()
{
    _account = new Account(PrivateKey, ChainId);
    _recipient = new Account(RecipientKey, ChainId);
    _node = await DevChainNode.CreateAndStartAsync(_account, _recipient);
    _web3 = _node.CreateWeb3(_account);
}

private async Task<MyTokenService> DeployTokenAsync(
    string name = "MyToken", string symbol = "MTK", decimal initialSupply = 1_000_000)
{
    var deployment = new MyTokenDeployment
    {
        Name = name,
        Symbol = symbol,
        InitialSupply = Web3.Convert.ToWei(initialSupply)
    };
    return await MyTokenService.DeployContractAndGetServiceAsync(_web3, deployment);
}
```

Here's the deploy and query test:

```csharp
[Fact]
public async Task Deploy_SetsNameAndSymbol()
{
    var service = await DeployTokenAsync("TestToken", "TT");

    var name = await service.NameQueryAsync();
    var symbol = await service.SymbolQueryAsync();

    Assert.Equal("TestToken", name);
    Assert.Equal("TT", symbol);
}
```

And the mint test:

```csharp
[Fact]
public async Task Mint_IncreasesBalance()
{
    var service = await DeployTokenAsync();
    var amount = Web3.Convert.ToWei(500);

    await service.MintRequestAndWaitForReceiptAsync(_recipient.Address, amount);

    var balance = await service.BalanceOfQueryAsync(_recipient.Address);
    Assert.Equal(amount, balance);
}
```

## Writing Your Own Tests

When you [add a new contract](guide-solidity-contracts) and [generate C# services](guide-codegen), add tests following the same pattern:

```csharp
[Fact]
public async Task ShouldDeployMyNFTAndMint()
{
    var account = new Account(PrivateKey, ChainId);
    var node = await DevChainNode.CreateAndStartAsync(account);
    var web3 = node.CreateWeb3(account);

    // Deploy your new contract
    var receipt = await MyNFTService.DeployContractAndWaitForReceiptAsync(web3,
        new MyNFTDeployment { Name = "TestNFT", Symbol = "TNFT" });

    var nftService = new MyNFTService(web3, receipt.ContractAddress);

    // Call functions
    var mintReceipt = await nftService.MintRequestAndWaitForReceiptAsync(
        account.Address);

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
