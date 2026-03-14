---
title: Component Catalog
sidebar_label: Component Catalog
sidebar_position: 0
description: Complete catalog of all 130+ Nethereum packages organized by use case
---

# Component Catalog

Nethereum provides **130+ packages** covering the full Ethereum development stack. This page helps you find the right package for your use case.

## Quick Start by Use Case

| I want to... | Packages |
|---|---|
| **Basics** | |
| Send ETH and interact with contracts | [`Nethereum.Web3`](core-foundation/nethereum-web3) |
| Work with ERC-20, ERC-721, or ERC-1155 tokens | [`Nethereum.Web3`](core-foundation/nethereum-web3) (includes typed contract services for all major standards) |
| **Signing & Key Management** | |
| Sign transactions offline | [`Nethereum.Web3`](core-foundation/nethereum-web3) + [`Nethereum.Accounts`](core-foundation/nethereum-accounts) |
| Use an HD wallet (BIP32/BIP39) | [`Nethereum.HDWallet`](signing-and-key-management/nethereum-hdwallet) |
| Sign with Trezor or Ledger | [`Nethereum.Signer.Trezor`](signing-and-key-management/nethereum-signer-trezor) or [`Nethereum.Signer.Ledger`](signing-and-key-management/nethereum-signer-ledger) |
| Sign with AWS KMS or Azure Key Vault | [`Nethereum.Signer.AWSKeyManagement`](signing-and-key-management/nethereum-signer-awskeymanagement) or [`Nethereum.Signer.AzureKeyVault`](signing-and-key-management/nethereum-signer-azurekeyvault) |
| Sign EIP-712 typed data | [`Nethereum.Signer.EIP712`](signing-and-key-management/nethereum-signer-eip712) |
| **Local Development** | |
| Run a local dev chain (no external node) | [`Nethereum.DevChain.Server`](devchain/nethereum-devchain-server) |
| Simulate EVM execution in-process | [`Nethereum.EVM`](evm-simulator/nethereum-evm) |
| Preview transaction state changes before signing | `Nethereum.Wallet` + [`Nethereum.EVM`](evm-simulator/nethereum-evm) |
| Spin up a full dev environment with Aspire | `dotnet new nethereum-devchain` template |
| **Code Generation** | |
| Generate C# contract services from Solidity ABI | `Nethereum.Generator.Console` (CLI) or VS Code Solidity extension |
| Generate UI components from contract definitions | `Nethereum.Generator.Console` (CLI) or VS Code Solidity extension |
| Generate MUD table services and queries | `Nethereum.Generator.Console` (CLI) or VS Code Solidity extension |
| **Data & Indexing** | |
| Crawl blocks, transactions, and event logs | [`Nethereum.BlockchainProcessing`](data-and-indexing/nethereum-blockchainprocessing) |
| Index blockchain data to PostgreSQL/SqlServer/SQLite | [`Nethereum.BlockchainProcessing`](data-and-indexing/nethereum-blockchainprocessing) + [`store provider`](data-and-indexing/nethereum-blockchainstore-postgres) |
| Index ERC-20/721/1155 token transfers and balances | [`Nethereum.BlockchainStorage.Token.Postgres`](data-and-indexing/nethereum-blockchainstorage-token-postgres) |
| Build a blockchain explorer | [`Nethereum.Explorer`](data-and-indexing/nethereum-explorer) |
| Debug EVM execution in a browser UI | [`Nethereum.Explorer`](data-and-indexing/nethereum-explorer) (EVM debugger) |
| Scan thousands of known tokens against a wallet via multicall (no indexer) | [`Nethereum.TokenServices`](data-services/nethereum-tokenservices) |
| Get token balances with CoinGecko prices | [`Nethereum.TokenServices`](data-services/nethereum-tokenservices) |
| Fetch ABI from Sourcify or Etherscan with automatic fallback | [`Nethereum.DataServices`](data-services/nethereum-dataservices) |
| Discover RPC endpoints and chain metadata from Chainlist | [`Nethereum.DataServices`](data-services/nethereum-dataservices) |
| Query gas prices, account transactions from Etherscan | [`Nethereum.DataServices`](data-services/nethereum-dataservices) |
| Get token prices and metadata from CoinGecko | [`Nethereum.DataServices`](data-services/nethereum-dataservices) |
| Store Sourcify data locally in PostgreSQL | [`Nethereum.Sourcify.Database`](data-services/nethereum-sourcify-database) |
| **DeFi & Protocols** | |
| Swap tokens on Uniswap (V2/V3/V4) | [`Nethereum.Uniswap`](defi/nethereum-uniswap) |
| Use Permit2 for gasless token approvals | [`Nethereum.Uniswap`](defi/nethereum-uniswap) (includes Permit2) |
| Accept crypto payments in my API (x402) | [`Nethereum.X402`](defi/nethereum-x402) |
| Resolve ENS names | [`Nethereum.Contracts`](core-foundation/nethereum-contracts) (includes ENS) |
| Implement Sign-In with Ethereum | [`Nethereum.Siwe`](https://www.nuget.org/packages/Nethereum.Siwe) |
| Use Gnosis Safe multi-sig | [`Nethereum.GnosisSafe`](protocols/nethereum-gnosissafe) |
| **Account Abstraction** | |
| Use smart accounts (ERC-4337 UserOps) | [`Nethereum.AccountAbstraction`](account-abstraction/nethereum-accountabstraction) |
| Build an ERC-4337 bundler | [`Nethereum.AccountAbstraction.Bundler`](account-abstraction/nethereum-accountabstraction-bundler) |
| Run a bundler RPC server | [`Nethereum.AccountAbstraction.Bundler.RpcServer`](account-abstraction/nethereum-accountabstraction-bundler-rpcserver) |
| Deploy ERC-7579 modular smart accounts | [`Nethereum.AccountAbstraction`](account-abstraction/nethereum-accountabstraction) |
| **MUD (Autonomous Worlds)** | |
| Work with MUD World systems and tables | [`Nethereum.Mud`](mud-framework/nethereum-mud) + [`Nethereum.Mud.Contracts`](mud-framework/nethereum-mud-contracts) |
| Index and normalise MUD store records to Postgres | [`Nethereum.Mud.Repositories.Postgres`](mud-framework/nethereum-mud-repositories-postgres) |
| Query normalised MUD tables with predicates | [`Nethereum.Mud`](mud-framework/nethereum-mud) |
| Build MUD table UIs in Blazor | [`Nethereum.MudBlazorComponents`](mud-framework/nethereum-mudblazorcomponents) |
| **Wallet SDK** | |
| Build a multi-platform wallet app | [`Nethereum.Wallet`](wallet-sdk/nethereum-wallet) + [`UI.Components`](wallet-sdk/nethereum-wallet-ui-components) + renderer (`.Blazor` / `.Maui`) |
| **Web (Blazor) dApp Integration** | |
| Integrate browser wallets in Blazor (EIP-6963) | [`Nethereum.Blazor`](blazor-dapp-integration/nethereum-blazor) |
| Connect via WalletConnect / Reown | [`Nethereum.WalletConnect`](blazor-dapp-integration/nethereum-walletconnect) or [`Nethereum.Reown.AppKit.Blazor`](blazor-dapp-integration/nethereum-reown-appkit-blazor) |
| Interact with any contract dynamically (no codegen) | [`Nethereum.Blazor`](blazor-dapp-integration/nethereum-blazor) |
| **Unity** | |
| Build a Unity game with Ethereum | [`Nethereum.Unity`](unity/nethereum-unity) — [Quickstart guide](unity/guide-unity-quickstart) |
| Connect browser wallets in WebGL | [`Nethereum.Unity.EIP6963`](unity/nethereum-unity-eip6963) — [Wallets guide](unity/guide-unity-wallets) |
| Deploy and interact with contracts in Unity | [`Nethereum.Unity`](unity/nethereum-unity) — [Smart Contracts guide](unity/guide-unity-smart-contracts) |
| **Verification & Cryptography** | |
| [Verify ETH balances without trusting RPC](consensus-light-client/guide-verified-state) | `Nethereum.ChainStateVerification` + `Nethereum.Consensus.LightClient` |
| [Track finalized beacon headers](consensus-light-client/guide-light-client) | `Nethereum.Consensus.LightClient` + [`Nethereum.Signer.Bls.Herumi`](signing-and-key-management/nethereum-signer-bls-herumi) |
| [Verify storage proofs and contract code](consensus-light-client/guide-verified-state) | `Nethereum.ChainStateVerification` |
| Calculate Merkle proofs and state roots | [`Nethereum.Merkle`](consensus-and-cryptography/nethereum-merkle) + [`Nethereum.Merkle.Patricia`](consensus-and-cryptography/nethereum-merkle-patricia) |
| **Infrastructure** | |
| Run a custom AppChain | [`Nethereum.AppChain`](application-chain/nethereum-appchain) (Preview) |
| Use System.Text.Json / AOT-friendly RPC | [`Nethereum.JsonRpc.SystemTextJsonRpcClient`](json-rpc-transport/nethereum-jsonrpc-systemtextjsonrpcclient) |
| Stream real-time data via WebSocket subscriptions | [`Nethereum.JsonRpc.WebSocketStreamingClient`](json-rpc-transport/nethereum-jsonrpc-websocketstreamingclient) |

---

## All Packages by Category

### Core Foundation

| Package | Description |
|---|---|
| [Nethereum.Web3](core-foundation/nethereum-web3) | High-level entry point aggregating RPC, contracts, accounts, and signing |
| [Nethereum.ABI](core-foundation/nethereum-abi) | ABI encoding/decoding for functions, events, errors, and complex types |
| [Nethereum.Contracts](core-foundation/nethereum-contracts) | Smart contract interaction: deployment, calls, events, multicall, typed services (ERC-20/721/1155/ENS) |
| [Nethereum.Accounts](core-foundation/nethereum-accounts) | Account types, transaction managers, and nonce management |
| [Nethereum.Model](core-foundation/nethereum-model) | Block headers, transaction types (Legacy through EIP-7702), RLP encoding |
| [Nethereum.Hex](core-foundation/nethereum-hex) | Hex types and conversion utilities |
| [Nethereum.RLP](core-foundation/nethereum-rlp) | Recursive Length Prefix encoding/decoding |
| [Nethereum.Util](core-foundation/nethereum-util) | Keccak-256, unit conversion, address checksumming, Poseidon hasher |
| [Nethereum.RPC](core-foundation/nethereum-rpc) | Typed wrappers for `eth_*`, `web3_*`, `net_*`, `debug_*` RPC methods |

### JSON-RPC Transport

| Package | Description |
|---|---|
| [Nethereum.JsonRpc.Client](json-rpc-transport/nethereum-jsonrpc-client) | Base RPC client abstractions and interceptor pipeline |
| [Nethereum.JsonRpc.RpcClient](json-rpc-transport/nethereum-jsonrpc-rpcclient) | HTTP JSON-RPC client (Newtonsoft.Json) |
| [Nethereum.JsonRpc.SystemTextJsonRpcClient](json-rpc-transport/nethereum-jsonrpc-systemtextjsonrpcclient) | HTTP JSON-RPC client (System.Text.Json, AOT-friendly) |
| [Nethereum.JsonRpc.IpcClient](json-rpc-transport/nethereum-jsonrpc-ipcclient) | IPC client (Windows named pipes, Unix domain sockets) |
| [Nethereum.JsonRpc.WebSocketClient](json-rpc-transport/nethereum-jsonrpc-websocketclient) | WebSocket JSON-RPC client |
| [Nethereum.JsonRpc.WebSocketStreamingClient](json-rpc-transport/nethereum-jsonrpc-websocketstreamingclient) | Streaming WebSocket for `eth_subscribe` / `eth_unsubscribe` |

### Signing & Key Management

| Package | Description |
|---|---|
| [Nethereum.Signer](signing-and-key-management/nethereum-signer) | ECDSA signing for all transaction types |
| [Nethereum.Signer.EIP712](signing-and-key-management/nethereum-signer-eip712) | EIP-712 typed structured data signing |
| [Nethereum.KeyStore](signing-and-key-management/nethereum-keystore) | Web3 Secret Storage (keystore files) encryption/decryption |
| [Nethereum.HDWallet](signing-and-key-management/nethereum-hdwallet) | BIP32/BIP39/BIP44 HD wallet derivation |
| [Nethereum.Signer.Ledger](signing-and-key-management/nethereum-signer-ledger) | Ledger hardware wallet signing |
| [Nethereum.Signer.Trezor](signing-and-key-management/nethereum-signer-trezor) | Trezor hardware wallet signing |
| [Nethereum.Signer.AWSKeyManagement](signing-and-key-management/nethereum-signer-awskeymanagement) | AWS KMS-based signing |
| [Nethereum.Signer.AzureKeyVault](signing-and-key-management/nethereum-signer-azurekeyvault) | Azure Key Vault-based signing |

### Protocols

| Package | Description |
|---|---|
| [Nethereum.ENS](https://www.nuget.org/packages/Nethereum.ENS) | Ethereum Name Service: resolution, registration, reverse lookup |
| [Nethereum.GnosisSafe](protocols/nethereum-gnosissafe) | Safe multi-signature wallet interaction |
| [Nethereum.Siwe](https://www.nuget.org/packages/Nethereum.Siwe) | Sign-In with Ethereum (EIP-4361) |
| [Nethereum.Circles](protocols/nethereum-circles) | Circles UBI protocol |
| [Nethereum.GSN](protocols/nethereum-gsn) | Gas Station Network meta-transaction relay |

### DeFi

| Package | Description |
|---|---|
| [Nethereum.Uniswap](defi/nethereum-uniswap) | Uniswap DEX (V2/V3/V4) + Permit2 |
| [Nethereum.X402](defi/nethereum-x402) | HTTP 402 Payment Required protocol for pay-per-request APIs |

### EVM Simulator

| Package | Description |
|---|---|
| [Nethereum.EVM](evm-simulator/nethereum-evm) | Full EVM simulator: all opcodes through Prague, tracing, debugging |

### DevChain

| Package | Description |
|---|---|
| [Nethereum.CoreChain](devchain/nethereum-corechain) | Full in-process node: RPC handlers, state management, block production, WebSocket subscriptions |
| [Nethereum.CoreChain.RocksDB](devchain/nethereum-corechain-rocksdb) | RocksDB persistent storage |
| [Nethereum.DevChain](devchain/nethereum-devchain) | Development chain: pre-funded accounts, auto-mine, SQLite, time manipulation |
| [Nethereum.DevChain.Server](devchain/nethereum-devchain-server) | HTTP server for DevChain (MetaMask/Foundry/Hardhat compatible) |

### Account Abstraction (ERC-4337 / ERC-7579)

| Package | Description |
|---|---|
| [Nethereum.AccountAbstraction](account-abstraction/nethereum-accountabstraction) | UserOperation creation, encoding, gas estimation, validation |
| [Nethereum.AccountAbstraction.Bundler](account-abstraction/nethereum-accountabstraction-bundler) | Full bundler: mempool, reputation, BLS aggregation, bundle submission |
| [Nethereum.AccountAbstraction.Bundler.RpcServer](account-abstraction/nethereum-accountabstraction-bundler-rpcserver) | Bundler JSON-RPC server |
| [Nethereum.AccountAbstraction.SimpleAccount](account-abstraction/nethereum-accountabstraction-simpleaccount) | SimpleAccount factory interaction |

### Data Processing & Storage

| Package | Description |
|---|---|
| [Nethereum.BlockchainProcessing](data-and-indexing/nethereum-blockchainprocessing) | Block/transaction/log crawling pipeline with progress tracking and reorg detection |
| [Nethereum.BlockchainStore.EFCore](data-and-indexing/nethereum-blockchainstore-efcore) | EF Core storage abstraction: entity models, repository interfaces, reorg handling |
| [Nethereum.BlockchainStore.Postgres](data-and-indexing/nethereum-blockchainstore-postgres) | PostgreSQL storage provider |
| [Nethereum.BlockchainStore.SqlServer](data-and-indexing/nethereum-blockchainstore-sqlserver) | SQL Server storage provider |
| [Nethereum.BlockchainStore.Sqlite](data-and-indexing/nethereum-blockchainstore-sqlite) | SQLite storage provider |
| [Nethereum.BlockchainStorage.Processors](data-and-indexing/nethereum-blockchainstorage-processors) | Hosted services for continuous indexing with retry and chain validation |
| [Nethereum.BlockchainStorage.Token.Postgres](data-and-indexing/nethereum-blockchainstorage-token-postgres) | ERC-20/721/1155 transfer indexing, balance aggregation, NFT inventory |
| [Nethereum.Explorer](data-and-indexing/nethereum-explorer) | Blazor Server blockchain explorer with ABI decoding, token pages, EVM debugger, MUD browser |
| [Nethereum.DataServices](data-services/nethereum-dataservices) | Etherscan, Sourcify, CoinGecko, 4Byte, Chainlist API clients + composite ABI retrieval |
| [Nethereum.Sourcify.Database](data-services/nethereum-sourcify-database) | Local Sourcify storage in PostgreSQL (EF Core) |
| [Nethereum.TokenServices](data-services/nethereum-tokenservices) | Token portfolio: multicall balances over known token lists, CoinGecko pricing, multi-account scanning |

### MUD Framework

| Package | Description |
|---|---|
| [Nethereum.Mud](mud-framework/nethereum-mud) | MUD client: table schemas, record encoding, store subscriptions, predicate queries |
| [Nethereum.Mud.Contracts](mud-framework/nethereum-mud-contracts) | MUD World/Store contract services and event processing |
| [Nethereum.Mud.Repositories.EntityFramework](mud-framework/nethereum-mud-repositories-entityframework) | EF Core repository for MUD store records |
| [Nethereum.Mud.Repositories.Postgres](mud-framework/nethereum-mud-repositories-postgres) | PostgreSQL MUD store with normalisation and background processing |
| [Nethereum.MudBlazorComponents](mud-framework/nethereum-mudblazorcomponents) | Blazor UI for MUD table interaction |

### Wallet SDK

| Package | Description |
|---|---|
| [Nethereum.UI](wallet-connectivity/nethereum-ui) | Abstract `IEthereumHostProvider`, SIWE authenticator, validation helpers |
| [Nethereum.Wallet](wallet-sdk/nethereum-wallet) | Core wallet: accounts, vaults, chain config, HD wallets, dApp management |
| [Nethereum.Wallet.RpcRequests](wallet-sdk/nethereum-wallet-rpcrequests) | EIP-1193 JSON-RPC handlers |
| [Nethereum.Wallet.UI.Components](wallet-sdk/nethereum-wallet-ui-components) | Cross-platform MVVM ViewModels |
| [Nethereum.Wallet.UI.Components.Trezor](wallet-sdk/nethereum-wallet-ui-components-trezor) | Trezor hardware wallet ViewModels |
| [Nethereum.Wallet.UI.Components.Blazor](wallet-sdk/nethereum-wallet-ui-components-blazor) | Blazor/MudBlazor renderer |
| [Nethereum.Wallet.UI.Components.Blazor.Trezor](wallet-sdk/nethereum-wallet-ui-components-blazor-trezor) | Blazor Trezor components |
| [Nethereum.Wallet.UI.Components.Maui](wallet-sdk/nethereum-wallet-ui-components-maui) | .NET MAUI renderer |
| [Nethereum.Maui.AndroidUsb](wallet-sdk/nethereum-maui-androidusb) | Android USB for Ledger/Trezor on MAUI |

### Web (Blazor) dApp Integration

| Package | Description |
|---|---|
| [Nethereum.Blazor](blazor-dapp-integration/nethereum-blazor) | EIP-6963 wallet discovery, auth state, dynamic contract interaction |
| [Nethereum.EIP6963WalletInterop](blazor-dapp-integration/nethereum-eip6963walletinterop) | EIP-6963 JavaScript interop core |
| [Nethereum.Metamask](blazor-dapp-integration/nethereum-metamask) | MetaMask wallet provider |
| [Nethereum.Metamask.Blazor](blazor-dapp-integration/nethereum-metamask-blazor) | MetaMask Blazor interop component |
| [Nethereum.WalletConnect](blazor-dapp-integration/nethereum-walletconnect) | WalletConnect v2 protocol |
| [Nethereum.Reown.AppKit.Blazor](blazor-dapp-integration/nethereum-reown-appkit-blazor) | Reown AppKit modal for Blazor |
| [Nethereum.Blazor.Solidity](blazor-dapp-integration/nethereum-blazor-solidity) | In-browser Solidity step-through debugger |

### Unity

| Package | Description |
|---|---|
| [Nethereum.Unity](unity/nethereum-unity) | Unity game engine integration |
| [Nethereum.Unity.EIP6963](unity/nethereum-unity-eip6963) | EIP-6963 wallet discovery for Unity WebGL |
| [Nethereum.Unity.Metamask](unity/nethereum-unity-metamask) | MetaMask integration for Unity WebGL |

### AppChains (Preview)

| Package | Description |
|---|---|
| [Nethereum.AppChain](application-chain/nethereum-appchain) | AppChain core |
| [Nethereum.AppChain.Server](application-chain/nethereum-appchain-server) | HTTP server for AppChains |
| [Nethereum.AppChain.Sequencer](application-chain/nethereum-appchain-sequencer) | Transaction ordering and sequencing |
| [Nethereum.AppChain.Sync](application-chain/nethereum-appchain-sync) | Multi-node state synchronisation |
| [Nethereum.AppChain.P2P](application-chain/nethereum-appchain-p2p) | P2P networking abstractions |
| [Nethereum.AppChain.Policy](application-chain/nethereum-appchain-policy) | Governance, validation, and access policies |
| [Nethereum.AppChain.Anchoring](application-chain/nethereum-appchain-anchoring) | L1 anchoring for state commitment |
| [Nethereum.Consensus.Clique](application-chain/nethereum-consensus-clique) | Clique Proof-of-Authority consensus |

### Consensus & Cryptography

| Package | Description |
|---|---|
| [Nethereum.Merkle](consensus-and-cryptography/nethereum-merkle) | Merkle tree implementations (standard, incremental, frontier) |
| [Nethereum.Merkle.Patricia](consensus-and-cryptography/nethereum-merkle-patricia) | Modified Merkle Patricia Trie |
| [Nethereum.Ssz](consensus-and-cryptography/nethereum-ssz) | Simple Serialize (SSZ) encoding |
| [Nethereum.Signer.Bls.Herumi](signing-and-key-management/nethereum-signer-bls-herumi) | BLS signatures via Herumi |

### Consensus Light Client

| Package | Description |
|---|---|
| [Nethereum.Consensus.LightClient](consensus-and-cryptography/nethereum-consensus-lightclient) | Beacon chain light client: sync committee tracking, header verification, finality proofs |
| [Nethereum.ChainStateVerification](data-and-indexing/nethereum-chainstateverification) | Verified state queries: account balances, storage proofs, contract code without trusting RPC |
| [Nethereum.Beaconchain](consensus-light-client/nethereum-beaconchain) | Beacon Chain REST API client |
| [Nethereum.Consensus.Ssz](consensus-and-cryptography/nethereum-consensus-ssz) | Consensus-layer SSZ type serialization |
| [Nethereum.SSZ](consensus-and-cryptography/nethereum-ssz) | Simple Serialize (SSZ) encoding |

### Client Extensions

| Package | Description |
|---|---|
| [Nethereum.Geth](client-extensions/nethereum-geth) | Geth-specific RPC methods |
| [Nethereum.Besu](client-extensions/nethereum-besu) | Hyperledger Besu-specific RPC methods |

---

## Supported Platforms

| Target | Scope |
|---|---|
| netstandard 2.0, net451, net461, net6.0, net8.0, net9.0, net10.0 | Core libraries |
| net8.0, net10.0 | CoreChain, AppChain, Server components |
| net6.0--net10.0 | Blazor UI |
| net461, net472, netstandard 2.1 | Unity |

Individual package READMEs with full API documentation are available in each section of the sidebar, alongside the relevant guides and overviews.
