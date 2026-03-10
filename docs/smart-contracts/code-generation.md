---
title: Code Generation
sidebar_label: Code Generation
sidebar_position: 5
description: Generate typed C# contract services, DTOs, Unity requests, MUD tables, and Blazor pages from Solidity ABI
---

# Code Generation

Nethereum generates strongly-typed C# classes from Solidity ABI and bytecode — deployment messages, function messages, event DTOs, error DTOs, struct types, and a complete service class with methods for every contract function. The same generator supports Unity, Blazor, MUD, and multi-language output (C#, VB.NET, F#).

## Generation Tools

| Tool | Use Case |
|------|----------|
| **VS Code Solidity Extension** | Compile `.sol` and generate on save |
| **Nethereum.Generator.Console** | CLI for CI/CD, scripts, and Foundry projects |
| **nethereum-codegen** (npm) | Node.js API for JavaScript build pipelines |
| **Nethereum.Autogen.ContractApi** | MSBuild integration — generates on `dotnet build` |

## VS Code Extension

The [VS Code Solidity extension](https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity) compiles Solidity and generates Nethereum code automatically.

1. Install the extension
2. Open a `.sol` file or an ABI `.json` file
3. Press `F1` → **Nethereum: Generate Code**
4. Choose output language (C#, VB, F#) and target directory

The extension can also compile and generate on save.

## CLI Tool

```bash
dotnet tool install -g Nethereum.Generator.Console
```

### Generate from ABI

Generate from a single contract ABI file:

```bash
Nethereum.Generator.Console generate from-abi \
  -abi ./MyContract.abi \
  -bin ./MyContract.bin \
  -o ./Generated \
  -ns MyProject.Contracts \
  -cn MyContract
```

| Option | Description |
|--------|-------------|
| `-abi` | Path to ABI JSON file (required) |
| `-bin` | Path to bytecode file (auto-detected if same name as ABI) |
| `-o` | Output directory (required) |
| `-ns` | Base namespace (required) |
| `-cn` | Contract name (defaults to filename) |
| `-sf` | Single file mode (default: true) |

### Generate from Foundry (Forge) Output

This is the primary workflow for projects using Foundry. Compile with Forge, then generate from the JSON artifacts in `out/`:

```bash
# 1. Compile Solidity
forge build

# 2. Generate C# from compiled output
Nethereum.Generator.Console generate from-config \
  -cfg .nethereum-gen.multisettings \
  -r .
```

Or use the provided script:

```powershell
# PowerShell (builds + generates)
.\scripts\generate-csharp-from-forge.ps1 -Build

# Bash
./scripts/generate-csharp-from-forge.sh -b
```

### Generate from Project

Scan a .NET project directory for `.abi` files and generate for all of them:

```bash
Nethereum.Generator.Console generate from-project -p ./MyProject
```

Looks for a `Nethereum.Generator.json` config file in the project directory for fine-grained control.

## Configuration File (.nethereum-gen.multisettings)

For multi-contract projects, a configuration file defines how each contract maps to C# namespaces, output paths, and generator types. This is the standard approach for production projects.

```json
[
  {
    "paths": ["out/EntryPoint.sol/EntryPoint.json"],
    "generatorConfigs": [
      {
        "baseNamespace": "MyProject.AccountAbstraction",
        "basePath": "../src/MyProject.AccountAbstraction",
        "codeGenLang": 0,
        "generatorType": "ContractDefinition",
        "referencedTypesNamespaces": ["MyProject.Structs"],
        "structReferencedTypes": ["PackedUserOperation"]
      }
    ]
  },
  {
    "paths": [
      "out/NethereumAccount.sol/NethereumAccount.json",
      "out/NethereumAccountFactory.sol/NethereumAccountFactory.json"
    ],
    "generatorConfigs": [
      {
        "baseNamespace": "MyProject.Contracts.Core",
        "basePath": "../src/MyProject/Contracts/Core",
        "codeGenLang": 0,
        "generatorType": "ContractDefinition",
        "referencedTypesNamespaces": ["MyProject.Structs"],
        "structReferencedTypes": ["PackedUserOperation"]
      }
    ]
  }
]
```

### Configuration Options

| Field | Description |
|-------|-------------|
| `paths` | Array of Forge JSON artifact paths (relative to root) |
| `baseNamespace` | C# namespace for generated code |
| `basePath` | Output directory (relative to root) |
| `codeGenLang` | `0` = C#, `1` = VB.NET, `3` = F# |
| `generatorType` | Output type (see [Generator Types](#generator-types)) |
| `sharedTypesNamespace` | Namespace for shared events/errors/structs |
| `sharedTypes` | Array of `"events"`, `"errors"`, `"structs"`, `"functions"` to share |
| `referencedTypesNamespaces` | Existing namespaces to import instead of regenerating |
| `structReferencedTypes` | Struct names to import from referenced namespaces |
| `mudNamespace` | MUD world namespace (for MUD generators) |

### Real-World Example

Nethereum's own Account Abstraction contracts use this exact workflow. The Solidity contracts live in `contracts/src/`, are compiled with Forge, and C# bindings are generated via `.nethereum-gen.multisettings`:

```
contracts/
├── src/Nethereum.AccountAbstraction/    # Solidity source
│   ├── core/                            # BaseSmartAccount, NethereumAccount
│   ├── paymaster/                       # VerifyingPaymaster, TokenPaymaster
│   ├── modules/                         # ECDSAValidator, SmartSession
│   └── interfaces/                      # IAccount, IPaymaster, IERC7579
├── out/                                 # Forge compiled JSON artifacts
├── foundry.toml                         # Forge configuration
└── .nethereum-gen.multisettings         # → generates to src/Nethereum.AccountAbstraction/
```

## Generator Types

A single contract can produce multiple output types:

| Generator Type | Output | Use Case |
|----------------|--------|----------|
| `ContractDefinition` | Service class + all DTOs | Standard .NET applications |
| `UnityRequest` | Coroutine-based request classes | Unity game engine |
| `MudTables` | Table schema classes from `mud.config.ts` | MUD World framework |
| `MudExtendedService` | Extended service with MUD state access | MUD systems |
| `BlazorPageService` | Razor component with form bindings | Blazor Server/WASM |
| `NetStandardLibrary` | Complete .csproj + class library | Standalone NuGet packages |

Multiple generator types can target the same contract:

```json
{
  "paths": ["out/ERC20.sol/Standard_Token.json"],
  "generatorConfigs": [
    {
      "baseNamespace": "MyProject.Contracts",
      "basePath": "./Generated",
      "codeGenLang": 0,
      "generatorType": "ContractDefinition"
    },
    {
      "baseNamespace": "MyProject.Contracts",
      "basePath": "./Generated",
      "generatorType": "UnityRequest"
    },
    {
      "baseNamespace": "MyProject.Blazor",
      "basePath": "./BlazorGenerated",
      "generatorType": "BlazorPageService"
    }
  ]
}
```

## What Gets Generated

For a contract `ContractDefinition`, the generator produces:

```
MyContract/
├── ContractDefinition/
│   ├── MyContractDefinition.gen.cs       # Deployment + all function/event/error/struct DTOs
│   └── (or individual files per type when singleFile=false)
└── MyContractService.gen.cs              # Service class with methods for every function
```

### Generated Service Class

The service class (`ContractWeb3ServiceBase`) provides typed methods for every contract function:

```csharp
public partial class MyContractService : MyContractServiceBase
{
    // Deploy and get service in one call
    public static async Task<MyContractService> DeployContractAndGetServiceAsync(
        IWeb3 web3, MyContractDeployment deployment, CancellationTokenSource cancellationToken = null)
    {
        var receipt = await DeployContractAndWaitForReceiptAsync(web3, deployment, cancellationToken);
        return new MyContractService(web3, receipt.ContractAddress);
    }

    public MyContractService(IWeb3 web3, string contractAddress) : base(web3, contractAddress) { }
}

public partial class MyContractServiceBase : ContractWeb3ServiceBase
{
    // Query functions — two overloads: typed message or raw parameters
    public Task<BigInteger> BalanceOfQueryAsync(BalanceOfFunction function, BlockParameter block = null)
        => ContractHandler.QueryAsync<BalanceOfFunction, BigInteger>(function, block);

    public virtual Task<BigInteger> BalanceOfQueryAsync(string owner, BlockParameter block = null)
        => ContractHandler.QueryAsync<BalanceOfFunction, BigInteger>(
            new BalanceOfFunction { Owner = owner }, block);

    // Transaction functions — send or send-and-wait
    public Task<string> TransferRequestAsync(TransferFunction function)
        => ContractHandler.SendRequestAsync(function);

    public Task<TransactionReceipt> TransferRequestAndWaitForReceiptAsync(
        TransferFunction function, CancellationTokenSource cancellationToken = null)
        => ContractHandler.SendRequestAndWaitForReceiptAsync(function, cancellationToken);
}
```

### Generated DTOs

Every contract element gets a typed DTO:

```csharp
// Deployment message (constructor)
public partial class MyContractDeployment : MyContractDeploymentBase
{
    public MyContractDeployment() : base(BYTECODE) { }
}

public class MyContractDeploymentBase : ContractDeploymentMessage
{
    public static string BYTECODE = "0x60806040...";
    [Parameter("address", "_entryPoint", 1)]
    public virtual string EntryPoint { get; set; }
}

// Function message
[Function("transfer", "bool")]
public class TransferFunctionBase : FunctionMessage
{
    [Parameter("address", "_to", 1)]
    public virtual string To { get; set; }
    [Parameter("uint256", "_value", 2)]
    public virtual BigInteger Value { get; set; }
}

// Event DTO
[Event("Transfer")]
public class TransferEventDTOBase : IEventDTO
{
    [Parameter("address", "_from", 1, true)]
    public virtual string From { get; set; }
    [Parameter("address", "_to", 2, true)]
    public virtual string To { get; set; }
    [Parameter("uint256", "_value", 3, false)]
    public virtual BigInteger Value { get; set; }
}

// Error DTO (Solidity custom errors)
[Error("InsufficientBalance")]
public class InsufficientBalanceErrorBase : IErrorDTO
{
    [Parameter("uint256", "available", 1)]
    public virtual BigInteger Available { get; set; }
    [Parameter("uint256", "required", 2)]
    public virtual BigInteger Required { get; set; }
}
```

All generated classes use `partial` — you can extend them without modifying the `.gen.cs` files.

## Using the Generated Service

### Deploy

```csharp
var deployment = new MyContractDeployment { EntryPoint = entryPointAddress };

// Option 1: Deploy and get service
var service = await MyContractService.DeployContractAndGetServiceAsync(web3, deployment);

// Option 2: Deploy and get receipt
var receipt = await MyContractService.DeployContractAndWaitForReceiptAsync(web3, deployment);
var service = new MyContractService(web3, receipt.ContractAddress);
```

### Query

```csharp
// Using raw parameters (convenience overload)
var balance = await service.BalanceOfQueryAsync(ownerAddress);

// Using typed message (for full control including BlockParameter)
var balance = await service.BalanceOfQueryAsync(
    new BalanceOfFunction { Owner = ownerAddress },
    new BlockParameter(15000000));
```

### Send Transaction

```csharp
var receipt = await service.TransferRequestAndWaitForReceiptAsync(
    new TransferFunction { To = recipient, Value = amount });
```

### Events

```csharp
var transferEvent = service.GetTransferEvent();
var filter = transferEvent.CreateFilterInput(
    BlockParameter.CreateEarliest(), BlockParameter.CreateLatest());
var events = await transferEvent.GetAllChangesAsync(filter);
```

## Shared Types

When multiple contracts share the same events, errors, or structs (common in large projects like Account Abstraction), use shared types to generate them once:

```json
{
  "paths": ["out/ContractA.json", "out/ContractB.json"],
  "generatorConfigs": [
    {
      "baseNamespace": "MyProject.Contracts",
      "basePath": "./Generated",
      "codeGenLang": 0,
      "generatorType": "ContractDefinition",
      "sharedTypesNamespace": "MyProject.SharedTypes",
      "sharedTypes": ["events", "errors", "structs"]
    }
  ]
}
```

For structs already defined in another project, reference them instead of regenerating:

```json
{
  "referencedTypesNamespaces": ["MyProject.AccountAbstraction.Structs"],
  "structReferencedTypes": ["PackedUserOperation"]
}
```

## MUD Table Generation

Generate typed C# classes from a MUD `mud.config.ts` file:

```json
{
  "paths": ["mud.config.ts"],
  "generatorConfigs": [
    {
      "baseNamespace": "MyProject.World.Tables",
      "basePath": "./Generated/Tables",
      "generatorType": "MudTables",
      "mudNamespace": "MyWorld"
    }
  ]
}
```

For MUD systems, generate both the contract definition and extended service:

```json
{
  "paths": ["out/IncrementSystem.sol/IncrementSystem.json"],
  "generatorConfigs": [
    {
      "baseNamespace": "MyProject.World.Systems",
      "basePath": "./Generated/Systems",
      "codeGenLang": 0,
      "generatorType": "ContractDefinition",
      "mudNamespace": "MyWorld"
    },
    {
      "baseNamespace": "MyProject.World.Systems",
      "basePath": "./Generated/Systems",
      "codeGenLang": 0,
      "generatorType": "MudExtendedService",
      "mudNamespace": "MyWorld"
    }
  ]
}
```

## Node.js API (nethereum-codegen)

```bash
npm install nethereum-codegen
```

```javascript
var codegen = require('nethereum-codegen');

// Generate all C# classes
codegen.generateAllClasses(abi, bytecode, "ERC20",
    "MyProject.Contracts", "SharedTypes", ["events", "errors"], "./output", 0);

// Generate from config file
codegen.generateFilesFromConfigJsonFile("./nethereum-gen.multisettings", "./contracts");

// Generate Unity requests
codegen.generateUnityRequests(abi, bytecode, "ERC20",
    "MyProject.Contracts", "SharedTypes", ["events", "errors"], "./output");

// Generate MUD tables
codegen.generateMudTables(mudConfigJson, "MyProject.Tables", "Tables", "./output", 0, "MyWorld");

// Generate Blazor page service
codegen.generateBlazorPageService(abi, "ERC20", "MyProject.Contracts", "./output", "SharedTypes", 0);

// Generate .NET Standard class library project
codegen.generateNetStandardClassLibrary("MyProject", "./output", 0);
```

## MSBuild Integration

For automatic code generation on every build:

```bash
dotnet add package Nethereum.Autogen.ContractApi
```

Place `.abi` and `.bin` files in the project directory. Code is generated during compilation — no manual step needed.

## Next Steps

- [Smart Contract Interaction](./guide-smart-contract-interaction.md) -- use generated DTOs to deploy, query, and transact
- [Events & Logs](./guide-events.md) -- filter and decode events using generated event DTOs
- [Error Handling](./guide-error-handling.md) -- decode custom errors from generated error DTOs
- [Built-in Standards](./guide-built-in-standards.md) -- pre-generated services for ERC-20, ERC-721, etc.
