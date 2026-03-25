---
title: Privacy Pools (0xbow)
sidebar_label: Privacy Pools
sidebar_position: 7
description: Deposit ETH or ERC20 tokens with ZK commitments, withdraw privately via Groth16 proofs, recover accounts from a mnemonic, and manage ASP trees using the 0xbow Privacy Pools protocol.
---

# Privacy Pools (0xbow)

Privacy Pools let users deposit ETH or ERC20 tokens and later withdraw to a different address without revealing which deposit funded the withdrawal. An Association Set Provider (ASP) layer lets pool operators exclude illicit deposits without breaking privacy for legitimate users. Nethereum provides a complete .NET SDK that is cross-compatible with the [0xbow TypeScript SDK](https://github.com/0xbow-io/privacy-pools-core).

```bash
dotnet add package Nethereum.PrivacyPools
dotnet add package Nethereum.PrivacyPools.Circuits  # embedded circuit artifacts
dotnet add package Nethereum.ZkProofs.Snarkjs       # proof generation (requires Node.js)
```

**Native proof generation** (no Node.js required — recommended for desktop/server):

```bash
dotnet add package Nethereum.CircomWitnessCalc       # native witness generation (C, P/Invoke)
dotnet add package Nethereum.ZkProofs.RapidSnark     # native Groth16 proof generation (C++, P/Invoke)
```

For browser-based Blazor WASM applications, use `Nethereum.ZkProofs.Snarkjs.Blazor` instead. See the [ZK Proof Demos guide](/docs/consensus-and-cryptography/guide-zk-proof-demos) for working examples of both approaches.

## Create an Account

Privacy Pool accounts are deterministically derived from a BIP-39 mnemonic. The same mnemonic always produces the same master keys, enabling recovery across devices.

```csharp
var account = new PrivacyPoolAccount(mnemonic);
// account.MasterNullifier — from HD path m/44'/60'/0'/0/0
// account.MasterSecret    — from HD path m/44'/60'/1'/0/0
```

The master keys generate unique deposit and withdrawal secrets for each pool scope and index, so one mnemonic can manage deposits across many pools.

## Deploy a Privacy Pool

Deploy the full contract stack (Entrypoint proxy, Pool, Verifiers, Poseidon libraries) in a single call.

**Native ETH pool:**

```csharp
var deployment = await PrivacyPoolDeployer.DeployFullStackAsync(web3,
    new PrivacyPoolDeploymentConfig { OwnerAddress = ownerAddress });
```

**ERC20 token pool:**

```csharp
var deployment = await PrivacyPoolDeployer.DeployERC20FullStackAsync(web3,
    new PrivacyPoolERC20DeploymentConfig
    {
        OwnerAddress = ownerAddress,
        TokenAddress = erc20TokenAddress
    });
```

Both deploy an Entrypoint (UUPS proxy), a pool contract (`PrivacyPoolSimple` for ETH, `PrivacyPoolComplex` for ERC20), Groth16 verifiers, and Poseidon hash libraries. The pool is automatically registered with the Entrypoint.

## Deposit

The `PrivacyPool` facade generates deterministic secrets from your mnemonic, computes the Poseidon commitment, and submits the deposit transaction.

```csharp
var pp = PrivacyPool.FromDeployment(web3, deployment, mnemonic);
await pp.InitializeAsync();

// Native ETH deposit
var result = await pp.DepositAsync(Web3.Convert.ToWei(1), depositIndex: 0);

// ERC20 deposit (approve first)
await pp.ApproveERC20Async(tokenAddress, Web3.Convert.ToWei(1000));
var result = await pp.DepositERC20Async(tokenAddress, Web3.Convert.ToWei(100), depositIndex: 0);
```

Each deposit produces a `DepositResult` with the commitment details and transaction receipt. The `depositIndex` must be unique per scope — increment it for each new deposit.

## Sync and Recover Accounts

Recover all your accounts from on-chain events in a single call. `SyncFromChainAsync` fetches events, rebuilds the state tree, recovers your accounts, and builds the ASP tree.

```csharp
var pp = PrivacyPool.FromDeployment(web3, deployment, mnemonic);
await pp.InitializeAsync();

var sync = await pp.SyncFromChainAsync();
// sync.PoolAccounts  — recovered accounts with spendable balances
// sync.StateTree     — Merkle tree of all commitments
// sync.ASPTree       — ASP tree built from deposit labels
// sync.Deposits      — all deposit events
```

For incremental sync after the first run, pass `fromBlock` and the existing state tree to avoid reprocessing old blocks.

## Withdraw

Two withdrawal modes are available:

| Mode | Method | Privacy | Use When |
|------|--------|---------|----------|
| **Relay** | `Pool.WithdrawAsync(...)` | High — relayer submits tx | Production: your address stays hidden |
| **Direct** | `Pool.WithdrawDirectAsync(...)` | Low — your address is `msg.sender` | Testing or self-hosted scenarios |

Both modes generate a Groth16 proof showing you know a commitment in the state tree AND the ASP's approved set, without revealing which one.

```csharp
var circuitSource = new PrivacyPoolCircuitSource();
var proofProvider = pp.CreateProofProvider(new SnarkjsProofProvider(), circuitSource);

// Direct withdrawal
var result = await pp.Pool.WithdrawDirectAsync(
    commitment, leafIndex, withdrawnValue, recipientAddress,
    proofProvider, stateTree, aspTree);
```

## Ragequit

Exit the pool without ASP approval by proving knowledge of the deposit secrets. This reveals your commitment but guarantees you can always get your funds back.

```csharp
var spendable = pp.GetSpendableAccounts();
var result = await pp.RagequitAsync(spendable[0], proofProvider);
```

## ASP Tree Management

The `ASPTreeService` builds and manages the Association Set Provider Merkle tree. Deposit labels become tree leaves, and the root is published on-chain for withdrawal proofs to reference.

```csharp
var asp = pp.CreateASPTreeService();
asp.BuildFromDeposits(deposits);

// Publish root on-chain (requires POSTMAN role)
await asp.PublishRootAsync("bafybei...");

// Generate inclusion proof for a withdrawal
var (siblings, index) = asp.GenerateProof(label);

// Persist for later
var json = asp.Export();
// ...
asp.Import(json);
```

## Run a Relayer

The `PrivacyPoolRelayer` validates withdrawal proofs and submits transactions on behalf of users, preserving their privacy.

```csharp
var verifier = new PrivacyPoolProofVerifier(withdrawalVkJson);
var relayer = new PrivacyPoolRelayer(web3, new RelayerConfig
{
    EntrypointAddress = entrypointAddress,
    PoolAddress = poolAddress,
    FeeReceiverAddress = feeReceiver,
    BaseFeeBps = 50  // 0.5% fee
}, verifier);
await relayer.InitializeAsync();

var result = await relayer.HandleRelayRequestAsync(request);
```

## Cross-Compatibility

The C# and TypeScript SDKs produce identical cryptographic outputs. This is validated by:

- **Unit tests** — hardcoded value matching against the 0xbow TypeScript SDK
- **E2E cross-SDK tests** — deposits from the TypeScript SDK are withdrawn by Nethereum and vice versa, with real Groth16 proofs verified on-chain. Covers both native ETH and ERC20 flows.

## Next Steps

- [Nethereum.PrivacyPools Package Reference](nethereum-privacypools) — full API surface
- [Nethereum.PrivacyPools.Circuits Package Reference](nethereum-privacypools-circuits) — embedded circuit artifacts
- [0xbow Privacy Pools Protocol](https://github.com/0xbow-io/privacy-pools-core) — Solidity contracts and TypeScript SDK
