---
title: Installation
sidebar_label: Installation
sidebar_position: 2
description: How to install Nethereum packages, templates, and Unity libraries
---

# Installation

## NuGet Packages

Most users start with `Nethereum.Web3`, which pulls in all core dependencies:

```bash
dotnet add package Nethereum.Web3
```

For specific functionality, install targeted packages:

```bash
# HD wallet support
dotnet add package Nethereum.HDWallet

# EIP-712 typed data signing
dotnet add package Nethereum.Signer.EIP712

# Blockchain data indexing to PostgreSQL
dotnet add package Nethereum.BlockchainStore.Postgres

# Account abstraction (ERC-4337)
dotnet add package Nethereum.AccountAbstraction

# MUD framework
dotnet add package Nethereum.Mud
```

See the [Component Catalog](/docs/component-catalog) for the complete list of 130+ packages.

## Project Templates

Nethereum provides `dotnet new` templates to get started quickly.

### Templates Pack

```bash
dotnet new install Nethereum.Templates.Pack
```

This installs templates for:

| Template | Command | Description |
|---|---|---|
| Smart Contract Library | `dotnet new smartcontract` | ERC-20 example with tests and code generation |
| ERC721/ERC1155 OpenZeppelin | `dotnet new nethereum-erc721-oz` | NFT development with OpenZeppelin |
| Blazor MetaMask | `dotnet new nethereum-mm-blazor` | Blazor + MetaMask integration (Wasm and Server) |
| Blazor SIWE | `dotnet new nethereum-siwe` | Sign-In with Ethereum authentication |
| WebSocket Streaming | `dotnet new nethereum-ws-stream` | Real-time blockchain data streaming |

### Aspire DevChain Template

```bash
dotnet new install Nethereum.Aspire.TemplatePack
dotnet new nethereum-devchain -n MyChain
cd MyChain/AppHost && dotnet run
```

This creates a complete Aspire-orchestrated development environment with:

- **DevChain node** — in-process Ethereum node with prefunded accounts
- **PostgreSQL** — database for blockchain data storage
- **Blockchain indexer** — crawls and stores blocks, transactions, and logs
- **Blazor explorer** — web-based blockchain explorer with ABI-decoded contract interaction
- **Account abstraction bundler** — ERC-4337 UserOperation bundler
- **Load test generator** — automated transaction load testing

All components are wired together and start with a single `dotnet run`. See the [DevChain section](/docs/devchain/overview) for details.

## Unity

Nethereum supports Unity with pre-compiled .NET Framework 4.7.2 / netstandard AOT runtime libraries.

### Install via OpenUPM (recommended)

1. Open **Edit → Project Settings → Package Manager**
2. Add a scoped registry:
   - **Name:** `package.openupm.com`
   - **URL:** `https://package.openupm.com`
   - **Scope:** `com.nethereum.unity`
3. Open **Window → Package Manager**, search for `com.nethereum.unity` and install

Or add directly to `Packages/manifest.json`:

```json
{
  "scopedRegistries": [
    {
      "name": "package.openupm.com",
      "url": "https://package.openupm.com",
      "scopes": ["com.nethereum.unity"]
    }
  ],
  "dependencies": {
    "com.nethereum.unity": "4.19.2"
  }
}
```

### Install via Git

1. Open Unity → Window → Package Manager
2. Click "+" → "Add package from git URL..."
3. Enter: `https://github.com/Nethereum/Nethereum.Unity.git`

### Additional Resources

- [Nethereum.Unity repository](https://github.com/Nethereum/Nethereum.Unity) — full setup guide
- [Unity3dSampleTemplate](https://github.com/Nethereum/Unity3dSimpleSampleNet472) — example project template
- [GitHub Releases](https://github.com/Nethereum/Nethereum/releases) — compiled libraries included in each release

:::tip WebGL
For WebGL builds using async/await, you need the [WebGLThreadingPatcher](https://github.com/Nethereum/WebGLThreadingPatcher). For Unity V6, use Nethereum's fork which includes compatibility fixes.
:::

## Supported Platforms

| Target | Scope |
|---|---|
| netstandard 2.0, net451, net461, net6.0, net8.0, net9.0, net10.0 | Core libraries |
| net8.0, net10.0 | CoreChain, AppChain, Server components |
| net6.0–net10.0 | Blazor UI |
| net461, net472, netstandard 2.1 | Unity |

Nethereum runs on Windows, Linux, macOS, Android, iOS, WebAssembly, and game consoles.

## Next Steps

- [Your First Project](/docs/getting-started/first-project) — build something in 5 minutes
- [Choosing How to Connect](/docs/getting-started/choosing-a-connection) — public RPC vs local DevChain vs IPC
