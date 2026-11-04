---
title: "EIP-4844: Blob Transactions"
sidebar_label: "EIP-4844 Blobs"
sidebar_position: 9
description: Send and read EIP-4844 blob transactions — encode data to blobs, compute KZG commitments, sign, send to Ethereum, fetch and decode via beacon API
---

# EIP-4844: Blob Transactions

EIP-4844 (proto-danksharding) introduces a new transaction type (0x03) that carries large data blobs alongside the transaction. Blobs are 128 KB each (6 per block on Cancun; fork-dependent, `HardforkConfig.MaxBlobsPerBlock`, 21 on Amsterdam) and are stored temporarily on the consensus layer. This is the primary mechanism for L2 rollups to post data to L1 at reduced cost.

## Quick Start — Send a Blob Transaction

```csharp
using Nethereum.EVM.Precompiles.Kzg;
using Nethereum.Model;
using Nethereum.Signer;
using System.Text;

// 1. Initialize KZG (once per process)
CkzgOperations.InitializeFromEmbeddedSetup();
var kzg = new CkzgOperations();
var builder = new BlobSidecarBuilder(kzg);

// 2. Encode your data into blobs + compute KZG commitments/proofs
var data = Encoding.UTF8.GetBytes("Hello Ethereum Blobs!");
var (sidecar, versionedHashes) = builder.BuildFromData(data);

// 3. Build the blob transaction
var tx = new Transaction4844(
    chainId: 1,
    nonce: 0,
    maxPriorityFeePerGas: 2_000_000_000,
    maxFeePerGas: 50_000_000_000,
    gasLimit: 21_000,
    receiverAddress: "0xRecipientAddress",
    amount: 0,
    data: null,
    accessList: null,
    maxFeePerBlobGas: 10_000_000_000,
    blobVersionedHashes: versionedHashes);

tx.Sidecar = sidecar;

// 4. Sign
var signer = new Transaction4844Signer();
signer.SignTransaction(privateKeyBytes, tx);

// 5. Send via eth_sendRawTransaction (includes sidecar in network wrapper)
var rawTx = tx.GetRLPEncodedWithSidecar().ToHex();
var txHash = await web3.Eth.Transactions.SendRawTransaction.SendRequestAsync(rawTx);
```

## Reading Blobs Back

Blobs are available from beacon nodes via the standard REST API:

```csharp
using Nethereum.Beaconchain;
using Nethereum.Model;

var beacon = new BeaconApiClient("https://your-beacon-node.example.com");

// Fetch blobs for a specific slot
var response = await beacon.GetBlobSidecarsAsync("9000000");

// Decode back to original data
var originalData = BlobSidecarHelper.DecodeData(response);
```

## Encoding Details

Each blob is 131,072 bytes (4,096 field elements x 32 bytes). The first byte of each field element is zeroed to stay within the BLS12-381 scalar field, giving 31 usable bytes per element (126,976 usable bytes per blob).

```csharp
// Encode — auto-splits into multiple blobs if data > 126,976 bytes
var blobs = BlobEncoder.EncodeBlobs(largeData);

// Decode — strips padding and concatenates
var decoded = BlobEncoder.DecodeBlobs(blobs);
```

## KZG Operations

The KZG cryptographic operations use the c-kzg-4844 native library via `Ckzg.Bindings`:

```csharp
var kzg = new CkzgOperations();

// Individual operations
byte[] commitment = kzg.BlobToKzgCommitment(blob);       // 48 bytes
byte[] proof = kzg.ComputeBlobKzgProof(blob, commitment); // 48 bytes
byte[] hash = kzg.ComputeVersionedHash(commitment);       // 0x01 || SHA256[1:]
bool valid = kzg.VerifyBlobKzgProof(blob, commitment, proof);
```

## DevChain Testing

The Nethereum DevChain supports blob transactions in-process:

```csharp
var node = DevChainNode.CreateInMemory(config);
await node.StartAsync(accounts);

// Send blob tx — sidecar is automatically stored
tx.Sidecar = sidecar;
await node.SendTransactionAsync(tx);
await node.MineBlockAsync();

// Read back stored blobs
var blobs = await node.BlobStore.GetBlobsByBlockNumberAsync(blockNumber);
var decoded = BlobEncoder.DecodeBlobs(blobs.Select(b => b.Blob).ToList());
```

## Key Constants

| Constant | Value |
|---|---|
| Blob size | 131,072 bytes (128 KB) |
| Field elements per blob | 4,096 |
| Usable bytes per blob | 126,976 |
| Max blobs per block | 6 on Cancun; fork-dependent (`HardforkConfig.MaxBlobsPerBlock`, 21 on Amsterdam) |
| KZG commitment size | 48 bytes |
| KZG proof size | 48 bytes |
| Versioned hash prefix | 0x01 |
| Transaction type | 0x03 |

## Related Packages

- [`Nethereum.Model`](nethereum-model.md) — `Transaction4844`, `BlobEncoder`, `BlobSidecar`
- [`Nethereum.Signer`](../signing-and-key-management/nethereum-signer.md) — `Transaction4844Signer`
- [`Nethereum.EVM.Precompiles.Kzg`](../evm-simulator/nethereum-evm-precompiles-kzg.md) — `CkzgOperations`, `BlobSidecarBuilder`
- [`Nethereum.Beaconchain`](../consensus-light-client/nethereum-beaconchain.md) — `BeaconApiClient.GetBlobSidecarsAsync`
