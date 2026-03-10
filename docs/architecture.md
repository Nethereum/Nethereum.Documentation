---
title: Architecture Map
sidebar_label: Architecture Map
sidebar_position: 0
description: How Nethereum's 130+ packages are layered and how they relate to each other
---

# Architecture Map

Nethereum ships 130+ NuGet packages. You don't need all of them — most apps start with `Nethereum.Web3` and add extension packages as needed. This page shows how everything fits together.

## Package Layers

The core packages form three layers. Higher layers depend on lower ones.

```mermaid
graph TD
    subgraph Facade
        Web3["<b>Web3</b><br/>Default entry point"]
    end

    subgraph Domain
        ABI["ABI"]
        Signer["Signer"]
        RPC["RPC"]
        Contracts["Contracts"]
        Accounts["Accounts"]
        KeyStore["KeyStore"]
        BlockchainProcessing["BlockchainProcessing"]
        MerklePatricia["Merkle.Patricia"]
    end

    subgraph Primitives
        Hex["Hex"]
        RLP["RLP"]
        Util["Util"]
        Model["Model"]
        JsonRpcClient["JsonRpc.Client"]
    end

    Web3 --> Contracts
    Web3 --> Accounts
    Web3 --> RPC
    Contracts --> ABI
    Accounts --> Signer
    Accounts --> KeyStore
    Signer --> Model
    ABI --> Hex
    ABI --> Util
    RPC --> JsonRpcClient
    Model --> RLP
    Model --> Hex
    BlockchainProcessing --> RPC
    BlockchainProcessing --> ABI
    MerklePatricia --> RLP
    MerklePatricia --> Hex

    style Facade fill:#1a5276,stroke:#2e86c1,color:#fff
    style Domain fill:#1b4332,stroke:#2d6a4f,color:#fff
    style Primitives fill:#4a235a,stroke:#7d3c98,color:#fff
```

## Section Diagrams

Each diagram below corresponds to a sidebar section and shows the actual NuGet packages and their dependency relationships.

---

### Core Foundation

```mermaid
graph TD
    Web3["Nethereum.Web3"] --> Contracts["Nethereum.Contracts"]
    Web3 --> Accounts["Nethereum.Accounts"]
    Web3 --> RPC["Nethereum.RPC"]

    Contracts --> ABI["Nethereum.ABI"]
    Accounts --> Signer["Nethereum.Signer"]
    Accounts --> KeyStore["Nethereum.KeyStore"]

    ABI --> Hex["Nethereum.Hex"]
    ABI --> Util["Nethereum.Util"]
    Signer --> Model["Nethereum.Model"]
    Model --> RLP["Nethereum.RLP"]
    Model --> Hex

    RPC --> JsonRpcClient["Nethereum.JsonRpc.Client"]
    RPC --> Hex

    subgraph Transport ["JSON-RPC Transport"]
        JsonRpcClient
        RpcClient["Nethereum.JsonRpc.RpcClient"]
        STJ["Nethereum.JsonRpc.SystemTextJsonRpcClient"]
        IPC["Nethereum.JsonRpc.IpcClient"]
        WS["Nethereum.JsonRpc.WebSocketClient"]
        WSStream["Nethereum.JsonRpc.WebSocketStreamingClient"]
    end

    RpcClient --> JsonRpcClient
    STJ --> JsonRpcClient
    IPC --> JsonRpcClient
    WS --> JsonRpcClient
    WSStream --> JsonRpcClient

    style Transport fill:#4a235a,stroke:#7d3c98,color:#fff
```

Also in this section: `Nethereum.Util.Rest`, `Nethereum.BigInteger.N351`, `Nethereum.RPC.Extensions`, `Nethereum.RPC.Reactive`, `Nethereum.Merkle`.

---

### Signing & Key Management

```mermaid
graph TD
    HDWallet["Nethereum.HDWallet"] --> Signer["Nethereum.Signer"]
    EIP712["Nethereum.Signer.EIP712"] --> Signer
    KeyStore["Nethereum.KeyStore"] --> Signer

    Ledger["Nethereum.Signer.Ledger"] --> Signer
    Trezor["Nethereum.Signer.Trezor"] --> Signer
    AWS["Nethereum.Signer.AWSKeyManagement"] --> Signer
    Azure["Nethereum.Signer.AzureKeyVault"] --> Signer

    BLS["Nethereum.Signer.Bls"] --> Model["Nethereum.Model"]
    BLSHerumi["Nethereum.Signer.Bls.Herumi"] --> BLS

    Signer --> Model
```

---

### Smart Contracts

```mermaid
graph TD
    Contracts["Nethereum.Contracts<br/><i>Built-in: ERC20, ERC721, ERC1155,<br/>ERC165, ERC1271, ERC6492, ENS,<br/>EIP3009, ERC2535 Diamond</i>"]
    Generator["Nethereum.Generator.Console"] --> Generators["Nethereum.Generators"]
    Autogen["Nethereum.Autogen"] --> Generators

    Contracts --> ABI["Nethereum.ABI"]
    Contracts --> Web3["Nethereum.Web3"]
    Generators --> ABI

    style Contracts fill:#1b4332,stroke:#2d6a4f,color:#fff
```

---

### DeFi & Protocols

```mermaid
graph TD
    Uniswap["Nethereum.Uniswap"] --> Contracts["Nethereum.Contracts"]
    x402["Nethereum.x402"] --> Contracts
    GnosisSafe["Nethereum.GnosisSafe"] --> Contracts
    Circles["Nethereum.Circles"] --> Contracts
```

---

### EVM Simulator

```mermaid
graph TD
    EVMContracts["Nethereum.EVM.Contracts"] --> EVM["Nethereum.EVM"]
    EVMContracts --> ABI["Nethereum.ABI"]

    EVM --> Model["Nethereum.Model"]
    EVM --> ABI
```

---

### Chain Infrastructure

```mermaid
graph TD
    CoreChainRocks["Nethereum.CoreChain.RocksDB"] --> CoreChain["Nethereum.CoreChain"]
    CoreChain --> EVM["Nethereum.EVM"]
    CoreChain --> MerklePatricia["Nethereum.Merkle.Patricia"]

    MerklePatricia --> RLP["Nethereum.RLP"]
    MerklePatricia --> Hex["Nethereum.Hex"]
```

---

### DevChain

```mermaid
graph TD
    DevChainServer["Nethereum.DevChain.Server"] --> DevChain["Nethereum.DevChain"]
    DevChain --> CoreChain["Nethereum.CoreChain"]
    DevChain --> EVM["Nethereum.EVM"]
```

---

### AppChains (Preview)

**Core packages:**

```mermaid
graph TD
    AppChainServer["Nethereum.AppChain.Server"] --> AppChain["Nethereum.AppChain"]
    Sequencer["Nethereum.AppChain.Sequencer"] --> AppChain
    AppChain --> CoreChain["Nethereum.CoreChain"]
    AppChain --> EVM["Nethereum.EVM"]
```

**Networking, governance & anchoring:**

```mermaid
graph TD
    Sync["Nethereum.AppChain.Sync"] --> AppChain["Nethereum.AppChain"]
    P2PServer["Nethereum.AppChain.P2P.Server"] --> P2P["Nethereum.AppChain.P2P"]
    P2PDotNetty["Nethereum.AppChain.P2P.DotNetty"] --> P2P
    P2P --> AppChain

    Policy["Nethereum.AppChain.Policy"] --> AppChain
    Anchoring["Nethereum.AppChain.Anchoring"] --> AppChain
    Clique["Nethereum.Consensus.Clique"] --> AppChain
```

---

### Account Abstraction

```mermaid
graph TD
    BundlerRpc["Nethereum.AccountAbstraction<br/>.Bundler.RpcServer"] --> Bundler["Nethereum.AccountAbstraction<br/>.Bundler"]
    Bundler --> AA["Nethereum.AccountAbstraction"]
    SimpleAccount["Nethereum.AccountAbstraction<br/>.SimpleAccount"] --> AA
    AAAppChain["Nethereum.AccountAbstraction<br/>.AppChain"] --> AA
    AAAppChain --> Bundler

    AA --> Contracts["Nethereum.Contracts"]
    AA --> Signer["Nethereum.Signer"]
```

---

### Data, Indexing & Explorer

**Processing pipeline:**

```mermaid
graph TD
    BP["Nethereum.BlockchainProcessing"] --> RPC["Nethereum.RPC"]
    BP --> ABI["Nethereum.ABI"]

    Processors["Nethereum.BlockchainStorage<br/>.Processors"] --> BP
    ProcPG["...Processors.Postgres"] --> Processors
    ProcSQL["...Processors.SqlServer"] --> Processors
    ProcLite["...Processors.Sqlite"] --> Processors
```

**Storage providers, explorer & token services:**

```mermaid
graph TD
    EFCore["Nethereum.BlockchainStore<br/>.EFCore"] --> BP["Nethereum.BlockchainProcessing"]
    StorePG["...Store.Postgres"] --> EFCore
    StoreSQL["...Store.SqlServer"] --> EFCore
    StoreLite["...Store.Sqlite"] --> EFCore
    TokenPG["Nethereum.BlockchainStorage<br/>.Token.Postgres"] --> EFCore

    Explorer["Nethereum.Explorer"] --> BP
    Explorer --> EFCore
    TokenServices["Nethereum.TokenServices"] --> Contracts["Nethereum.Contracts"]
    ChainState["Nethereum.ChainStateVerification"] --> BP
```

---

### MUD Framework

```mermaid
graph TD
    MudContracts["Nethereum.Mud.Contracts"] --> Mud["Nethereum.Mud"]
    Mud --> Contracts["Nethereum.Contracts"]
    Mud --> BP["Nethereum.BlockchainProcessing"]

    ReposEF["Nethereum.Mud.Repositories<br/>.EntityFramework"] --> Mud
    ReposPG["Nethereum.Mud.Repositories<br/>.Postgres"] --> ReposEF

    BlazorMud["Nethereum.MudBlazorComponents"] --> MudContracts
```

---

### Wallet & UI

**Wallet core packages:**

```mermaid
graph TD
    Wallet["Nethereum.Wallet"] --> Contracts["Nethereum.Contracts"]
    Wallet --> EVM["Nethereum.EVM"]
    WalletRpc["Nethereum.Wallet.RpcRequests"] --> Wallet
    UI["Nethereum.UI"] --> Web3["Nethereum.Web3"]
    UIComponents["Nethereum.Wallet<br/>.UI.Components"] --> Wallet
    UIComponents --> UI
    UIComponentsTrezor["Nethereum.Wallet<br/>.UI.Components.Trezor"] --> UIComponents
```

**Blazor stack & browser connectors:**

```mermaid
graph TD
    BlazorUI["Nethereum.Wallet<br/>.UI.Components.Blazor"] --> UIComponents["Nethereum.Wallet<br/>.UI.Components"]
    BlazorTrezor["Nethereum.Wallet<br/>.UI.Components.Blazor.Trezor"] --> BlazorUI

    Blazor["Nethereum.Blazor"] --> Web3["Nethereum.Web3"]
    BlazorSolidity["Nethereum.Blazor.Solidity"] --> Blazor
    EIP6963["Nethereum.EIP6963WalletInterop"] --> Blazor
    Metamask["Nethereum.Metamask"] --> Web3
    MetamaskBlazor["Nethereum.Metamask.Blazor"] --> Metamask
    MetamaskBlazor --> Blazor
    WC["Nethereum.WalletConnect"] --> Web3
    Reown["Nethereum.Reown.AppKit.Blazor"] --> WC
    Reown --> Blazor
```

**MAUI:**

```mermaid
graph TD
    MauiUI["Nethereum.Wallet<br/>.UI.Components.Maui"] --> UIComponents["Nethereum.Wallet<br/>.UI.Components"]
```

---

### Unity

```mermaid
graph TD
    Unity["Nethereum.Unity"] --> Web3["Nethereum.Web3"]
    UnityEIP6963["Nethereum.Unity.EIP6963"] --> Unity
    UnityMetamask["Nethereum.Unity.Metamask"] --> Unity
```

---

### Data Services

```mermaid
graph TD
    DataServices["Nethereum.DataServices"]

    DataServices -.- note["Standalone package<br/>No chain dependencies"]

    style note fill:none,stroke:none,color:#888
```

---

### Consensus Light Client

```mermaid
graph TD
    LightClient["Nethereum.Consensus.LightClient"] --> CSSZ["Nethereum.Consensus.SSZ"]
    CSSZ --> SSZ["Nethereum.SSZ"]
    BeaconChain["Nethereum.BeaconChain"] --> CSSZ
    LightClient --> BLSHerumi["Nethereum.Signer.Bls.Herumi"]
    BLSHerumi --> BLS["Nethereum.Signer.Bls"]
    ChainState["Nethereum.ChainStateVerification"] --> LightClient
```

---

### Client Extensions

```mermaid
graph TD
    Geth["Nethereum.Geth"] --> RPC["Nethereum.RPC"]
    Besu["Nethereum.Besu"] --> RPC
    Quorum["Nethereum.Quorum"] --> RPC
```

---

## Common Stacks

Real-world package combinations for typical projects.

| Use case | Packages |
|---|---|
| **Basic dApp** | `Nethereum.Web3` |
| **Local Dev** | `Nethereum.DevChain` + `Nethereum.DevChain.Server` + `Nethereum.Explorer` |
| **Production AppChain** | `Nethereum.AppChain.Server` + `Nethereum.AppChain.Sequencer` + `Nethereum.AppChain.P2P.Server` + `Nethereum.AppChain.Anchoring` |
| **Blockchain Indexer** | `Nethereum.BlockchainProcessing` + `Nethereum.BlockchainStore.Postgres` + `Nethereum.TokenServices` |
| **MUD World** | `Nethereum.Mud` + `Nethereum.Mud.Contracts` + `Nethereum.Mud.Repositories.Postgres` |
| **Blazor Wallet** | `Nethereum.Wallet.UI.Components.Blazor` + `Nethereum.EIP6963WalletInterop` + `Nethereum.Reown.AppKit.Blazor` |
| **Unity Game** | `Nethereum.Unity` + `Nethereum.Unity.EIP6963` |

For help choosing packages, see [What Do You Want to Do?](what-do-you-want-to-do.md).
