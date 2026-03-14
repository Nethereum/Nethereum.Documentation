---
title: Verified State Queries
sidebar_label: Verified State Queries
sidebar_position: 1
description: Verify ETH balances, nonces, storage, and contract code without trusting your RPC provider using light client proofs
---

# Verified State Queries

:::tip The Simple Way
If you already have a `VerifiedStateService` initialized, a single extension method turns any Web3 instance into a trustless client:

```csharp
var web3 = new Web3("https://mainnet.rpc.url")
    .UseVerifiedState(verifiedStateService);

var balance = await web3.Eth.GetBalance.SendRequestAsync(address);
```

Every call to `eth_getBalance`, `eth_getTransactionCount`, `eth_getCode`, and `eth_blockNumber` is now cryptographically verified via Merkle proofs against a beacon chain state root. No trust required.
:::

## Why Verified State Matters

When you call `eth_getBalance` through a standard RPC provider, you are trusting that provider to return the correct value. A compromised or malicious RPC endpoint could return a fabricated balance, a wrong nonce, or altered contract code. Verified state queries eliminate this trust assumption entirely. By combining Ethereum's consensus light client protocol with Merkle proof verification, your application can independently confirm that the data it receives matches what the entire Ethereum network has agreed upon.

This matters for self-custodial wallets, financial dashboards, and any application where incorrect state could lead to lost funds or broken transactions.

## Prerequisites

Install the following NuGet packages:

```
Nethereum.ChainStateVerification
Nethereum.Consensus.LightClient
Nethereum.Beaconchain
Nethereum.Signer.Bls.Herumi
Nethereum.Web3
```

You will also need two endpoint URLs:

- **Beacon chain API URL** -- A consensus layer endpoint (e.g., `https://ethereum-beacon-api.publicnode.com`)
- **Execution RPC URL** -- A standard Ethereum JSON-RPC endpoint that supports `eth_getProof`

## How It Works

The verification pipeline has four stages:

1. **Light client tracks finalized beacon headers** -- The consensus light client follows the beacon chain by verifying sync committee BLS signatures. This gives you a cryptographically trusted beacon block header without running a full node.

2. **Each beacon header contains an execution layer state root** -- The beacon block header embeds the execution payload, which includes the state root of the execution layer at that block.

3. **`eth_getProof` returns Merkle proofs for accounts and storage** -- When you query an account's balance, the RPC node returns the value along with a Merkle proof path from the account to the state root.

4. **`VerifiedStateService` verifies proofs against the trusted state root** -- The proof is checked locally against the state root from the beacon header. If the proof is valid, the data is genuine. If not, the query fails rather than returning unverified data.

The result is cryptographically verified data without running a full Ethereum node.

## Initialize the Light Client

Setting up the light client requires a few steps: connecting to the beacon chain, bootstrapping from a recent finality checkpoint, and creating the verification service. The following walks through each piece.

First, initialize the BLS signature verification library. This is required for validating sync committee signatures.

```csharp
using Nethereum.Signer.Bls;
using Nethereum.Signer.Bls.Herumi;

var nativeBls = new NativeBls(new HerumiNativeBindings());
await nativeBls.InitializeAsync();
```

Next, connect to the beacon chain and fetch a finality update. This provides the weak subjectivity checkpoint that bootstraps the light client.

```csharp
using Nethereum.Beaconchain;
using Nethereum.Beaconchain.LightClient;
using Nethereum.Consensus.Ssz;

var beaconClient = new BeaconApiClient("https://ethereum-beacon-api.publicnode.com");
var response = await beaconClient.LightClient.GetFinalityUpdateAsync();
var finalityUpdate = LightClientResponseMapper.ToDomain(response);
var weakSubjectivityRoot = finalityUpdate.FinalizedHeader.Beacon.HashTreeRoot();
```

Now create the light client configuration for Ethereum mainnet. The genesis validators root and fork version are fixed constants for each network.

```csharp
using Nethereum.Consensus.LightClient;
using Nethereum.Hex.HexConvertors.Extensions;

var config = new LightClientConfig
{
    GenesisValidatorsRoot = "0x4b363db94e286120d76eb905340fdd4e54bfe9f06bf33ff6cf5ad27f511bfe95"
        .HexToByteArray(),
    CurrentForkVersion = new byte[] { 0x06, 0x00, 0x00, 0x00 },
    SlotsPerEpoch = 32,
    SecondsPerSlot = 12,
    WeakSubjectivityRoot = weakSubjectivityRoot
};
```

Create and initialize the light client service. This fetches the bootstrap data and begins tracking the beacon chain.

```csharp
var store = new InMemoryLightClientStore();
var lightClient = new LightClientService(
    beaconClient.LightClient, nativeBls, config, store);
await lightClient.InitializeAsync();
```

Finally, build the `VerifiedStateService` by connecting the light client's trusted headers to an execution RPC endpoint that supports `eth_getProof`.

```csharp
using Nethereum.ChainStateVerification;
using Nethereum.JsonRpc.Client;
using Nethereum.RPC.Eth;

var trustedProvider = new TrustedHeaderProvider(lightClient);
var rpcClient = new RpcClient(new Uri("https://mainnet.rpc.url"));
var ethGetProof = new EthGetProof(rpcClient);
var ethGetCode = new EthGetCode(rpcClient);
var trieVerifier = new TrieProofVerifier();

var verifiedStateService = new VerifiedStateService(
    trustedProvider, ethGetProof, ethGetCode, trieVerifier);
```

The `VerifiedStateService` is now ready. You can use it with the `UseVerifiedState` extension for transparent verification, or call its methods directly.

## The Simple Path: UseVerifiedState()

The `UseVerifiedState` extension method is the recommended way to add verification to your application. It installs a request interceptor on the Web3 client that transparently verifies state queries using Merkle proofs.

The most basic usage applies verification with default settings (finalized mode, no fallback):

```csharp
using Nethereum.ChainStateVerification.Interceptor;

var web3 = new Web3("https://mainnet.rpc.url");
web3.UseVerifiedState(verifiedStateService);

var balance = await web3.Eth.GetBalance.SendRequestAsync(address);
Console.WriteLine($"Verified balance: {Nethereum.Util.UnitConversion.Convert.FromWei(balance.Value)} ETH");
```

You can configure the verification mode and enable fallback behavior. When `FallbackOnError` is true, the interceptor falls back to the unverified RPC response if proof verification fails (for example, due to RPC node pruning limits).

```csharp
web3.UseVerifiedState(verifiedStateService, config =>
{
    config.Mode = VerificationMode.Finalized;
    config.FallbackOnError = true;
});
```

The extension returns the Web3 instance, so you can use fluent chaining to set up and query in a single expression:

```csharp
var balance = await new Web3("https://mainnet.rpc.url")
    .UseVerifiedState(verifiedStateService, config =>
    {
        config.Mode = VerificationMode.Finalized;
        config.FallbackOnError = true;
    })
    .Eth.GetBalance.SendRequestAsync(address);
```

The interceptor verifies the following RPC methods automatically:

- `eth_getBalance` -- Account ETH balance
- `eth_getTransactionCount` -- Account nonce
- `eth_getCode` -- Contract bytecode
- `eth_blockNumber` -- Returns the light client's verified block number instead of querying the RPC

All other RPC methods (such as `eth_gasPrice`, `eth_sendRawTransaction`, `eth_call`) pass through to the RPC provider unmodified.

## Finalized vs Optimistic Mode

The light client tracks two types of beacon headers, each offering a different tradeoff between security and freshness.

| Mode | Security | Latency | Best For |
|------|----------|---------|----------|
| **Finalized** | Strongest -- economically final, cannot be reverted | ~12-15 minutes behind chain head | Financial operations, transaction signing, balance checks before transfers |
| **Optimistic** | Weaker -- based on attestations, theoretically revertible | Seconds behind chain head | UI display, dashboards, non-critical reads |

To use optimistic mode, update the light client with the latest optimistic header before creating the verified state service:

```csharp
await lightClient.UpdateFinalityAsync();
await lightClient.UpdateOptimisticAsync();

verifiedStateService.Mode = VerificationMode.Optimistic;
var balance = await verifiedStateService.GetBalanceAsync(address);
```

You can compare both modes to see the block difference:

```csharp
verifiedStateService.Mode = VerificationMode.Finalized;
var finalizedHeader = verifiedStateService.GetCurrentHeader();
Console.WriteLine($"Finalized block: {finalizedHeader.BlockNumber}");

verifiedStateService.Mode = VerificationMode.Optimistic;
var optimisticHeader = verifiedStateService.GetCurrentHeader();
Console.WriteLine($"Optimistic block: {optimisticHeader.BlockNumber}");
Console.WriteLine($"Difference: {optimisticHeader.BlockNumber - finalizedHeader.BlockNumber} blocks");
```

The optimistic block is typically 64 or more blocks ahead of the finalized block (roughly two epochs).

## Direct Queries

Instead of using the Web3 interceptor, you can call `VerifiedStateService` methods directly. This gives you more control over error handling and lets you work with raw values.

**Get a verified ETH balance:**

```csharp
var balance = await verifiedStateService.GetBalanceAsync(
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
Console.WriteLine($"Balance: {Nethereum.Util.UnitConversion.Convert.FromWei(balance)} ETH");
```

**Get a verified nonce:**

```csharp
var nonce = await verifiedStateService.GetNonceAsync(
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
Console.WriteLine($"Nonce: {nonce}");
```

**Get verified contract code:**

```csharp
var code = await verifiedStateService.GetCodeAsync(
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
Console.WriteLine($"Contract code size: {code.Length} bytes");
```

**Get a verified storage slot value:**

```csharp
var slot = BigInteger.Zero;
var storageValue = await verifiedStateService.GetStorageAtAsync(
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", slot);
Console.WriteLine($"Storage slot 0: {storageValue.ToHex(true)}");
```

Each of these methods fetches an `eth_getProof` response from the RPC node and verifies the Merkle proof against the trusted state root before returning the value.

## Advanced: Storage Proofs

Storage proofs let you verify the contents of specific storage slots in a smart contract. This is useful for reading token balances, allowances, or any on-chain state at the EVM storage level.

**Simple slot lookup** -- Read a fixed storage slot directly by its index:

```csharp
using System.Numerics;
using Nethereum.Hex.HexConvertors.Extensions;

var wethContract = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

var slot0 = await verifiedStateService.GetStorageAtAsync(wethContract, BigInteger.Zero);
Console.WriteLine($"WETH slot 0: {slot0.ToHex(true)}");

var slot1 = await verifiedStateService.GetStorageAtAsync(wethContract, BigInteger.One);
Console.WriteLine($"WETH slot 1: {slot1.ToHex(true)}");
```

**Mapping slot computation** -- Solidity stores mapping values at `keccak256(key . slot)`, where `key` and `slot` are each left-padded to 32 bytes and concatenated. To look up a balance in a `mapping(address => uint256)` at slot 3:

```csharp
using System.Linq;
using Nethereum.Util;

var holderAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
var addressBytes = holderAddress.HexToByteArray();
var paddedAddress = new byte[32];
Buffer.BlockCopy(addressBytes, 0, paddedAddress, 12, 20);

var slotIndex = new byte[32];
slotIndex[31] = 3;

var combined = paddedAddress.Concat(slotIndex).ToArray();
var mappingSlot = new Sha3Keccack().CalculateHash(combined);

var storageValue = await verifiedStateService.GetStorageAtAsync(
    wethContract, mappingSlot.ToHex(true));
var tokenBalance = new BigInteger(
    storageValue.Reverse().Concat(new byte[] { 0 }).ToArray());
Console.WriteLine($"Token balance from verified storage: {tokenBalance}");
```

**Multiple slots** -- You can query several slots sequentially. Each query generates its own independent Merkle proof:

```csharp
var slots = new[] { BigInteger.Zero, BigInteger.One, new BigInteger(2) };
foreach (var slot in slots)
{
    var value = await verifiedStateService.GetStorageAtAsync(wethContract, slot);
    Console.WriteLine($"Slot {slot}: {value.ToHex(true)}");
}
```

## Advanced: Verified EVM Calls

For more complex queries like ERC-20 `balanceOf`, you can combine verified state with Nethereum's EVM simulator. This runs the contract's bytecode locally against verified storage, giving you a fully trustless `eth_call` equivalent.

First, set up the verified execution environment by wrapping the `VerifiedStateService` in a `VerifiedNodeDataService`:

```csharp
using Nethereum.ChainStateVerification.NodeData;
using Nethereum.EVM;
using Nethereum.EVM.BlockchainState;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;
using Nethereum.Hex.HexTypes;

var nodeDataService = new VerifiedNodeDataService(verifiedStateService);
var executionStateService = new ExecutionStateService(nodeDataService);
```

Then fetch the verified contract code and execute a function call through the EVM simulator:

```csharp
var wethContract = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
var holderAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

var code = await verifiedStateService.GetCodeAsync(wethContract);

var balanceOfFunction = new BalanceOfFunction { Owner = holderAddress };
var callInput = balanceOfFunction.CreateCallInput(wethContract);
callInput.From = holderAddress;
callInput.ChainId = new HexBigInteger(1);

var programContext = new ProgramContext(callInput, executionStateService);
var program = new Program(code, programContext);
var evmSimulator = new EVMSimulator();
await evmSimulator.ExecuteAsync(program);

var result = new BalanceOfOutputDTO().DecodeOutput(
    program.ProgramResult.Result.ToHex());
Console.WriteLine($"Verified WETH balance: {Web3.Convert.FromWei(result.Balance)} WETH");
```

The function message and output DTO classes follow the standard Nethereum pattern:

```csharp
[Function("balanceOf", "uint256")]
public class BalanceOfFunction : FunctionMessage
{
    [Parameter("address", "_owner", 1)]
    public virtual string Owner { get; set; }
}

[FunctionOutput]
public class BalanceOfOutputDTO : IFunctionOutputDTO
{
    [Parameter("uint256", "", 1)]
    public virtual BigInteger Balance { get; set; }
}
```

This approach works for any EVM call -- `totalSupply`, `name`, `symbol`, `decimals`, NFT ownership checks, and more. Every storage read the EVM performs during execution is individually verified via Merkle proofs against the trusted state root.

## Caching

The `VerifiedStateService` supports caching of verified results. Once a proof has been verified for a given account at a specific block, the result can be reused without re-fetching the proof.

```csharp
verifiedStateService.EnableCaching = true;
```

The cache is automatically invalidated when the light client advances to a new block. You can also clear it manually when switching verification modes:

```csharp
verifiedStateService.ClearCache();
```

## Error Handling

Several error conditions are specific to verified state queries.

**Pruned history errors** occur when the RPC node does not retain state data old enough for the finalized block. Most non-archive RPC nodes keep only the latest 128 blocks of state. Since finalized blocks are typically 12-15 minutes behind the chain head, the state for those blocks may already be pruned.

```csharp
try
{
    var balance = await verifiedStateService.GetBalanceAsync(address);
    Console.WriteLine($"Verified balance: {Nethereum.Util.UnitConversion.Convert.FromWei(balance)} ETH");
}
catch (Nethereum.JsonRpc.Client.RpcResponseException ex)
{
    if (ex.Message.Contains("missing trie node") ||
        ex.Message.Contains("proof window"))
    {
        Console.WriteLine("RPC node has pruned the state for this block.");
        Console.WriteLine("Use optimistic mode or switch to an archive node.");
    }
}
```

**Fallback behavior** with the interceptor provides a graceful degradation path. When `FallbackOnError` is enabled, the interceptor catches verification failures and retries through the normal RPC path. You can monitor when this happens:

```csharp
var interceptor = verifiedStateService.CreateVerifiedStateInterceptor(config =>
{
    config.FallbackOnError = true;
});

interceptor.FallbackTriggered += (sender, args) =>
{
    Console.WriteLine($"Verification failed for {args.Method}, using RPC fallback");
    Console.WriteLine($"Reason: {args.Exception?.Message}");
};
```

**State consistency errors** can occur in optimistic mode when the optimistic header is very close to the chain head. The RPC node may not yet have consistent state for that block. These are transient and resolve on the next update.

## Real-World Example: Wallet Dashboard

The Nethereum Wallet uses `VerifiedBalanceService` to display trustlessly verified balances on its dashboard. The production implementation follows a dual-mode strategy:

1. **Try finalized first** -- Update the light client finality and query the balance at the finalized block. This gives the strongest guarantee.
2. **Fall back to optimistic** -- If finalized fails (typically due to RPC pruning), update the optimistic header and retry. This provides weaker but still meaningful verification.
3. **Report the mode used** -- The result includes which mode succeeded, so the UI can show a verification badge with appropriate confidence level.

This pattern ensures that users always see a verified balance when possible, with clear indication of the verification strength.

## Common Gotchas

- **Archive node recommended for finalized mode** -- Standard RPC nodes prune state beyond ~128 blocks. Since finalized blocks are ~96 blocks behind head, you are near the pruning boundary. Archive nodes or nodes with extended state retention avoid this issue.

- **BLS native library must be present** -- The `Nethereum.Signer.Bls.Herumi` package includes native binaries for BLS signature verification. Make sure the appropriate runtime binary (`bls_eth.dll` on Windows, `libbls_eth.so` on Linux, `libbls_eth.dylib` on macOS) is in your output directory.

- **Fork version changes with network upgrades** -- The `CurrentForkVersion` in the light client config must match the current fork of the network. After a hard fork, this value changes. Fetch it dynamically from the beacon API for production use.

- **Optimistic is not final** -- Data verified in optimistic mode is based on attestations that have not yet been finalized. In extremely rare reorganization scenarios, the data could change. Use finalized mode for anything involving fund transfers.

- **Non-intercepted methods pass through unchanged** -- The `UseVerifiedState` interceptor only verifies the four methods listed above. All other RPC calls (gas estimation, transaction sending, event logs) go directly to the RPC provider without verification.

- **One interceptor per client** -- Setting `UseVerifiedState` replaces any existing request interceptor on the Web3 client. If you need multiple interceptors, compose them manually.

## Next Steps

- **[Beacon Chain Light Client](guide-light-client)** — Understand the light client protocol internals: sync committees, BLS signatures, staleness detection, state persistence
- **[Nethereum.ChainStateVerification](../data-and-indexing/nethereum-chainstateverification)** — Full API reference for the verified state service
- **[Nethereum.Beaconchain](nethereum-beaconchain)** — Beacon chain API client reference
