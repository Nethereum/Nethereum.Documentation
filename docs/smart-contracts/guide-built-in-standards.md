---
title: Built-in Contract Standards
sidebar_label: "Built-in Standards"
sidebar_position: 9
description: Use Nethereum's built-in typed services for ERC-20, ERC-721, ERC-1155, ENS, and other Ethereum standards
---

# Built-in Contract Standards

:::tip The Simple Way
```csharp
var erc20 = web3.Eth.ERC20.GetContractService(address);
var erc721 = web3.Eth.ERC721.GetContractService(address);
var erc1155 = web3.Eth.ERC1155.GetContractService(address);
```
Built-in typed services for all major standards — no ABI or code generation needed.
:::

Nethereum ships typed services for common Ethereum standards, all accessible through `web3.Eth`. These services provide strongly-typed methods so you never need to write raw ABI JSON for standard interactions.

```bash
dotnet add package Nethereum.Web3
```

## Overview of Built-in Services

| Service | Access | Standard | Purpose |
|---------|--------|----------|---------|
| `ERC20Service` | `web3.Eth.ERC20` | ERC-20 | Fungible tokens |
| `ERC721Service` | `web3.Eth.ERC721` | ERC-721 | Non-fungible tokens (NFTs) |
| `ERC1155Service` | `web3.Eth.ERC1155` | ERC-1155 | Multi-token standard |
| `ERC165SupportsInterfaceService` | `web3.Eth.ERC165` | ERC-165 | Interface detection |
| `ERC1271Service` | `web3.Eth.ERC1271` | ERC-1271 | Signature validation for contracts |
| `ERC6492Service` | `web3.Eth.ERC6492` | ERC-6492 | Signature validation for pre-deploy contracts |
| `EIP3009Service` | `web3.Eth.EIP3009` | EIP-3009 | Transfer with authorization (gasless) |
| `ERC2535DiamondService` | `web3.Eth.ERC2535Diamond` | ERC-2535 | Diamond proxy pattern |
| `ProofOfHumanityService` | `web3.Eth.ProofOfHumanity` | -- | Identity registry |
| `ENSService` | `web3.Eth.GetEnsService()` | ENS | Ethereum Name Service |
| `Create2DeterministicDeploymentProxyService` | `web3.Eth.Create2DeterministicDeploymentProxyService` | -- | CREATE2 deterministic deploy |

## ERC-20: Fungible Tokens

Query any ERC-20 token without defining DTOs:

```csharp
var web3 = new Web3("https://mainnet.infura.io/v3/YOUR_KEY");
var tokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // DAI

var erc20 = web3.Eth.ERC20.GetContractService(tokenAddress);

var name = await erc20.NameQueryAsync();
var symbol = await erc20.SymbolQueryAsync();
var decimals = await erc20.DecimalsQueryAsync();
var totalSupply = await erc20.TotalSupplyQueryAsync();

var balance = await erc20.BalanceOfQueryAsync("0xYourAddress");
var allowance = await erc20.AllowanceQueryAsync("0xOwner", "0xSpender");
```

Transfer tokens:

```csharp
var web3 = new Web3(account, "https://mainnet.infura.io/v3/YOUR_KEY");
var erc20 = web3.Eth.ERC20.GetContractService(tokenAddress);

var receipt = await erc20.TransferRequestAndWaitForReceiptAsync(
    "0xRecipient", Web3.Convert.ToWei(100));
```

## ERC-721: Non-Fungible Tokens (NFTs)

```csharp
var nftAddress = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"; // BAYC
var erc721 = web3.Eth.ERC721.GetContractService(nftAddress);

var name = await erc721.NameQueryAsync();
var symbol = await erc721.SymbolQueryAsync();
var balance = await erc721.BalanceOfQueryAsync("0xOwnerAddress");
var owner = await erc721.OwnerOfQueryAsync(1234); // token ID
var tokenUri = await erc721.TokenURIQueryAsync(1234);
```

## ERC-1155: Multi-Token Standard

```csharp
var multiTokenAddress = "0xYourERC1155Contract";
var erc1155 = web3.Eth.ERC1155.GetContractService(multiTokenAddress);

// Single balance
var balance = await erc1155.BalanceOfQueryAsync("0xOwner", 1); // token ID 1

// Batch balance query
var balances = await erc1155.BalanceOfBatchQueryAsync(
    new[] { "0xOwner1", "0xOwner2" },
    new[] { new System.Numerics.BigInteger(1), new System.Numerics.BigInteger(2) });

// Token URI
var uri = await erc1155.UriQueryAsync(1);
```

## ERC-165: Interface Detection

Check if a contract supports a specific interface:

```csharp
var erc165 = web3.Eth.ERC165.GetContractService(contractAddress);

var supportsErc721 = await erc165
    .SupportsInterfaceQueryAsync("0x80ac58cd"); // ERC-721 interface ID

var supportsErc1155 = await erc165
    .SupportsInterfaceQueryAsync("0xd9b67a26"); // ERC-1155 interface ID
```

Common interface IDs:

| Standard | Interface ID |
|----------|-------------|
| ERC-165 | `0x01ffc9a7` |
| ERC-721 | `0x80ac58cd` |
| ERC-721 Metadata | `0x5b5e139f` |
| ERC-1155 | `0xd9b67a26` |
| ERC-1155 Metadata | `0x0e89341c` |

## ERC-1271: Signature Validation for Contracts

Verify that a signature was produced by a smart contract wallet (e.g., Gnosis Safe):

```csharp
var erc1271 = web3.Eth.ERC1271.GetContractService(contractAddress);

var isValid = await erc1271
    .IsValidSignatureAndValidateReturnQueryAsync(messageHash, signature);
```

Returns `true` if the contract's `isValidSignature` returns the magic value `0x1626ba7e`.

## ERC-6492: Signature Validation for Pre-Deploy Contracts

Verify signatures from smart contract wallets that haven't been deployed yet:

```csharp
var isValid = await web3.Eth.ERC6492
    .IsValidSignatureQueryAsync(contractAddress, messageHash, signature);
```

## EIP-3009: Transfer With Authorization (Gasless Transfers)

Used by USDC and other stablecoins for gasless transfers via signed authorizations. Nethereum provides both a low-level `EIP3009Service` and a higher-level X402 implementation:

### Low-level EIP-3009 service

```csharp
var eip3009 = web3.Eth.EIP3009.GetContractService(usdcAddress);

var receipt = await eip3009.TransferWithAuthorizationRequestAndWaitForReceiptAsync(
    from, to, value, validAfter, validBefore, nonce, v, r, s);
```

### X402 TransferWithAuthorization (higher-level)

The `Nethereum.X402` package provides a complete workflow for EIP-3009 payments:

```bash
dotnet add package Nethereum.X402
```

```csharp
using Nethereum.X402.Blockchain;
using Nethereum.X402.Models;
using Nethereum.X402.Signers;

// 1. Build the authorization
var builder = new TransferWithAuthorisationBuilder();
var authorization = builder.BuildFromPaymentRequirements(requirements, payerAddress);

// 2. Sign with EIP-712 typed data
var signer = new TransferWithAuthorisationSigner();
var signature = await signer.SignWithPrivateKeyAsync(
    authorization, "USDC", "2", chainId, usdcAddress, privateKey);

// 3. Verify the payment (off-chain)
var service = new X402TransferWithAuthorisation3009Service(
    facilitatorPrivateKey, rpcEndpoints, tokenAddresses, chainIds, tokenNames, tokenVersions);
var result = await service.VerifyPaymentAsync(paymentPayload, requirements);

// 4. Settle on-chain
var settlement = await service.SettlePaymentAsync(paymentPayload, requirements);
```

### X402 ReceiveWithAuthorization

In this pattern, the **receiver** submits the transaction and pays gas:

```csharp
var builder = new ReceiveWithAuthorisationBuilder();
var authorization = builder.BuildFromPaymentRequirements(requirements, payerAddress);

var signer = new TransferWithAuthorisationSigner();
var signature = await signer.SignReceiveWithPrivateKeyAsync(
    authorization, "USDC", "2", chainId, usdcAddress, payerPrivateKey);

var service = new X402ReceiveWithAuthorisation3009Service(
    receiverPrivateKey, rpcEndpoints, tokenAddresses, chainIds, tokenNames, tokenVersions);
var settlement = await service.SettlePaymentAsync(paymentPayload, requirements);
```

## ENS: Ethereum Name Service

Resolve ENS names to addresses and reverse-resolve addresses to names:

```csharp
var ensService = web3.Eth.GetEnsService();

// Forward resolution: name → address
var address = await ensService.ResolveAddressAsync("vitalik.eth");

// Reverse resolution: address → name
var name = await ensService.ReverseResolveAsync("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
```

## Historical Queries with BlockParameter

All query methods accept an optional `BlockParameter` to read state at a specific block:

```csharp
var blockParam = new Nethereum.RPC.Eth.DTOs.BlockParameter(15000000);

var historicalBalance = await erc20.BalanceOfQueryAsync("0xAddress", blockParam);
```

## Code-Generated Contract Services (ContractServiceBase)

The Nethereum code generator produces typed service classes that inherit from `ContractServiceBase`. These services provide:

```csharp
// Introspect all functions, events, and errors registered in the service
var functionTypes = myContractService.GetAllFunctionTypes();
var eventTypes = myContractService.GetAllEventTypes();
var errorTypes = myContractService.GetAllErrorTypes();

// Get ABI metadata
var functionABIs = myContractService.GetAllFunctionABIs();
var eventABIs = myContractService.GetAllEventABIs();
var errorABIs = myContractService.GetAllErrorABIs();

// Get Keccak signatures
var functionSigs = myContractService.GetAllFunctionSignatures();
var eventSigs = myContractService.GetAllEventsSignatures();
var errorSigs = myContractService.GetAllErrorsSignatures();
```

For automatic custom error decoding from code-generated services, see the [Error Handling guide](./guide-error-handling.md).

## Low-Level Storage Access (StorageUtil)

Read raw contract storage slots using `StorageUtil` for Solidity mapping key calculation:

```csharp
using Nethereum.Contracts.ContractStorage;
using Nethereum.RPC.Eth.DTOs;

// Calculate the storage key for mapping(address => ...) at slot 0
var storageKey = StorageUtil.CalculateMappingAddressStorageKey(
    "0xOwnerAddress", 0);

// Read the raw storage value
var storageValue = await web3.Eth.GetStorageAt
    .SendRequestAsync(contractAddress, storageKey);
```

This is useful for reading internal contract state without needing an ABI (e.g., reading ERC-20 balances directly from storage, or verifying proxy implementation addresses).
## Next Steps

- [CREATE2 Deployment](./guide-create2-deployment.md) -- deploy contracts to deterministic addresses across chains
- [ERC-20 Tokens](./erc20.md) -- detailed ERC-20 guide with transfer and event examples
- [Events & Logs](./guide-events.md) -- subscribe to Transfer, Approval, and custom events
- [Error Handling](./guide-error-handling.md) -- handle custom revert errors from contract calls
