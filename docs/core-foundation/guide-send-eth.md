---
title: Send ETH to an Address
sidebar_label: "Send ETH"
sidebar_position: 2
description: Transfer Ether between addresses using Nethereum — from simple one-liner to full EIP-1559 control
---

# Send ETH to an Address

Sending ETH is the most fundamental Ethereum operation. There are two approaches in Nethereum, and picking the right one depends on how much control you need:

| Approach | When to use | You manage |
|----------|------------|------------|
| **`EtherTransferService`** | Most cases — sending ETH as a simple value transfer | Nothing (gas, nonce, signing handled automatically) |
| **Manual transaction signing** | Offline signing, hardware wallets, custom nonce strategies, or when you don't have a live node connection | Everything (nonce, gas, signing, broadcasting) |

This guide covers both, starting with the easy path.

## Prerequisites

```bash
dotnet add package Nethereum.Web3
```

You need a private key and an RPC endpoint. For testing, use a local devchain (Hardhat, Anvil, or Nethereum's DevChain). For mainnet/testnets, get a free endpoint from [Infura](https://infura.io), [Alchemy](https://alchemy.com), or find public RPCs on [chainlist.org](https://chainlist.org).

---

## Quick Start: Send ETH in Three Lines

Create an account, connect to a node, and transfer:

<!-- tag:AccountTypesDocExampleTests:ShouldCreateAccountWithChainId -->
```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

var privateKey = "0xb5b1870957d373ef0eeffecc6e4812c0fd08f554b37b233526acc331bf1544f7";
var account = new Account(privateKey, Chain.MainNet);
// account.Address == "0x12890D2cce102216644c59daE5baed380d84830c"
```

```csharp
var web3 = new Web3(account, "https://mainnet.infura.io/v3/YOUR-PROJECT-ID");

var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync("0xRecipientAddress", 1.5m);
```

The `EtherTransferService` handles gas estimation, nonce management, and transaction signing automatically. The amount is in ETH (not wei) — `1.5m` sends 1.5 ETH.

---

## Controlling Gas: Legacy vs EIP-1559

Ethereum supports two fee models. Which one you use depends on the chain:

- **Legacy (pre-London)**: A single `gasPrice` — you pay exactly this per unit of gas. Still used on some L2s and sidechains.
- **EIP-1559 (post-London)**: A `maxFeePerGas` (your ceiling) and `maxPriorityFeePerGas` (tip to validators). You never pay more than `maxFeePerGas`, but often pay less. Used on Ethereum mainnet, most L2s, and modern chains.

### Legacy Transfer with Gas Price

<!-- tag:TransferEtherTests:ShouldTransferEtherWithGasPrice -->
```csharp
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(toAddress, 1.11m, gasPriceGwei: 2);
```

The `gasPriceGwei` parameter is in Gwei (not wei) for convenience. `2` means 2 Gwei = 2,000,000,000 wei.

### EIP-1559 Transfer

<!-- tag:TransferEtherTests:ShouldTransferWholeBalanceInEtherEIP1599 -->
```csharp
var transferService = web3.Eth.GetEtherTransferService();

// Let the node suggest current fee levels
var fee = await transferService.SuggestFeeToTransferWholeBalanceInEtherAsync();

var receipt = await transferService
    .TransferEtherAndWaitForReceiptAsync(
        toAddress, 0.1m,
        maxPriorityFee: fee.MaxPriorityFeePerGas.Value,
        maxFeePerGas: fee.MaxFeePerGas.Value);
```

`SuggestFeeToTransferWholeBalanceInEtherAsync()` queries the node's fee history and returns a `Fee1559` with recommended values. For more control over fee strategies, see the [Fee Estimation guide](guide-fee-estimation).

### Estimating Gas Before Sending

If you want to preview the gas cost before committing:

<!-- tag:TransferEtherTests:ShouldTransferEtherEstimatingAmount -->
```csharp
var transferService = web3.Eth.GetEtherTransferService();
var estimatedGas = await transferService.EstimateGasAsync(toAddress, 1.11m);

var receipt = await transferService
    .TransferEtherAndWaitForReceiptAsync(toAddress, 1.11m, gasPriceGwei: 2, estimatedGas);
```

For simple ETH transfers (no contract interaction), gas is always 21,000. Estimation is more useful when sending to contracts that execute code on receive.

---

## Sending the Entire Balance

A common task: drain an account completely. The challenge is that you need to reserve enough for gas fees, so the amount you send is `balance - gasCost`. Nethereum calculates this for you:

### Legacy (gas price)

```csharp
var transferService = web3.Eth.GetEtherTransferService();
var totalAmount = await transferService
    .CalculateTotalAmountToTransferWholeBalanceInEtherAsync(fromAddress, gasPriceGwei: 2m);

var receipt = await transferService
    .TransferEtherAndWaitForReceiptAsync(destinationAddress, totalAmount, gasPriceGwei: 2);
```

### EIP-1559

<!-- tag:TransferEtherTests:ShouldTransferWholeBalanceInEtherEIP1599 -->
```csharp
var transferService = web3.Eth.GetEtherTransferService();

var fee = await transferService.SuggestFeeToTransferWholeBalanceInEtherAsync();

var amount = await transferService
    .CalculateTotalAmountToTransferWholeBalanceInEtherAsync(
        fromAddress, maxFeePerGas: fee.MaxFeePerGas.Value);

var receipt = await transferService
    .TransferEtherAndWaitForReceiptAsync(
        destinationAddress, amount,
        fee.MaxPriorityFeePerGas.Value, fee.MaxFeePerGas.Value);
```

:::warning
`CalculateTotalAmountToTransferWholeBalanceInEtherAsync` throws if the balance is insufficient to cover gas. Always wrap in a try/catch when the balance might be near-zero.
:::

---

## Using Different Chains

The same private key produces the same address on every EVM chain. Specify the chain ID when creating the account so transactions include replay protection (EIP-155):

<!-- tag:AccountTypesDocExampleTests:ShouldCreateAccountForDifferentChains -->
```csharp
var mainnet = new Account(privateKey, Chain.MainNet);    // Chain ID 1
var sepolia = new Account(privateKey, 11155111);          // Sepolia testnet
var polygon = new Account(privateKey, 137);               // Polygon mainnet
```

The `Chain` enum covers major networks. For others, pass the chain ID as an integer — find chain IDs at [chainlist.org](https://chainlist.org).

---

## Manual Transaction Signing

When you need full control — offline signing, cold wallets, or custom workflows — build and sign the transaction yourself. This gives you the raw signed bytes to broadcast through any channel.

### Legacy Transaction

<!-- tag:SignerDocExampleTests:ShouldSignLegacyTransaction -->
```csharp
using Nethereum.Signer;

var signer = new LegacyTransactionSigner();
var receiverAddress = "0x13f022d72158410433cbd66f5dd8bf6d2d129924";
var amount = BigInteger.Parse("1000000000000000000"); // 1 ETH in wei
BigInteger nonce = 0;
BigInteger gasPrice = BigInteger.Parse("20000000000"); // 20 Gwei
BigInteger gasLimit = 21000;

var signedRlpHex = signer.SignTransaction(
    privateKey, receiverAddress, amount, nonce, gasPrice, gasLimit);
```

### EIP-1559 Transaction

<!-- tag:SignerDocExampleTests:ShouldSignEip1559Transaction -->
```csharp
using Nethereum.Model;
using Nethereum.Signer;

var signer = new Transaction1559Signer();
BigInteger chainId = 1;
BigInteger nonce = 0;
BigInteger maxPriorityFeePerGas = BigInteger.Parse("2000000000");
BigInteger maxFeePerGas = BigInteger.Parse("100000000000");
BigInteger gasLimit = 21000;
var receiverAddress = "0x13f022d72158410433cbd66f5dd8bf6d2d129924";
BigInteger amount = BigInteger.Parse("1000000000000000000");

var transaction = new Transaction1559(
    chainId, nonce, maxPriorityFeePerGas, maxFeePerGas,
    gasLimit, receiverAddress, amount, null, new List<AccessListItem>());

var signedRlpHex = signer.SignTransaction(privateKey, transaction);
```

After signing, broadcast with `web3.Eth.Transactions.SendRawTransaction.SendRequestAsync("0x" + signedRlpHex)`.

:::tip
Manual signing requires you to manage nonce (get via `web3.Eth.Transactions.GetTransactionCount`) and gas price (get via `web3.Eth.GasPrice.SendRequestAsync()`). For most applications, the `EtherTransferService` approach is simpler and less error-prone.
:::

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Sending amount in wei instead of ETH | `TransferEtherAndWaitForReceiptAsync` takes ETH as decimal. `1.5m` = 1.5 ETH |
| Missing chain ID | Always set chain ID on the `Account` — without it, transactions lack replay protection |
| Not waiting for receipt | `TransferEtherAsync` returns a tx hash immediately. Use `TransferEtherAndWaitForReceiptAsync` to wait for mining |
| Hardcoding gas price on EIP-1559 chains | Use `SuggestFeeToTransferWholeBalanceInEtherAsync()` or the [Fee Estimation strategies](guide-fee-estimation) |

## Next Steps

- [Fee Estimation](guide-fee-estimation) — advanced EIP-1559 fee strategies (time preference, median priority fee)
- [Transaction Models](guide-transaction-models) — understand Legacy, EIP-1559, EIP-2930, and EIP-4844 transaction types
- [Keys and Accounts](guide-keys-accounts) — key generation, keystores, HD wallets, and account types
- [Unit Conversion](guide-unit-conversion) — convert between ETH, Gwei, and wei

## Package References

- [Nethereum.Web3](nethereum-web3) — main entry point with `EtherTransferService`
- [Nethereum.Accounts](nethereum-accounts) — `Account` class and signing infrastructure
