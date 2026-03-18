---
title: Aspire Templates
sidebar_label: Overview
sidebar_position: 1
description: Ready-to-use .NET Aspire templates for Ethereum development — from a simple DevChain to a full-stack dApp with Solidity, C#, and Blazor.
---

# Aspire Templates

Nethereum provides two .NET Aspire templates that give you a complete Ethereum development environment with a single command. No manual wiring, no Docker Compose files, no configuration puzzles — just `dotnet new` and `dotnet run`.

## Which Template Should I Use?

| | `nethereum-devchain` | `nethereum-dapp` |
|---|---|---|
| **Use when** | You need a local chain + explorer for development | You're building a full-stack dApp |
| **Services** | DevChain, Indexer, Explorer, PostgreSQL | Everything in devchain + WebApp, LoadGenerator, Foundry contracts, ContractServices, Tests |
| **Wallet UI** | Explorer only (connect to interact with contracts) | WebApp with EIP-6963 wallet flow + chain switching |
| **Solidity** | Bring your own contracts | Starter ERC-20 with Forge tests and deploy scripts |
| **C# codegen** | Not included | Solidity → C# typed services with generation scripts |
| **Testing** | Not included | TDD unit tests (no Docker) + E2E integration tests |
| **Best for** | Backend devs, contract testing, infrastructure | Full-stack dApp developers, learning Nethereum end-to-end |

**New to Nethereum?** Start with `nethereum-dapp` — it includes everything and teaches the full workflow.

**Just need a local chain?** Use `nethereum-devchain` — it's simpler and you can always add a dApp layer later.

## Quick Start

### Install the template pack

```bash
dotnet new install Nethereum.Aspire.TemplatePack
```

### Create and run

```bash
# Simple DevChain environment
dotnet new nethereum-devchain -n MyChain
cd MyChain/AppHost
dotnet user-secrets set "Parameters:devAccountPrivateKey" "5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
dotnet run
```

```bash
# Full-stack dApp
dotnet new nethereum-dapp -n MyDapp
cd MyDapp/AppHost
dotnet user-secrets set "Parameters:devAccountPrivateKey" "5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
dotnet run
```

The Aspire dashboard opens automatically — all services are visible with health status, logs, and traces.

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download) or later
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the PostgreSQL container)
- [Foundry](https://getfoundry.sh/) (optional — for Solidity compilation and Forge tests, used by the dApp template)
- A browser wallet supporting [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) (MetaMask, Rabby, etc.) for wallet features

## Template Parameters

Both templates accept these parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--NethereumVersion` | `6.0.4` | Nethereum NuGet package version |
| `--ChainId` | `31337` | Chain ID for the DevChain node |
| `--AspireVersion` | `13.1.1` | .NET Aspire SDK and hosting package version |

## Guides

### Getting Started

| Guide | What You'll Learn |
|---|---|
| [DevChain Template](guide-devchain-template) | Install the template pack, create a DevChain project, run it, and explore the Aspire dashboard, Explorer, and Indexer |
| [dApp Template](guide-dapp-template) | Create a full-stack dApp with 9 projects, understand the architecture, and run the complete stack |

### Solidity Development

| Guide | What You'll Learn |
|---|---|
| [VS Code Solidity Setup](guide-solidity-setup) | Install the VS Code Solidity extension and Foundry toolchain for writing, compiling, and debugging Solidity |
| [Write Solidity Contracts](guide-solidity-contracts) | Create ERC-20 tokens with OpenZeppelin, structure a Foundry project, and compile with `forge build` |
| [Test with Forge](guide-forge-testing) | Write and run Solidity unit tests, use fuzz testing, check gas usage, and measure test coverage |
| [Deploy with Forge Scripts](guide-forge-deploy) | Write deployment scripts, broadcast transactions to the DevChain, and verify contracts |

### C# Integration

| Guide | What You'll Learn |
|---|---|
| [Generate C# from Solidity](guide-codegen) | Convert Solidity ABIs into typed C# contract services using Nethereum code generation |
| [Unit Test with C#](guide-csharp-unit-testing) | Write fast TDD tests against an embedded DevChain — no Docker, no Aspire, pure in-process |
| [Integration Testing](guide-integration-testing) | Run end-to-end tests against a live Aspire AppHost with DevChain, Indexer, and Explorer |

### dApp Development

| Guide | What You'll Learn |
|---|---|
| [Wallet Integration](guide-wallet-integration) | Connect MetaMask via EIP-6963, validate the chain, and prompt users to switch to the DevChain |
| [Token Interaction UI](guide-webapp-token-interaction) | Build a Blazor page that deploys, mints, transfers, and queries ERC-20 tokens through a browser wallet |
| [Explorer ABI Discovery](guide-explorer-abi-discovery) | Auto-discover contract ABIs from Foundry artifacts so the Explorer can decode transactions and provide contract interaction UI |

## Architecture (dApp Template)

```
AppHost (Aspire Orchestrator)
│
├── PostgreSQL (Docker container)
├── DevChain (JSON-RPC Ethereum node)
├── Indexer (Worker → PostgreSQL)
├── Explorer (Blazor Server + ABI decoding + wallet)
├── WebApp (Blazor Server + EIP-6963 wallet)
└── LoadGenerator (Background transaction generator)

contracts/           Foundry project (Solidity source, tests, deploy scripts)
ContractServices/    Generated C# typed contract services
Tests/               Fast TDD with embedded DevChain
IntegrationTests/    E2E against running AppHost
```

## Troubleshooting

**PostgreSQL unhealthy on restart:** Aspire generates a random password each run but the Docker volume persists the old one. Fix:
```bash
docker volume rm nethereum-pgdata
```
Then restart the postgres resource from the Aspire dashboard.

**Explorer wallet shows "No Wallet Available":** Ensure your browser wallet extension is enabled and refresh the page. EIP-6963 wallet detection requires the Blazor SignalR circuit to be active.

**Forge commands not found:** Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```
