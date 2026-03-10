---
title: What Do You Want to Do?
sidebar_label: What Do You Want to Do?
sidebar_position: 2
description: Find the right guide, skill, and NuGet packages for your task
---

# What Do You Want to Do?

Find the right guide and packages for your task. Each row links to a how-to guide and the NuGet packages you'll need.

---

## Basics

| I want to... | Packages |
|---|---|
| **Send ETH and interact with contracts** | `Nethereum.Web3` |
| **Work with ERC-20/721/1155 tokens** | `Nethereum.Web3` (includes typed services) |
| **Query blocks and transactions** | `Nethereum.Web3` |
| **Listen to events in real-time** | `Nethereum.Web3` |
| **Use WebSocket subscriptions** | `Nethereum.JsonRpc.WebSocketStreamingClient` + `Nethereum.RPC.Reactive` |
| **Use System.Text.Json / AOT-friendly RPC** | `Nethereum.JsonRpc.SystemTextJsonRpcClient` |

> **Quick start**: Install `Nethereum.Web3` and follow the [First Project](./getting-started/first-project) guide.

---

## Signing & Key Management

| I want to... | Packages |
|---|---|
| **Sign a message and verify it** | `Nethereum.Web3` + `Nethereum.Accounts` |
| **Create an HD wallet from a mnemonic** | `Nethereum.HdWallet` |
| **Create and decrypt a keystore file** | `Nethereum.KeyStore` |
| **Sign with a Ledger or Trezor** | `Nethereum.Signer.Ledger` / `Nethereum.Signer.Trezor` |
| **Sign EIP-712 typed data** | `Nethereum.Signer.EIP712` |
| **Use AWS KMS or Azure Key Vault** | `Nethereum.Signer.AWSKeyManagement` / `Nethereum.Signer.AzureKeyVault` |

> See the [Signing & Key Management](./signing-and-key-management/overview) section.

---

## Smart Contracts

| I want to... | Packages |
|---|---|
| **Deploy a smart contract** | `Nethereum.Web3` + `Nethereum.Contracts` |
| **Generate C# services from Solidity ABI** | `Nethereum.Generator.Console` |
| **Auto-generate on build (MSBuild)** | `Nethereum.Autogen.ContractApi` |
| **Call contract functions and decode results** | `Nethereum.Web3` |
| **Use Multicall for batch queries** | `Nethereum.Contracts` |
| **Filter & query contract events** | `Nethereum.Contracts` |
| **Handle contract errors & reverts** | `Nethereum.Contracts` |
| **Resolve an ENS name** | `Nethereum.Contracts` (built-in ENS) |
| **Implement Sign-In with Ethereum (SIWE)** | `Nethereum.Siwe` |

> See the [Smart Contracts](./smart-contracts/overview) section.

---

## Local Development

| I want to... | Packages |
|---|---|
| **Run a local dev chain (no external node)** | `Nethereum.DevChain` |
| **Expose DevChain as HTTP for MetaMask/Foundry** | `Nethereum.DevChain.Server` |
| **Spin up a full dev environment with Aspire** | `dotnet new nethereum-devchain` template |
| **Simulate EVM execution in-process** | `Nethereum.EVM` |
| **Preview transaction state changes** | `Nethereum.EVM` |

> See the [DevChain](./devchain/overview) and [EVM Simulator](./evm-simulator/overview) sections.

---

## AppChains

| I want to... | Packages |
|---|---|
| **Run a custom AppChain** | `Nethereum.AppChain.Server` |
| **Configure P2P networking between nodes** | `Nethereum.AppChain.P2P` |
| **Anchor AppChain state to L1** | `Nethereum.AppChain.Anchoring` |
| **Deploy MUD World on an AppChain** | `Nethereum.AppChain` + `Nethereum.Mud.Contracts` |

> See the [AppChains](./application-chain/overview) section.

---

## Data, Indexing & Explorer

| I want to... | Packages |
|---|---|
| **Index blockchain data to a database** | `Nethereum.BlockchainProcessing` + storage provider |
| **Index ERC-20 transfers to PostgreSQL** | `Nethereum.BlockchainStorage.Token.Postgres` |
| **Build a blockchain explorer** | `Nethereum.Explorer` |
| **Scan token balances across wallets** | `Nethereum.TokenServices` |

> See the [Data, Indexing & Explorer](./data-and-indexing/overview) section.

---

## Data Services

| I want to... | Packages |
|---|---|
| **Fetch ABI from Etherscan or Sourcify** | `Nethereum.DataServices` |
| **Look up function/event signatures (4Byte)** | `Nethereum.DataServices` |
| **Get chain metadata and RPC endpoints** | `Nethereum.DataServices` |
| **Get token prices, metadata, and logos** | `Nethereum.TokenServices` |

> See the [Data Services](./data-services/overview) section.

---

## DeFi & Protocols

| I want to... | Packages |
|---|---|
| **Swap tokens on Uniswap (V2/V3/V4)** | `Nethereum.Uniswap` |
| **Use Permit2 for gasless approvals** | `Nethereum.Uniswap` (includes Permit2) |
| **Accept crypto payments in my API (x402)** | `Nethereum.X402` |
| **Pay for x402-protected API endpoints** | `Nethereum.X402` |
| **Execute a Gnosis Safe multi-sig transaction** | `Nethereum.GnosisSafe` |
| **Interact with Circles UBI protocol** | `Nethereum.Circles` |

> See the [DeFi & Protocols](./defi/overview) section.

---

## Account Abstraction (ERC-4337 / ERC-7579)

| I want to... | Packages |
|---|---|
| **Create and send a UserOperation** | `Nethereum.AccountAbstraction` |
| **Build an ERC-4337 bundler** | `Nethereum.AccountAbstraction.Bundler` |
| **Run a bundler RPC server** | `Nethereum.AccountAbstraction.Bundler.RpcServer` |
| **Deploy ERC-7579 modular smart accounts** | `Nethereum.AccountAbstraction` |
| **Use session keys on AppChains** | `Nethereum.AccountAbstraction.AppChain` |

> See the [Account Abstraction](./account-abstraction/overview) section.

---

## MUD (Autonomous Worlds)

| I want to... | Packages |
|---|---|
| **Work with MUD World systems and tables** | `Nethereum.Mud` + `Nethereum.Mud.Contracts` |
| **Index MUD store records to PostgreSQL** | `Nethereum.Mud.Repositories.Postgres` |
| **Query normalised MUD tables** | `Nethereum.Mud` |
| **Build MUD table UIs in Blazor** | `Nethereum.MudBlazorComponents` |

> See the [MUD Framework](./mud-framework/overview) section.

---

## Wallet & UI

| I want to... | Packages |
|---|---|
| **Build a Blazor dApp with MetaMask** | `Nethereum.Blazor` + `Nethereum.Metamask.Blazor` |
| **Integrate browser wallets (EIP-6963)** | `Nethereum.EIP6963WalletInterop` |
| **Connect via WalletConnect / Reown** | `Nethereum.WalletConnect` / `Nethereum.Reown.AppKit.Blazor` |
| **Build a multi-platform wallet app** | `Nethereum.Wallet` + UI renderer package |
| **Interact with any contract dynamically** | `Nethereum.Blazor` |
| **Debug EVM in browser (Solidity step-through)** | `Nethereum.Blazor.Solidity` |

> See the [Wallet & UI](./wallet-and-ui/overview) section.

---

## Unity

| I want to... | Packages |
|---|---|
| **Build a Unity game with Ethereum** | `Nethereum.Unity` |
| **Integrate browser wallets in Unity WebGL (EIP-6963)** | `Nethereum.Unity.EIP6963` |
| **Use MetaMask in Unity** | `Nethereum.Unity.Metamask` |

---

## Consensus Light Client

| I want to... | Packages |
|---|---|
| **Verify beacon chain state via light client** | `Nethereum.Consensus.LightClient` + `Nethereum.Signer.Bls.Herumi` |
| **Query Beacon Chain REST API** | `Nethereum.Beaconchain` |
| **Verify on-chain state with light client proofs** | `Nethereum.ChainStateVerification` |
| **Serialize consensus-layer types (SSZ)** | `Nethereum.Consensus.Ssz` + `Nethereum.SSZ` |

> See the [Consensus Light Client](./consensus-light-client/overview) section.

---

## Client Extensions

| I want to... | Packages |
|---|---|
| **Use Geth admin and debug APIs** | `Nethereum.Geth` |
| **Use Besu-specific APIs** | `Nethereum.Besu` |
| **Use Quorum privacy features** | `Nethereum.Quorum` |

> See the [Client Extensions](./client-extensions/overview) section.

---

## Not sure where to start?

- **New to Nethereum?** Start with [Getting Started](./getting-started/welcome)
- **Looking for a specific package?** Check the [Component Catalog](./component-catalog)
- **Want to understand the architecture?** See the [Architecture Map](./architecture)
- **Want to try code interactively?** Visit the [Playground](http://playground.nethereum.com)
