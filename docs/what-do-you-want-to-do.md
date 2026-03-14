---
title: What Do You Want to Do?
sidebar_label: What Do You Want to Do?
sidebar_position: 2
description: Find the right guide, skill, and NuGet packages for your task
---

# What Do You Want to Do?

Find the right guide and packages for your task. Each row links to a how-to guide and the NuGet packages you'll need.

---

## Core Foundation

| I want to... | Packages |
|---|---|
| **[Query ETH, ERC-20, and ERC-721 balances](core-foundation/guide-query-balance)** | `Nethereum.Web3` |
| **[Convert between Wei, Ether, and Gwei](core-foundation/guide-unit-conversion)** | `Nethereum.Web3` |
| **[Estimate EIP-1559 gas fees (or customize strategies)](core-foundation/guide-fee-estimation)** | `Nethereum.Web3` |
| **[Transfer Ether between addresses](core-foundation/guide-send-eth)** | `Nethereum.Web3` |
| **[Send a transaction with custom data or fees](core-foundation/guide-send-transaction)** | `Nethereum.Web3` |
| **[Query blocks, transactions, and receipts](core-foundation/guide-query-blocks)** | `Nethereum.Web3` |
| **[Understand transaction types (Legacy, EIP-1559, EIP-7702)](core-foundation/guide-transaction-models)** | `Nethereum.Web3` |
| **[Delegate EOA to a smart contract (EIP-7702)](core-foundation/guide-eip7702)** | `Nethereum.Web3` |
| **[Calculate a transaction hash before sending](core-foundation/guide-transaction-hash)** | `Nethereum.Web3` |
| **[Recover the sender address from a signed transaction](core-foundation/guide-transaction-recovery)** | `Nethereum.Web3` |
| **[Replace or speed up a pending transaction](core-foundation/guide-transaction-replacement)** | `Nethereum.Web3` |
| **[Monitor pending transactions](core-foundation/guide-pending-transactions)** | `Nethereum.Web3` |
| **[Decode function calls from transaction input data](core-foundation/guide-decode-transactions)** | `Nethereum.Web3` |
| **[ABI encode/decode (abi.encode, abi.encodePacked, EIP-712)](core-foundation/guide-abi-encoding)** | `Nethereum.Web3` |
| **[Work with hex data and conversions](core-foundation/guide-hex-encoding)** | `Nethereum.Web3` |
| **[Validate and checksum Ethereum addresses](core-foundation/guide-address-utils)** | `Nethereum.Web3` |
| **[RLP encode and decode data](core-foundation/guide-rlp-encoding)** | `Nethereum.Web3` |
| **[Choose an RPC transport (HTTP, WebSocket, IPC, System.Text.Json)](core-foundation/guide-rpc-transport)** | `Nethereum.Web3` |
| **[Stream real-time data (new blocks, pending txns, event logs)](core-foundation/guide-realtime-streaming)** | `Nethereum.JsonRpc.WebSocketStreamingClient` + `Nethereum.RPC.Reactive` |

> **Quick start**: Install `Nethereum.Web3` and follow the [First Project](./getting-started/first-project) guide. See the [Core Foundation](./core-foundation/overview) section.

---

## Signing & Key Management

| I want to... | Packages |
|---|---|
| **[Generate keys and create accounts](signing-and-key-management/guide-keys-accounts)** | `Nethereum.Web3` + `Nethereum.Accounts` |
| **[Sign and verify messages](signing-and-key-management/guide-message-signing)** | `Nethereum.Web3` |
| **[Sign EIP-712 typed structured data](signing-and-key-management/guide-eip712-signing)** | `Nethereum.Signer.EIP712` |
| **[Create and decrypt keystore files](signing-and-key-management/guide-keystore)** | `Nethereum.KeyStore` |
| **[Use HD wallets (BIP32/BIP39 mnemonic)](signing-and-key-management/guide-hd-wallets)** | `Nethereum.HdWallet` |
| **[Sign with Ledger or Trezor hardware wallets](signing-and-key-management/guide-hardware-wallets)** | `Nethereum.Signer.Ledger` / `Nethereum.Signer.Trezor` |
| **[Sign with AWS KMS or Azure Key Vault](signing-and-key-management/guide-cloud-kms)** | `Nethereum.Signer.AWSKeyManagement` / `Nethereum.Signer.AzureKeyVault` |

> See the [Signing & Key Management](./signing-and-key-management/overview) section.

---

## Smart Contracts

| I want to... | Packages |
|---|---|
| **[Deploy, call, and send transactions to contracts](smart-contracts/guide-smart-contract-interaction)** | `Nethereum.Web3` |
| **[Deploy a contract (with or without code generation)](smart-contracts/deploy-a-contract)** | `Nethereum.Web3` |
| **[Work with ERC-20 tokens (balance, transfer, approve)](smart-contracts/erc20)** | `Nethereum.Web3` |
| **[Generate C# services from Solidity ABI](smart-contracts/code-generation)** | `Nethereum.Generator.Console` |
| **[Auto-generate on build (MSBuild)](smart-contracts/code-generation)** | `Nethereum.Autogen.ContractApi` |
| **[Filter and query contract events](smart-contracts/guide-events)** | `Nethereum.Contracts` |
| **[Handle custom errors and reverts](smart-contracts/guide-error-handling)** | `Nethereum.Contracts` |
| **[Use built-in standards (ERC-20/721/1155, ENS, ERC-1271, EIP-3009)](smart-contracts/guide-built-in-standards)** | `Nethereum.Contracts` |
| **[Batch queries with Multicall or RPC batching](smart-contracts/guide-multicall)** | `Nethereum.Contracts` |
| **[Deploy to deterministic addresses with CREATE2](smart-contracts/guide-create2-deployment)** | `Nethereum.Contracts` |

> See the [Smart Contracts](./smart-contracts/overview) section.

---

## DeFi & Protocols

| I want to... | Packages |
|---|---|
| **[Swap tokens on Uniswap (V2/V3/V4)](defi/guide-uniswap-swap)** | `Nethereum.Uniswap` |
| **[Manage Uniswap liquidity positions](defi/guide-uniswap-liquidity)** | `Nethereum.Uniswap` |
| **[Use Permit2 for gasless approvals](defi/guide-uniswap-swap)** | `Nethereum.Uniswap` (includes Permit2) |
| **[Execute Gnosis Safe multi-sig transactions](defi/guide-gnosis-safe)** | `Nethereum.GnosisSafe` |
| **[Accept or pay for crypto payments (x402)](defi/guide-x402-payments)** | `Nethereum.X402` |
| **[Interact with Circles UBI protocol](defi/guide-circles)** | `Nethereum.Circles` |
| **[Authenticate with Sign-In with Ethereum (SIWE)](protocols/guide-siwe)** | `Nethereum.Siwe` |

> See the [DeFi & Protocols](./defi/overview) section.

---

## EVM Simulator

| I want to... | Packages |
|---|---|
| **[Simulate a transaction and preview state changes](evm-simulator/guide-transaction-simulation)** | `Nethereum.EVM` |
| **[Decode nested call trees (contract-to-contract calls)](evm-simulator/guide-call-tree-decoding)** | `Nethereum.EVM` |
| **[Extract and decode event logs from simulation](evm-simulator/guide-log-extraction)** | `Nethereum.EVM` |
| **[Decode revert reasons and custom errors](evm-simulator/guide-revert-decoding)** | `Nethereum.EVM` |
| **[Simulate ERC-20 transfers and approvals](evm-simulator/guide-erc20-simulation)** | `Nethereum.EVM` |
| **[Execute raw bytecode in the EVM](evm-simulator/guide-bytecode-execution)** | `Nethereum.EVM` |
| **[Debug EVM execution step-by-step](evm-simulator/guide-evm-debugging)** | `Nethereum.EVM` |
| **[Disassemble contract bytecode to opcodes](evm-simulator/guide-bytecode-disassembly)** | `Nethereum.EVM` |

> See the [EVM Simulator](./evm-simulator/overview) section.

---

## Chain Infrastructure

| I want to... | Packages |
|---|---|
| **[Build a custom chain node with block production](chain-infrastructure/guide-custom-chain-node)** | `Nethereum.CoreChain` |
| **[Implement custom storage backends](chain-infrastructure/guide-custom-storage)** | `Nethereum.CoreChain` + `Nethereum.CoreChain.RocksDB` |
| **[Add custom JSON-RPC handlers](chain-infrastructure/guide-custom-rpc-handlers)** | `Nethereum.CoreChain` |
| **[Fork a live network for local testing](chain-infrastructure/guide-forking)** | `Nethereum.CoreChain` |

> See the [Chain Infrastructure](./chain-infrastructure/overview) section.

---

## DevChain

| I want to... | Packages |
|---|---|
| **[Run a local dev chain (no external node)](devchain/devchain-quickstart)** | `Nethereum.DevChain` |
| **[Expose DevChain as HTTP for MetaMask/Foundry/Hardhat](devchain/guide-http-server)** | `Nethereum.DevChain.Server` |
| **[Write integration tests against a local chain](devchain/guide-testing-patterns)** | `Nethereum.DevChain` |
| **[Fork a live network and manipulate state/time](devchain/guide-forking-and-state)** | `Nethereum.DevChain` |
| **[Trace and debug transactions (opcode-level)](devchain/guide-debug-trace)** | `Nethereum.DevChain` |
| **Spin up a full dev environment with Aspire** | `dotnet new nethereum-devchain` template |

> See the [DevChain](./devchain/overview) section.

---

## Account Abstraction (ERC-4337 / ERC-7579)

| I want to... | Packages |
|---|---|
| **[Create and send a UserOperation](account-abstraction/guide-send-useroperation)** | `Nethereum.AccountAbstraction` |
| **[Use smart contracts with Account Abstraction](account-abstraction/guide-smart-contracts-with-aa)** | `Nethereum.AccountAbstraction` |
| **[Deploy a smart account](account-abstraction/guide-smart-account-deployment)** | `Nethereum.AccountAbstraction` |
| **[Batch operations and use paymasters](account-abstraction/guide-batching-and-paymasters)** | `Nethereum.AccountAbstraction` |
| **[Use ERC-7579 modular accounts (validators, hooks, session keys)](account-abstraction/guide-modular-accounts)** | `Nethereum.AccountAbstraction` |
| **[Run an ERC-4337 bundler](account-abstraction/guide-run-bundler)** | `Nethereum.AccountAbstraction.Bundler` + `Nethereum.AccountAbstraction.Bundler.RpcServer` |

> See the [Account Abstraction](./account-abstraction/overview) section.

---

## Data, Indexing & Explorer

| I want to... | Packages |
|---|---|
| **[Crawl blocks, transactions, and event logs](data-and-indexing/guide-blockchain-processing)** | `Nethereum.BlockchainProcessing` |
| **[Resume processing after restart / handle reorgs](data-and-indexing/guide-blockchain-processing)** | `Nethereum.BlockchainProcessing` |
| **[Index blockchain data to PostgreSQL](data-and-indexing/guide-database-storage)** | `BlockchainStore.Postgres` + `Processors.Postgres` |
| **[Index to SQL Server or SQLite](data-and-indexing/guide-database-storage)** | `BlockchainStore.SqlServer/Sqlite` + `Processors` |
| **[Run indexing as a hosted service](data-and-indexing/guide-database-storage)** | `BlockchainStorage.Processors.*` |
| **[Index internal transactions (traces)](data-and-indexing/guide-database-storage)** | `Processors.*` + debug RPC |
| **[Index ERC-20/721/1155 token transfers and balances](data-and-indexing/guide-token-indexing)** | `BlockchainStorage.Token.Postgres` |
| **[Build a blockchain explorer](data-and-indexing/guide-explorer)** | `Nethereum.Explorer` |
| **[Interact with contracts via ABI-decoded UI](data-and-indexing/guide-explorer)** | `Nethereum.Explorer` + `DataServices` |
| **[Debug EVM execution step-by-step in browser](data-and-indexing/guide-explorer)** | `Nethereum.Explorer` |
| **[Browse MUD tables in the explorer](data-and-indexing/guide-explorer)** | `Nethereum.Explorer` + `Mud.Repositories.Postgres` |

> See the [Data, Indexing & Explorer](./data-and-indexing/overview) section.

---

## MUD Framework

| I want to... | Packages |
|---|---|
| **[Understand MUD and generate C# code](mud-framework/guide-mud-quickstart)** | `Nethereum.Mud` + `Nethereum.Mud.Contracts` |
| **[Read, write, and query MUD table records](mud-framework/guide-mud-tables)** | `Nethereum.Mud` + `Nethereum.Mud.Contracts` |
| **[Index MUD Store events to PostgreSQL](mud-framework/guide-mud-indexing)** | `Nethereum.Mud.Repositories.Postgres` |
| **[Index MUD Store events with EF Core](mud-framework/guide-mud-indexing)** | `Nethereum.Mud.Repositories.EntityFramework` |
| **[Deploy a MUD World with tables and systems](mud-framework/guide-mud-deployment)** | `Nethereum.Mud.Contracts` |
| **[Query normalised MUD tables in PostgreSQL](mud-framework/guide-mud-indexing)** | `Nethereum.Mud.Repositories.Postgres` |

> See the [MUD Framework](./mud-framework/overview) section.

---

## Wallet Connectivity

| I want to... | Packages |
|---|---|
| **[Understand IEthereumHostProvider (the universal wallet abstraction)](wallet-connectivity/guide-host-providers)** | `Nethereum.UI` |

> See the [Wallet Connectivity](./wallet-connectivity/overview) section.

---

## Wallet SDK

| I want to... | Packages |
|---|---|
| **[Build a multi-platform wallet app](wallet-sdk/guide-wallet-quickstart)** | `Nethereum.Wallet` + `Nethereum.Wallet.UI.Components` + renderer (`.Blazor` / `.Maui`) |
| **[Understand the MVVM wallet architecture](wallet-sdk/guide-wallet-architecture)** | `Nethereum.Wallet.UI.Components` |
| **[Create accounts (mnemonic, private key, vault encryption)](wallet-sdk/guide-wallet-accounts)** | `Nethereum.Wallet` |
| **[Send transactions with EVM simulation preview](wallet-sdk/guide-wallet-transactions)** | `Nethereum.Wallet` + `Nethereum.EVM` |
| **[Use the wallet as an EIP-1193 RPC provider for dApps](wallet-sdk/guide-wallet-rpc-provider)** | `Nethereum.Wallet.RpcRequests` |
| **Integrate hardware wallets in wallet UI** | `Nethereum.Wallet.UI.Components.Trezor` + `.Blazor.Trezor` |
| **Use Ledger/Trezor on Android** | `Nethereum.Maui.AndroidUsb` |

> See the [Wallet SDK](./wallet-sdk/overview) section.

---

## Web (Blazor) dApp Integration

| I want to... | Packages |
|---|---|
| **[Connect browser wallets in Blazor (EIP-6963, MetaMask, WalletConnect)](blazor-dapp-integration/guide-blazor-wallet-connect)** | `Nethereum.Blazor` + `Nethereum.EIP6963WalletInterop` |
| **[Authenticate with SIWE in Blazor](blazor-dapp-integration/guide-blazor-authentication)** | `Nethereum.Siwe` + `Nethereum.Blazor` |
| **[Interact with any contract dynamically (no codegen)](blazor-dapp-integration/guide-blazor-contract-interaction)** | `Nethereum.Blazor` |
| **[Debug Solidity step-by-step in browser](blazor-dapp-integration/guide-blazor-solidity-debugger)** | `Nethereum.Blazor.Solidity` |
| **Connect via WalletConnect / Reown** | `Nethereum.WalletConnect` / `Nethereum.Reown.AppKit.Blazor` |

> See the [Web (Blazor) dApp Integration](./blazor-dapp-integration/overview) section.

---

## Unity

| I want to... | Packages |
|---|---|
| **[Get started with Ethereum in Unity](unity/guide-unity-quickstart)** | `Nethereum.Unity` |
| **[Connect browser wallets in Unity WebGL](unity/guide-unity-wallets)** | `Nethereum.Unity.EIP6963` + `Nethereum.Unity.Metamask` |
| **[Deploy and interact with smart contracts in Unity](unity/guide-unity-smart-contracts)** | `Nethereum.Unity` |
| **[Share contract code between Unity and .NET](unity/guide-unity-code-generation)** | `Nethereum.Generator.Console` |

> See the [Unity](./unity/overview) section.

---

## Data Services

| I want to... | Packages |
|---|---|
| **[Scan token balances via multicall (no indexer needed)](data-services/guide-token-portfolio)** | `Nethereum.TokenServices` |
| **[Get token balances with CoinGecko prices](data-services/guide-token-portfolio)** | `Nethereum.TokenServices` |
| **[Fetch ABI from Etherscan or Sourcify with automatic fallback](data-services/guide-abi-retrieval)** | `Nethereum.DataServices` |
| **[Look up function/event signatures (4Byte)](data-services/guide-abi-retrieval)** | `Nethereum.DataServices` |
| **[Discover RPC endpoints and chain metadata from Chainlist](data-services/guide-chainlist-rpc)** | `Nethereum.DataServices` |
| **[Query gas prices and account transactions from Etherscan](data-services/guide-etherscan-api)** | `Nethereum.DataServices` |
| **[Get token prices and metadata from CoinGecko](data-services/guide-coingecko-api)** | `Nethereum.DataServices` |
| **[Store Sourcify data locally in PostgreSQL](data-services/nethereum-sourcify-database)** | `Nethereum.Sourcify.Database` |

> See the [Data Services](./data-services/overview) section.

---

## Consensus Light Client

| I want to... | Packages |
|---|---|
| **[Verify ETH balances without trusting RPC](consensus-light-client/guide-verified-state)** | `Nethereum.ChainStateVerification` + `Nethereum.Consensus.LightClient` |
| **[Track finalized beacon headers](consensus-light-client/guide-light-client)** | `Nethereum.Consensus.LightClient` + `Nethereum.Signer.Bls.Herumi` |
| **[Verify storage proofs and contract code](consensus-light-client/guide-verified-state)** | `Nethereum.ChainStateVerification` |
| **Query Beacon Chain REST API** | `Nethereum.Beaconchain` |
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

## AppChains (Preview)

| I want to... | Packages |
|---|---|
| **[Launch a sequencer and deploy contracts](application-chain/guide-appchain-quickstart)** | `Nethereum.AppChain.Server` |
| **[Use AppChainBuilder for embedded/testing](application-chain/guide-appchain-quickstart)** | `Nethereum.AppChain.Sequencer` |
| **[Configure RocksDB persistent storage](application-chain/guide-appchain-storage)** | `Nethereum.CoreChain.RocksDB` |
| **[Sync follower nodes and verify state](application-chain/guide-appchain-sync)** | `Nethereum.AppChain.Sync` |
| **Configure P2P networking between nodes** | `Nethereum.AppChain.P2P` |
| **Anchor AppChain state to L1** | `Nethereum.AppChain.Anchoring` |

> See the [AppChains](./application-chain/overview) section.

---

## Not sure where to start?

- **New to Nethereum?** Start with [Getting Started](./getting-started/welcome)
- **Looking for a specific package?** Check the [Component Catalog](./component-catalog)
- **Want to understand the architecture?** See the [Architecture Map](./architecture)
- **Want to try code interactively?** Visit the [Playground](http://playground.nethereum.com)
