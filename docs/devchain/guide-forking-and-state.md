---
title: Forking & State Manipulation
sidebar_label: Forking & State
sidebar_position: 5
description: Fork live Ethereum networks and manipulate account state for testing against real-world data
---

# Forking & State Manipulation

When your contracts interact with deployed protocols — Uniswap pools, lending markets, token balances — you need that state locally. DevChain can fork from any Ethereum-compatible network, giving you a local chain that starts with real on-chain state. Combined with state manipulation (`hardhat_setBalance`, `hardhat_setCode`, etc.), you can set up any test scenario against production data.

This builds on the [Quick Start](devchain-quickstart). If you haven't set up a DevChain node yet, start there.

## Prerequisites

```bash
dotnet add package Nethereum.DevChain
```

You need an RPC endpoint that supports `eth_getBalance`, `eth_getCode`, `eth_getStorageAt`, and `eth_getBlockByNumber`. Infura, Alchemy, or any full node works. For historical blocks, you need an archive node.

## Fork a Live Network

### In-Process (DevChainNode)

Configure forking via `DevChainConfig`:

```csharp
using Nethereum.DevChain;
using Nethereum.Web3.Accounts;

var config = new DevChainConfig
{
    ForkUrl = "https://eth.llamarpc.com",
    ForkBlockNumber = 19000000  // Pin to a specific block
};

var node = new DevChainNode(config);
var account = new Account("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
await node.StartAsync(new[] { account.Address });

var web3 = node.CreateWeb3(account);
```

The forked node behaves like a copy-on-write overlay: reads fall through to the remote node if the data isn't cached locally, while all writes stay local. First access to any account or storage slot makes an RPC call; subsequent reads are cached.

### Via CLI

```bash
nethereum-devchain -f https://eth.llamarpc.com --fork-block 19000000
```

### What Gets Forked

When you read state that hasn't been written locally, the forking service fetches it on demand:

| Read Type | Remote Fetch? |
|-----------|---------------|
| Account balance | Yes (first access) |
| Contract code | Yes (first access) |
| Storage slots | Yes (per slot, first access) |
| Block headers | No (only genesis + local blocks) |
| Transaction history | No (only local transactions) |

Writes always go to local state — nothing is sent to the remote node.

## Testing Against Mainnet State

With a forked node, you can interact with real deployed contracts:

```csharp
// USDC on mainnet
var usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// Query real USDC state via the fork
var usdcService = web3.Eth.ERC20.GetContractService(usdcAddress);
var symbol = await usdcService.SymbolQueryAsync();     // "USDC"
var decimals = await usdcService.DecimalsQueryAsync();  // 6

// Check a whale's balance (real mainnet data at the forked block)
var whaleBalance = await usdcService.BalanceOfQueryAsync("0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503");
Console.WriteLine($"Whale USDC: {whaleBalance}");
```

## State Manipulation

DevChain supports Hardhat-compatible state override methods. These let you set up any test scenario — give yourself tokens, deploy contracts at specific addresses, or modify storage directly.

### Set Balance

Give any address an arbitrary ETH balance:

```csharp
// Give Alice 1 million ETH
await node.SetBalanceAsync(
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    Web3.Convert.ToWei(1_000_000)
);
```

Via RPC: `hardhat_setBalance(address, hexValue)` or `anvil_setBalance(address, hexValue)`.

### Set Code

Deploy bytecode at any address — useful for replacing a contract or creating mock contracts:

```csharp
// Deploy bytecode at a specific address
var bytecode = new byte[] { 0x60, 0x00, 0x60, 0x00, 0xFD }; // Simple revert
await node.SetCodeAsync("0x1234567890123456789012345678901234567890", bytecode);
```

Via RPC: `hardhat_setCode(address, bytecodeHex)`.

### Set Nonce

Override an account's nonce — useful for testing nonce gap scenarios:

```csharp
await node.SetNonceAsync("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 100);
```

Via RPC: `hardhat_setNonce(address, hexValue)`.

### Set Storage

Write directly to a contract's storage slots — useful for manipulating token balances without going through the contract's transfer logic:

```csharp
// Set a specific storage slot
await node.SetStorageAtAsync(
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  // USDC contract
    slot,                                              // Storage slot (BigInteger)
    value                                              // New value (byte[])
);
```

Via RPC: `hardhat_setStorageAt(address, slotHex, valueHex)`.

Finding the right storage slot requires knowledge of the contract's storage layout. For ERC-20 balances, the slot is typically `keccak256(abi.encode(ownerAddress, balanceMappingSlot))`.

## Account Impersonation

When using the HTTP server, you can impersonate any address — sign transactions as if you were that account, even without the private key:

```bash
# Via RPC
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"hardhat_impersonateAccount","params":["0xWhaleAddress"],"id":1}'
```

This is useful for testing governance proposals, simulating whale movements, or interacting as a multisig. Stop impersonation with `hardhat_stopImpersonatingAccount`.

## Always Pin the Block Number

When forking, always specify `ForkBlockNumber`. Without it, the fork uses "latest", which creates non-deterministic behavior:

- Tests may pass or fail depending on when they run
- Two test runs may see different token balances
- Remote state changes between test steps cause inconsistencies

```csharp
// Good — deterministic
var config = new DevChainConfig
{
    ForkUrl = "https://eth.llamarpc.com",
    ForkBlockNumber = 19000000
};

// Bad — non-deterministic
var config = new DevChainConfig
{
    ForkUrl = "https://eth.llamarpc.com"
    // ForkBlockNumber not set — uses "latest"
};
```

## Performance Tips

**First access is slow.** Each uncached account balance, code fetch, or storage read makes an RPC call. For contracts with many storage slots (large mappings), the first interaction may trigger dozens of requests.

**Use an archive node for historical blocks.** Standard full nodes only serve recent state. If you fork at a block that's been pruned, you'll get errors.

**Combine with persistent storage.** If you fork the same block repeatedly, use `--persist` to cache fetched state on disk:

```bash
nethereum-devchain -f https://eth.llamarpc.com --fork-block 19000000 --persist ./fork-cache
```

Subsequent runs will read cached state from disk instead of making remote RPC calls.

## Next Steps

- [Debug & Trace](guide-debug-trace) — trace forked transactions at the opcode level
- [Testing Patterns](guide-testing-patterns) — combine forking with snapshot/revert for isolated tests
- For the underlying forking mechanism, see the [Chain Infrastructure forking guide](/docs/chain-infrastructure/guide-forking)
- For the complete API, see the [Nethereum.DevChain package reference](nethereum-devchain)
