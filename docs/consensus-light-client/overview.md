---
title: Consensus Light Client
sidebar_label: Overview
sidebar_position: 0
description: Verify Ethereum state without running a full node using the beacon chain light client protocol
---

# Consensus Light Client

Verify Ethereum state without running a full node. These packages implement the beacon chain light client sync protocol, BLS signature verification, SSZ serialization, and Merkle proof-based state verification — giving you cryptographically verified balances, nonces, storage, and contract code using only a beacon chain API and a standard RPC endpoint.

## The Simple Path

```csharp
using Nethereum.ChainStateVerification.Interceptor;

var web3 = new Web3("https://mainnet.rpc.url")
    .UseVerifiedState(verifiedStateService);

// All queries are now cryptographically verified via Merkle proofs
var balance = await web3.Eth.GetBalance.SendRequestAsync(address);
```

The `UseVerifiedState()` extension intercepts RPC calls and verifies responses against the light client's trusted state root. No changes to your existing `web3.Eth` code — just add one line.

| Intercepted Method | What's Verified |
|---|---|
| `eth_getBalance` | Account balance via account proof |
| `eth_getTransactionCount` | Account nonce via account proof |
| `eth_getCode` | Contract bytecode via account proof + code hash |
| `eth_blockNumber` | Returns the light client's verified block number |

## What Can I Do?

| I want to... | Guide |
|---|---|
| Verify balances, nonces, and contract code without trusting my RPC | [Verified State Queries](guide-verified-state) |
| Use `web3.Eth` with automatic proof verification | [Verified State Queries](guide-verified-state) |
| Query verified storage slots and ERC-20 balances via proofs | [Verified State Queries](guide-verified-state) |
| Understand the light client protocol (sync committees, BLS, staleness) | [Beacon Chain Light Client](guide-light-client) |
| Customize light client behavior (staleness thresholds, persistence) | [Beacon Chain Light Client](guide-light-client) |

## Guides

| Guide | What You'll Learn |
|---|---|
| [Verified State Queries](guide-verified-state) | Initialize the light client stack, use `UseVerifiedState()` for transparent proof verification, query balances/nonces/storage directly, finalized vs optimistic modes |
| [Beacon Chain Light Client](guide-light-client) | How sync committees and BLS signatures work, configuration for different chains, update lifecycle, staleness detection, state persistence |

## Packages

| Package | Description |
|---------|-------------|
| [`Nethereum.Beaconchain`](nethereum-beaconchain) | Beacon Chain REST API client for light client bootstrap, sync updates, and finality data |
| [`Nethereum.Consensus.LightClient`](../consensus-and-cryptography/nethereum-consensus-lightclient) | Light client sync protocol — initialization, updates, trusted header tracking, staleness detection |
| [`Nethereum.ChainStateVerification`](../data-and-indexing/nethereum-chainstateverification) | Verified state queries with Merkle proof verification, RPC interceptor, caching |
| [`Nethereum.Consensus.Ssz`](../consensus-and-cryptography/nethereum-consensus-ssz) | SSZ container types for beacon headers, sync committees, and light client messages |
| [`Nethereum.Ssz`](../consensus-and-cryptography/nethereum-ssz) | Core SSZ encoding/decoding and merkleization primitives |

### Supporting Packages

These packages are dependencies used by the light client stack but documented in other sections:

| Package | Section | Role |
|---------|---------|------|
| [`Nethereum.Signer.Bls.Herumi`](../signing-and-key-management/nethereum-signer-bls-herumi) | Signing & Key Management | BLS12-381 signature verification (native Herumi library) |
| [`Nethereum.Merkle.Patricia`](../consensus-and-cryptography/nethereum-merkle-patricia) | Core Foundation | Patricia trie proof verification for account and storage proofs |

## Supported Chains

| Chain | Chain ID | Status |
|-------|----------|--------|
| Ethereum Mainnet | 1 | Fully supported |
| Sepolia | 11155111 | Fully supported |
| Holesky | 17000 | Fully supported |
