---
title: Generate C# from Solidity
sidebar_label: Generate C# Services
sidebar_position: 8
description: Convert Solidity ABIs into typed C# contract services using Nethereum code generation.
---

# Generate C# from Solidity

After [compiling your Solidity contracts](guide-solidity-contracts) with `forge build`, the next step is generating typed C# services so your .NET code can deploy, call, and query contracts without manual ABI handling. The dApp template ships with a generator configuration and pre-generated code so you can build immediately.

## How It Works

The flow is:

```
contracts/src/MyToken.sol
        ↓ forge build
contracts/out/MyToken.sol/MyToken.json    (ABI + bytecode)
        ↓ Nethereum.Generator.Console
ContractServices/MyToken/
├── ContractDefinition/MyTokenDefinition.gen.cs   (function/event messages)
└── MyTokenService.gen.cs                          (typed service class)
```

The generated `MyTokenService` gives you strongly-typed methods for every contract function — deploy, mint, transfer, balanceOf, etc. — with proper C# types, async/await, and receipt handling.

## Run Code Generation

After modifying Solidity and running `forge build`:

Install the generator once with `dotnet tool install -g Nethereum.Generator.Console`, then run `Nethereum.Generator.Console generate from-config -cfg contracts/.nethereum-gen.multisettings -r contracts`.

```bash
dotnet tool install -g Nethereum.Generator.Console
Nethereum.Generator.Console generate from-config -cfg contracts/.nethereum-gen.multisettings -r contracts
```

The generator uses the configuration in `contracts/.nethereum-gen.multisettings` to read the Foundry output and generate C# into `ContractServices/`.

## What Gets Generated

For each contract, you get two files:

### ContractDefinition (messages)

`ContractServices/MyToken/ContractDefinition/MyTokenDefinition.gen.cs` contains:

- **Deployment message** — `MyTokenDeployment` with constructor parameters
- **Function messages** — `MintFunction`, `TransferFunction`, `BalanceOfFunction`, etc.
- **Event DTOs** — `TransferEventDTO`, `ApprovalEventDTO`
- **Output DTOs** — `BalanceOfOutputDTO`, `NameOutputDTO`, etc.

Each message is a C# class with properties matching the Solidity function parameters, fully typed (e.g., `BigInteger` for `uint256`, `string` for `address`).

### Service (typed methods)

`ContractServices/MyToken/MyTokenService.gen.cs` provides:

```csharp
// Deploy
var receipt = await MyTokenService.DeployContractAndWaitForReceiptAsync(web3, deployment);

// Query (read-only, no gas)
var name = await tokenService.NameQueryAsync();
var balance = await tokenService.BalanceOfQueryAsync(ownerAddress);

// Write (sends transaction)
var receipt = await tokenService.MintRequestAndWaitForReceiptAsync(toAddress, amount);
var receipt = await tokenService.TransferRequestAndWaitForReceiptAsync(toAddress, amount);
```

Every write method has both `RequestAsync` (returns tx hash) and `RequestAndWaitForReceiptAsync` (waits for mining) variants.

## Using Generated Services

Here are two of the template's TDD tests (`Tests/MyTokenTests.cs`), which deploy through a `DeployTokenAsync` helper:

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

[Fact]
public async Task Transfer_MovesTokens()
{
    var service = await DeployTokenAsync(initialSupply: 1000);
    var amount = Web3.Convert.ToWei(100);

    await service.TransferRequestAndWaitForReceiptAsync(_recipient.Address, amount);

    var senderBalance = await service.BalanceOfQueryAsync(_account.Address);
    var recipientBalance = await service.BalanceOfQueryAsync(_recipient.Address);

    Assert.Equal(Web3.Convert.ToWei(900), senderBalance);
    Assert.Equal(Web3.Convert.ToWei(100), recipientBalance);
}
```

## Adding a New Contract

When you add a new `.sol` file (as shown in [Write Contracts](guide-solidity-contracts)):

1. Compile: `cd contracts && forge build`
2. Regenerate: `Nethereum.Generator.Console generate from-config -cfg contracts/.nethereum-gen.multisettings -r contracts`
3. The new service appears in `ContractServices/YourContract/`
4. Add a `<Compile Include="..." />` or rely on wildcard includes in `ContractServices.csproj`

## Next Steps

With typed C# services in hand:

- **[Unit Test with C#](guide-csharp-unit-testing)** — Write fast TDD tests using the generated services
- **[Integration Testing](guide-integration-testing)** — Run E2E tests against the full Aspire stack
