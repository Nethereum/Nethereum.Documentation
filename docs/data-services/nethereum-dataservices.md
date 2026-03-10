---
title: Nethereum.DataServices
sidebar_label: Nethereum.DataServices
description: Client access to Etherscan, Sourcify, 4Byte, and ChainList APIs
---

# Nethereum.DataServices

Client library for accessing external blockchain data services — Etherscan REST APIs, Sourcify contract verification, 4Byte signature lookups, and chain metadata.

## Installation

```bash
dotnet add package Nethereum.DataServices
```

## Supported Services

| Service | Description |
|---------|-------------|
| **Etherscan** | Contract ABI retrieval, verified source code, transaction history |
| **Sourcify** | Decentralised contract verification and metadata |
| **4Byte** | Function and event signature directory lookups |
| **ChainList** | Chain metadata, RPC endpoints, and network information |

## Key Components

### ABI Retrieval

Fetch verified contract ABIs from multiple sources with automatic fallback:

```csharp
using Nethereum.DataServices;

// ABIInfoStorage provides a composite pattern:
// cache → Sourcify → Etherscan → 4Byte
var abiStorage = ABIInfoStorageFactory.CreateDefault(cache);
var abi = await abiStorage.GetABIAsync(contractAddress, chainId);
```

### Factory Methods

| Method | Sources |
|--------|---------|
| `CreateDefault(cache)` | Cache → Sourcify → Etherscan → 4Byte |
| `CreateWithSourcifyOnly(cache)` | Cache → Sourcify |
| `CreateWithEtherscanOnly(cache)` | Cache → Etherscan |
| `CreateLocalOnly(cache)` | Cache only |
| `CreateCustom(...)` | Custom provider chain |

## Dependencies

- `Nethereum.ABI`
- `Nethereum.EVM`
- `Nethereum.Util.Rest`

## Related Packages

- [Nethereum.Explorer](../data-and-indexing/nethereum-explorer) — blockchain explorer that uses DataServices for ABI resolution
- [Nethereum.TokenServices](../data-and-indexing/nethereum-tokenservices) — token metadata, prices, and logos
