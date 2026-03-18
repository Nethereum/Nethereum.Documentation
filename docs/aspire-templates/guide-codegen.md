---
title: Generate C# from Solidity
sidebar_label: Generate C# Services
sidebar_position: 8
description: Convert Solidity ABIs into typed C# contract services using Nethereum code generation.
---

# Generate C# from Solidity

After [compiling your Solidity contracts](guide-solidity-contracts) with `forge build`, the next step is generating typed C# services so your .NET code can deploy, call, and query contracts without manual ABI handling. The dApp template includes generation scripts and ships with pre-generated code so you can build immediately.

## How It Works

The flow is:

```
contracts/src/MyToken.sol
        ↓ forge build
contracts/out/MyToken.sol/MyToken.json    (ABI + bytecode)
        ↓ generate-csharp script
ContractServices/MyToken/
├── ContractDefinition/MyTokenDefinition.gen.cs   (function/event messages)
└── MyTokenService.gen.cs                          (typed service class)
```

The generated `MyTokenService` gives you strongly-typed methods for every contract function — deploy, mint, transfer, balanceOf, etc. — with proper C# types, async/await, and receipt handling.

## Run Code Generation

After modifying Solidity and running `forge build`:

**Windows (PowerShell):**
```bash
pwsh scripts/generate-csharp.ps1
```

**Linux/macOS:**
```bash
bash scripts/generate-csharp.sh
```

Both scripts accept a `-b` flag to run `forge build` first:

```bash
pwsh scripts/generate-csharp.ps1 -b
```

The scripts use `Nethereum.Generator.Console` with the configuration in `contracts/.nethereum-gen.multisettings` to read the Foundry output and generate C# into `ContractServices/`.

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

Here's a complete example from the template's TDD tests:

```csharp
// Create an in-process DevChain
var node = await DevChainNode.CreateAndStartAsync();
var web3 = node.CreateWeb3(DevChainAccounts.Account2.PrivateKey);

// Deploy
var deployment = new MyTokenDeployment
{
    Name = "TestToken",
    Symbol = "TT",
    InitialSupply = Web3.Convert.ToWei(1_000_000)
};
var receipt = await MyTokenService.DeployContractAndWaitForReceiptAsync(web3, deployment);
var tokenService = new MyTokenService(web3, receipt.ContractAddress);

// Query
var name = await tokenService.NameQueryAsync();     // "TestToken"
var supply = await tokenService.TotalSupplyQueryAsync(); // 1_000_000 * 10^18

// Mint
await tokenService.MintRequestAndWaitForReceiptAsync(
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    Web3.Convert.ToWei(100));

// Transfer
await tokenService.TransferRequestAndWaitForReceiptAsync(
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    Web3.Convert.ToWei(50));
```

## Adding a New Contract

When you add a new `.sol` file (as shown in [Write Contracts](guide-solidity-contracts)):

1. Compile: `cd contracts && forge build`
2. Regenerate: `pwsh scripts/generate-csharp.ps1`
3. The new service appears in `ContractServices/YourContract/`
4. Add a `<Compile Include="..." />` or rely on wildcard includes in `ContractServices.csproj`

## Next Steps

With typed C# services in hand:

- **[Unit Test with C#](guide-csharp-unit-testing)** — Write fast TDD tests using the generated services
- **[Integration Testing](guide-integration-testing)** — Run E2E tests against the full Aspire stack
