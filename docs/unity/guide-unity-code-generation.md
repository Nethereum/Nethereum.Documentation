---
title: "Code Generation & Shared Projects"
sidebar_label: "Code Generation & Shared Projects"
sidebar_position: 4
description: "Generate typed C# contract services from Solidity ABI and share them between Unity and .NET test projects"
---

# Code Generation & Shared Projects

When you [interact with smart contracts](guide-unity-smart-contracts) using typed contract services like `ERC20TokenService`, those classes are generated from Solidity ABI output. This guide covers generating typed C# services from your Solidity contracts and — more importantly — structuring your project so the generated code is shared between Unity and standard .NET projects (test runners, backends, CLI tools) without duplication.

## Why Share Code?

Unity projects and regular .NET projects use the same C# language but different build systems. Without a shared project, you'd have two copies of your contract services — one in Unity, one in your test project — that drift apart. The shared project pattern gives you:

- **One source of truth** for contract DTOs, services, and definitions
- **Test with xUnit** or NUnit in a standard .NET test runner, then use the same code in Unity at runtime
- **No Unity Editor needed** to run your contract integration tests

The [Unity3d Sample Template](https://github.com/Nethereum/Unity3dSampleTemplate) demonstrates this pattern with a `Sample.DotNet.Contracts` project that both Unity and a .NET test project consume.

## Generate Contract Services

Nethereum's code generator takes Solidity ABI and bytecode (from Forge, Hardhat, or Truffle output) and produces typed C# classes — deployment messages, function messages, event DTOs, and a contract service class.

### Install the Generator

```bash
dotnet tool install -g Nethereum.Generator.Console
```

### Generate from a Single ABI

If you have ABI and bytecode files from your Solidity compiler:

```bash
Nethereum.Generator.Console generate from-abi \
    -abi ./out/MyToken.abi \
    -bin ./out/MyToken.bin \
    -o ./MyContracts \
    -ns MyGame.Contracts \
    -cn MyToken
```

This generates:
- `MyTokenDeployment` — deployment message with bytecode
- `TransferFunction`, `ApproveFunction`, etc. — typed function messages
- `TransferEventDTO`, `ApprovalEventDTO` — typed event DTOs
- `MyTokenService` — contract service with typed methods for every function

### Generate from Forge Output

For Foundry/Forge projects, use the multi-settings config format. Create a `.nethereum-gen.multisettings` file:

```json
[
    {
        "paths": [
            "out/MyToken.sol/MyToken.json"
        ],
        "generatorConfigs": [
            {
                "baseNamespace": "MyGame.Contracts.MyToken",
                "basePath": "../SharedContracts",
                "codeGenLang": 0
            }
        ]
    }
]
```

Then run:

```bash
Nethereum.Generator.Console generate from-config \
    -cfg .nethereum-gen.multisettings
```

The `paths` array points to Forge's JSON output files (which contain both ABI and bytecode). The `basePath` is where the generated C# files go — point it at your shared project directory.

### Generate from a .NET Project

If your project contains ABI files, the generator can auto-discover them:

```bash
Nethereum.Generator.Console generate from-project -p ./MyContracts
```

This scans for `.abi` files and generates C# code with namespaces based on the project structure. You can control generation with a `Nethereum.Generator.json` config file in the project directory.

## Set Up the Shared .NET Project

The shared project is a standard `netstandard2.0` class library — this is the broadest target that both Unity (via its .NET Standard 2.1 support) and modern .NET can consume.

### Create the Project

```bash
mkdir SharedContracts
cd SharedContracts
dotnet new classlib -f netstandard2.0
dotnet add package Nethereum.Web3
```

### Configure for Unity Consumption

The key configuration redirects build output to a location Unity can find, and excludes Unity `.meta` files from the build:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
    <!-- Redirect build output so Unity can reference it -->
    <BaseOutputPath>..\Build\$(MSBuildProjectName)\bin</BaseOutputPath>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Nethereum.Web3" Version="5.*" />
  </ItemGroup>

  <!-- Exclude Unity .meta files from compilation -->
  <ItemGroup>
    <None Remove="**\*.meta" />
  </ItemGroup>
</Project>
```

The `BaseOutputPath` redirect is important — it places the compiled DLLs outside the source tree where Unity's asset importer won't interfere with them. The `<None Remove="**\*.meta" />` prevents Unity's tracking files from confusing the .NET build.

### Add Unity Package Metadata

For Unity to consume the project as a local package, add two files to the shared project directory:

**`package.json`** — Unity package manifest:

```json
{
    "name": "com.myproject.contracts",
    "version": "1.0.0",
    "displayName": "My Game Contracts",
    "description": "Shared contract definitions",
    "unity": "2021.3"
}
```

**`MyContracts.asmdef`** — Unity assembly definition:

```json
{
    "name": "MyContracts",
    "rootNamespace": "MyGame.Contracts",
    "references": [],
    "includePlatforms": [],
    "excludePlatforms": [],
    "allowUnsafeCode": false,
    "overrideReferences": false,
    "precompiledReferences": [],
    "autoReferenced": true,
    "defineConstraints": [],
    "versionDefines": [],
    "noEngineReferences": true
}
```

The `.asmdef` file tells Unity's compilation pipeline to treat this directory as a separate assembly. Setting `noEngineReferences: true` means the code doesn't depend on `UnityEngine` — it's pure .NET.

### Reference from Unity

In your Unity project's `Packages/manifest.json`, add a `file:` dependency pointing to the shared project:

```json
{
  "dependencies": {
    "com.nethereum.unity": "5.0.0",
    "com.unity.nuget.newtonsoft-json": "3.2.1",
    "com.myproject.contracts": "file:../../SharedContracts"
  }
}
```

The `file:` protocol tells Unity to treat the directory as a local package. The relative path goes from your Unity project's `Packages/` folder to the shared project root. Unity will compile the `.cs` files using the `.asmdef` assembly definition — no pre-compiled DLLs needed.

### Reference from .NET Test Project

Your test project references the shared project directly as a standard project reference:

```xml
<ItemGroup>
    <ProjectReference Include="..\SharedContracts\SharedContracts.csproj" />
</ItemGroup>
```

Now both Unity and your test project compile from the same source files.

## Project Structure

A complete setup looks like this:

```
MyGameProject/
├── contracts/                      # Solidity source
│   ├── src/MyToken.sol
│   └── .nethereum-gen.multisettings
├── SharedContracts/                # Generated C# (shared)
│   ├── SharedContracts.csproj      # netstandard2.0
│   ├── package.json                # Unity package manifest
│   ├── MyContracts.asmdef          # Unity assembly definition
│   └── MyToken/
│       ├── ContractDefinition/
│       │   └── MyTokenDefinition.cs    # ABI + bytecode
│       └── MyTokenService.cs           # Typed service
├── MyGame.Unity/                   # Unity project
│   └── Packages/manifest.json      # file: reference to SharedContracts
└── MyGame.Tests/                   # .NET test project
    └── MyGame.Tests.csproj          # ProjectReference to SharedContracts
```

## Using Generated Services in Unity

Once the shared project is set up, the generated contract services work identically in Unity and .NET. Here's a complete example using the async pattern from the [Quickstart](guide-unity-quickstart):

```csharp
using UnityEngine;
using MyGame.Contracts.MyToken;
using MyGame.Contracts.MyToken.ContractDefinition;
using Nethereum.Web3;
using Nethereum.Unity.Rpc;

public class TokenManager : MonoBehaviour
{
    async void Start()
    {
        var web3 = await GetWeb3Async();

        // Deploy using generated deployment message
        var deployment = new MyTokenDeployment
        {
            InitialAmount = Web3.Convert.ToWei(1000000),
            TokenName = "Game Gold",
            TokenSymbol = "GOLD",
            DecimalUnits = 18,
        };

        var receipt = await web3.Eth.GetContractDeploymentHandler<MyTokenDeployment>()
            .SendRequestAndWaitForReceiptAsync(deployment);

        Debug.Log($"Deployed at: {receipt.ContractAddress}");

        // Use the generated service for typed calls
        var tokenService = new MyTokenService(web3, receipt.ContractAddress);
        var balance = await tokenService.BalanceOfQueryAsync(web3.TransactionManager.Account.Address);
        Debug.Log($"Balance: {Web3.Convert.FromWei(balance)}");
    }
}
```

The same `MyTokenService` and `MyTokenDeployment` classes work in your xUnit tests — the test project gets them from the same `SharedContracts` project reference.

## Workflow

The day-to-day workflow with shared projects:

1. **Edit Solidity** — modify your contracts in `contracts/src/`
2. **Compile** — `forge build` (or Hardhat/Truffle equivalent)
3. **Regenerate** — `Nethereum.Generator.Console generate from-config`
4. **Test in .NET** — run your xUnit/NUnit tests against a dev chain
5. **Run in Unity** — open Unity, your contract services are already updated (Unity recompiles automatically when `.cs` files change)

No manual copying, no DLL management — both Unity and .NET always see the latest generated code.

## Next Steps

- [Quickstart](guide-unity-quickstart) — installation and basic setup recap
- [Smart Contracts & ERC-20](guide-unity-smart-contracts) — deploy contracts, transfer tokens, and decode events using these generated services
- [WebGL Wallets](guide-unity-wallets) — connect browser wallets for WebGL builds
