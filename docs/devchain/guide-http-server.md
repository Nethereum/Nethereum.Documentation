---
title: HTTP Server & CLI
sidebar_label: HTTP Server & CLI
sidebar_position: 3
description: Run DevChain as a standalone HTTP JSON-RPC server — a Hardhat/Anvil replacement in .NET
---

# HTTP Server & CLI

The [Quick Start](devchain-quickstart) showed how to run DevChain in-process with `CreateWeb3`. When you need external tools to connect — MetaMask, Foundry, Hardhat, ethers.js, or any Ethereum client — DevChain can also run as a standalone HTTP JSON-RPC server. This is the .NET equivalent of `npx hardhat node` or `anvil`, with the same default mnemonic and compatible RPC methods.

## Prerequisites

Install the server as a .NET global tool:

```bash
dotnet tool install -g Nethereum.DevChain.Server
```

Or add it as a project dependency for embedding:

```bash
dotnet add package Nethereum.DevChain.Server
```

## Start the Server

Run with defaults — 10 funded accounts, port 8545, auto-mine:

```bash
nethereum-devchain
```

The startup banner shows all funded accounts with their addresses and private keys, just like Hardhat or Anvil:

```
Nethereum DevChain v5.x.x
========================

RPC endpoint: http://127.0.0.1:8545
Chain ID:     31337
Gas limit:    30,000,000
Mining:       auto

Available Accounts
==================
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
(1) 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
...

Private Keys
==================
(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
(1) 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
...

HD Wallet
==================
Mnemonic: test test test test test test test test test test test junk
Path:     m/44'/60'/0'/0/{index}
```

The default mnemonic and derivation path match Hardhat and Anvil, so existing test scripts work without changes.

## CLI Options

Customise the server with command-line flags:

```bash
# Custom port and more accounts
nethereum-devchain -p 8546 -a 20

# Higher account balance (in ETH)
nethereum-devchain -e 100000

# Interval mining (1 block per second)
nethereum-devchain -b 1000

# Fork mainnet
nethereum-devchain -f https://eth.llamarpc.com --fork-block 19000000

# Persistent storage
nethereum-devchain --persist ./mychain

# Fully in-memory
nethereum-devchain --in-memory

# Custom mnemonic
nethereum-devchain -m "your twelve word mnemonic phrase here"
```

### Full Option Reference

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --port` | HTTP port | `8545` |
| `--host` | Bind address | `127.0.0.1` |
| `-a, --accounts` | Number of funded accounts | `10` |
| `-m, --mnemonic` | HD wallet mnemonic | Hardhat default |
| `-e, --balance` | Account balance in ETH | `10000` |
| `-c, --chain-id` | Chain ID | `31337` |
| `-b, --block-time` | Block time in ms (0 = auto-mine) | `0` |
| `--gas-limit` | Block gas limit | `30000000` |
| `-f, --fork` | Fork from this RPC URL | — |
| `--fork-block` | Fork at specific block number | latest |
| `--persist [DIR]` | Persist data to disk | `./chaindata` |
| `--in-memory` | Use fully in-memory storage | — |
| `-v, --verbose` | Enable verbose logging | — |

## Connecting from External Tools

The server exposes a standard JSON-RPC endpoint at `POST /` and a health check at `GET /`.

### From Nethereum (C#)

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

var account = new Account("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
var web3 = new Web3(account, "http://127.0.0.1:8545");

var balance = await web3.Eth.GetBalance.SendRequestAsync(account.Address);
```

### From ethers.js

```javascript
const { ethers } = require("ethers");
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const signer = new ethers.Wallet(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  provider
);
```

### From curl

```bash
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Supported RPC Methods

DevChain supports the complete Ethereum JSON-RPC specification plus development methods:

| Category | Methods |
|----------|---------|
| **Network** | `web3_clientVersion`, `web3_sha3`, `net_version`, `net_listening`, `net_peerCount`, `eth_chainId`, `eth_syncing`, `eth_mining`, `eth_coinbase`, `eth_accounts` |
| **Blocks** | `eth_blockNumber`, `eth_getBlockByHash`, `eth_getBlockByNumber`, `eth_getBlockTransactionCountByHash`, `eth_getBlockTransactionCountByNumber`, `eth_getBlockReceipts` |
| **Transactions** | `eth_sendRawTransaction`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, `eth_getTransactionByBlockHashAndIndex`, `eth_getTransactionByBlockNumberAndIndex` |
| **State** | `eth_getBalance`, `eth_getCode`, `eth_getStorageAt`, `eth_getTransactionCount` |
| **Execution** | `eth_call`, `eth_estimateGas`, `eth_createAccessList` |
| **Gas & Fees** | `eth_gasPrice`, `eth_maxPriorityFeePerGas`, `eth_feeHistory` |
| **Filters** | `eth_newFilter`, `eth_newBlockFilter`, `eth_getFilterChanges`, `eth_getFilterLogs`, `eth_uninstallFilter`, `eth_getLogs` |
| **Proofs** | `eth_getProof` |
| **Debug** | `debug_traceTransaction`, `debug_traceCall` |

### Development Methods

These match Hardhat and Anvil conventions:

| Method | Description |
|--------|-------------|
| `evm_mine` | Mine a block |
| `evm_snapshot` | Take a state snapshot |
| `evm_revert` | Revert to a snapshot |
| `evm_increaseTime` | Advance the block timestamp |
| `evm_setNextBlockTimestamp` | Set exact next block timestamp |
| `hardhat_setBalance` | Override an account's ETH balance |
| `hardhat_setCode` | Deploy bytecode at an address |
| `hardhat_setNonce` | Set an account's nonce |
| `hardhat_setStorageAt` | Write to a contract's storage slot |
| `hardhat_impersonateAccount` | Sign transactions as any address |
| `hardhat_stopImpersonatingAccount` | Stop impersonating |

Anvil aliases are also registered for: `anvil_setBalance`, `anvil_setCode`, `anvil_setNonce`, `anvil_setStorageAt`, `anvil_mine`, `anvil_snapshot`, `anvil_revert`.

## Storage Modes

The server supports three storage configurations:

| Mode | Flag | Blocks/TXs/Receipts | Account State | Cleanup |
|------|------|---------------------|---------------|---------|
| **SQLite (default)** | none | SQLite temp file | In-memory | Auto-delete on exit |
| **SQLite persistent** | `--persist [DIR]` | SQLite at `DIR/chain.db` | In-memory | Kept between restarts |
| **In-memory** | `--in-memory` | In-memory | In-memory | Lost on exit |

Use `--persist` when you want chain history to survive restarts. Use `--in-memory` for CI/CD or ephemeral test environments where speed matters most.

## Embedding in ASP.NET

Instead of running the CLI, you can embed the DevChain server directly in your ASP.NET application:

```csharp
using Nethereum.DevChain.Server.Configuration;
using Nethereum.DevChain.Server.Hosting;
using Nethereum.DevChain.Server.Server;

var builder = WebApplication.CreateBuilder(args);

var config = new DevChainServerConfig
{
    ChainId = 31337,
    Port = 8545,
    Storage = "memory"
};

builder.Services.AddDevChainServer(config);
builder.Services.AddHostedService<DevChainHostedService>();

var app = builder.Build();
app.Run();
```

`AddDevChainServer` registers the `DevChainNode`, `DevAccountManager`, `RpcDispatcher`, and all storage providers as singletons. `DevChainHostedService` starts the node when the application starts and stops it on shutdown.

### Configuration via appsettings.json

When embedding, you can also bind configuration from `appsettings.json`:

```json
{
  "DevChain": {
    "ChainId": 31337,
    "Port": 8545,
    "AutoMine": true,
    "BlockTime": 0,
    "AccountCount": 10,
    "Storage": "sqlite",
    "Persist": false
  }
}
```

## Hardhat/Anvil Migration

If you're switching from Hardhat or Anvil to DevChain:

| Feature | Hardhat | Anvil | DevChain |
|---------|---------|-------|----------|
| Start command | `npx hardhat node` | `anvil` | `nethereum-devchain` |
| Default port | 8545 | 8545 | 8545 |
| Default chain ID | 31337 | 31337 | 31337 |
| Default mnemonic | Same | Same | Same |
| Fork support | `--fork <url>` | `--fork-url <url>` | `-f <url>` |
| Persistent storage | No | No | `--persist` |
| Interval mining | `--interval <sec>` | `-b <sec>` | `-b <ms>` (milliseconds) |
| Account impersonation | `hardhat_impersonateAccount` | `anvil_impersonateAccount` | `hardhat_impersonateAccount` |
| Debug tracing | Limited | `debug_traceTransaction` | Both geth-compatible |

The key difference: DevChain block time is in **milliseconds**, not seconds.

## Next Steps

- [Testing Patterns](guide-testing-patterns) — write isolated integration tests with snapshot/revert
- [Forking & State Manipulation](guide-forking-and-state) — fork mainnet and override account state
- [Debug & Trace](guide-debug-trace) — trace transactions at the opcode level
- For the complete server API, see the [Nethereum.DevChain.Server package reference](nethereum-devchain-server)
