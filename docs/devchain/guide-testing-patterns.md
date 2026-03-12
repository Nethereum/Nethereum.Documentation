---
title: Testing Patterns
sidebar_label: Testing Patterns
sidebar_position: 4
description: Write isolated integration tests using DevChain with snapshots, time manipulation, and test fixtures
---

# Testing Patterns

DevChain was designed for integration testing. Unlike mocking Ethereum calls, DevChain runs a real EVM — your tests exercise the same bytecode execution, gas calculation, and state transitions as mainnet. This guide shows how to structure tests with proper isolation using snapshots, time manipulation, and shared fixtures.

If you followed the [Quick Start](devchain-quickstart), you already know how to create a node. Here we focus on patterns that make tests reliable, fast, and independent of each other.

## Prerequisites

```bash
dotnet add package Nethereum.DevChain
dotnet add package xunit
```

## Shared Test Fixture

Creating a `DevChainNode` for every test is slow. Instead, create one node per test class and use snapshots to reset state between tests. Here's the pattern used in Nethereum's own test suite:

```csharp
using Nethereum.DevChain;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using System.Numerics;

public class DevChainFixture : IAsyncLifetime
{
    public DevChainNode Node { get; private set; }
    public Account Alice { get; private set; }
    public Account Bob { get; private set; }
    public IWeb3 AliceWeb3 { get; private set; }
    public IWeb3 BobWeb3 { get; private set; }

    public async Task InitializeAsync()
    {
        Alice = new Account("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
        Bob = new Account("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");

        Node = new DevChainNode(new DevChainConfig { ChainId = 31337 });
        await Node.StartAsync(new[] { Alice.Address, Bob.Address });

        AliceWeb3 = Node.CreateWeb3(Alice);
        BobWeb3 = Node.CreateWeb3(Bob);
    }

    public Task DisposeAsync()
    {
        Node?.Dispose();
        return Task.CompletedTask;
    }
}
```

Use xUnit's `ICollectionFixture` to share the fixture across test classes, or `IClassFixture` for a single class.

## Snapshot/Revert for Test Isolation

The most important testing pattern: take a snapshot before each test and revert after. This gives every test a clean state without recreating the node.

```csharp
using Nethereum.CoreChain.Storage;
using Xunit;

public class TransferTests : IClassFixture<DevChainFixture>, IAsyncLifetime
{
    private readonly DevChainFixture _fixture;
    private IStateSnapshot _snapshot;

    public TransferTests(DevChainFixture fixture)
    {
        _fixture = fixture;
    }

    public async Task InitializeAsync()
    {
        // Snapshot before each test
        _snapshot = await _fixture.Node.TakeSnapshotAsync();
    }

    public async Task DisposeAsync()
    {
        // Revert after each test — all state changes undone
        await _fixture.Node.RevertToSnapshotAsync(_snapshot);
    }

    [Fact]
    public async Task Transfer_Updates_Both_Balances()
    {
        var receipt = await _fixture.AliceWeb3.Eth.GetEtherTransferService()
            .TransferEtherAndWaitForReceiptAsync(_fixture.Bob.Address, 5.0m);

        var bobBalance = await _fixture.AliceWeb3.Eth.GetBalance
            .SendRequestAsync(_fixture.Bob.Address);

        // Bob started with 10,000 ETH, now has 10,005
        Assert.True(Web3.Convert.FromWei(bobBalance.Value) > 10000m);
    }

    [Fact]
    public async Task Transfer_Deducts_Gas_From_Sender()
    {
        var balanceBefore = await _fixture.AliceWeb3.Eth.GetBalance
            .SendRequestAsync(_fixture.Alice.Address);

        await _fixture.AliceWeb3.Eth.GetEtherTransferService()
            .TransferEtherAndWaitForReceiptAsync(_fixture.Bob.Address, 1.0m);

        var balanceAfter = await _fixture.AliceWeb3.Eth.GetBalance
            .SendRequestAsync(_fixture.Alice.Address);

        // Alice lost more than 1 ETH (transfer + gas)
        var diff = Web3.Convert.FromWei(balanceBefore.Value - balanceAfter.Value);
        Assert.True(diff > 1.0m);
    }
}
```

Because each test reverts to the snapshot, these tests can run in any order and never interfere with each other.

## Contract Deployment in Tests

Deploy contracts and interact with them using the standard Nethereum typed contract services:

```csharp
[Fact]
public async Task Deploy_ERC20_And_Check_Supply()
{
    // Deploy using standard Nethereum contract deployment
    var deploymentMessage = new StandardTokenDeployment { TotalSupply = 1_000_000 };
    var deployHandler = _fixture.AliceWeb3.Eth.GetContractDeploymentHandler<StandardTokenDeployment>();
    var receipt = await deployHandler.SendRequestAndWaitForReceiptAsync(deploymentMessage);

    var contractAddress = receipt.ContractAddress;

    // Query using typed service
    var tokenService = _fixture.AliceWeb3.Eth.ERC20.GetContractService(contractAddress);
    var supply = await tokenService.TotalSupplyQueryAsync();

    Assert.Equal(BigInteger.Parse("1000000"), supply);
}
```

The snapshot/revert pattern means the deployed contract is cleaned up after the test — no leftover state for the next test.

## Time Manipulation

For testing time-dependent contracts (vesting, timelocks, auctions), DevChain lets you control block timestamps:

```csharp
[Fact]
public async Task Timelock_Releases_After_Delay()
{
    // Deploy a timelock contract with a 1-hour delay
    // ... deploy contract ...

    // Advance time by 1 hour
    _fixture.Node.DevConfig.AddTimeOffset(3600);

    // Mine a block with the new timestamp
    await _fixture.Node.MineBlockAsync();

    // Now the timelock should be releasable
    // ... call release and verify ...
}
```

`AddTimeOffset(seconds)` shifts all future block timestamps. You can also set an exact timestamp for the next block:

```csharp
// Set exact timestamp for the next block
_fixture.Node.DevConfig.SetNextBlockTimestamp(1700000000);
await _fixture.Node.MineBlockAsync();

// The override is consumed — subsequent blocks use normal timing + offset
```

## Generating Test Accounts

When you need many accounts with known balances, use `GenerateAndFundAccountsAsync`:

```csharp
[Fact]
public async Task Multi_Party_Scenario()
{
    // Generate 10 funded accounts
    var accounts = await _fixture.Node.GenerateAndFundAccountsAsync(10);

    // Each account has the default initial balance (10,000 ETH)
    foreach (var account in accounts)
    {
        var web3 = _fixture.Node.CreateWeb3(account);
        var balance = await web3.Eth.GetBalance.SendRequestAsync(account.Address);
        Assert.True(balance.Value > 0);
    }
}
```

You can also specify a custom balance:

```csharp
var accounts = await _fixture.Node.GenerateAndFundAccountsAsync(
    count: 5,
    balance: Web3.Convert.ToWei(100)  // 100 ETH each
);
```

## Manual Block Mining

When `AutoMine` is enabled (the default), transactions are mined instantly. For testing pending transaction behavior or multi-transaction blocks, disable auto-mine:

```csharp
var config = new DevChainConfig { AutoMine = false };
var node = new DevChainNode(config);
await node.StartAsync(accounts);

// Send transactions — they stay pending
await web3.Eth.GetEtherTransferService()
    .TransferEtherAsync("0x...", 1.0m);

// Nothing mined yet — manually mine a block
await node.MineBlockAsync();
```

This is useful for testing scenarios where transaction ordering matters or where you need to batch multiple transactions into a single block.

## In-Memory for Speed

For CI/CD where disk I/O is a bottleneck, use in-memory storage:

```csharp
var node = DevChainNode.CreateInMemory(new DevChainConfig { ChainId = 31337 });
await node.StartAsync(alice, bob);
```

All data lives in memory — fastest possible setup and teardown. The trade-off is that you lose block history on disposal, but for test-and-discard scenarios that's exactly what you want.

## Common Gotchas

**Snapshot scope**: Snapshots capture account state (balances, nonces, code, storage) but SQLite-stored data (blocks, transactions, receipts) is pruned on revert. If your test queries historical blocks after a revert, those blocks won't exist.

**Nonce tracking**: If you revert a snapshot but keep using the same `Web3` instance, the nonce manager may have cached the old nonce. The `TransactionManager` handles this automatically for most cases, but if you see "nonce too low" errors after a revert, create a fresh `Web3` instance.

**Concurrent tests**: DevChainNode is not thread-safe for writes. If you run tests in parallel, each test class should have its own node instance, not a shared fixture.

## Next Steps

- [Forking & State Manipulation](guide-forking-and-state) — fork live networks and override state for integration tests
- [Debug & Trace](guide-debug-trace) — trace transaction execution at the opcode level
- [Quick Start](devchain-quickstart) — if you need a refresher on basic setup
- For the complete API, see the [Nethereum.DevChain package reference](nethereum-devchain)
