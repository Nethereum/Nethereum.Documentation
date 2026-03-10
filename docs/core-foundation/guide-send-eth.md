---
title: Send ETH to an Address
sidebar_label: "Send ETH"
sidebar_position: 2
description: Transfer Ether between addresses using Nethereum
---

Learn how to send ETH from one address to another using Nethereum.

## Install

```bash
dotnet add package Nethereum.Web3
```

## Create an Account

<!-- tag:AccountTypesDocExampleTests:ShouldCreateAccountWithChainId -->
```csharp
var privateKey = "0xb5b1870957d373ef0eeffecc6e4812c0fd08f554b37b233526acc331bf1544f7";
var account = new Account(privateKey, Chain.MainNet);
// account.Address == "0x12890D2cce102216644c59daE5baed380d84830c"
```

## Connect to a Node

```csharp
var web3 = new Web3(account, "https://mainnet.infura.io/v3/YOUR-PROJECT-ID");
```

## Transfer ETH

```csharp
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync("0xRecipientAddress", 1.5m);
```

## Use Different Chains

The same private key produces the same address on every EVM chain. Set the chain ID when creating the account.

<!-- tag:AccountTypesDocExampleTests:ShouldCreateAccountForDifferentChains -->
```csharp
var mainnet = new Account(privateKey, Chain.MainNet);
var sepolia = new Account(privateKey, 11155111);
var polygon = new Account(privateKey, 137);
```

## Sign a Legacy Transaction Manually

<!-- tag:SignerDocExampleTests:ShouldSignLegacyTransaction -->
```csharp
var signer = new LegacyTransactionSigner();
var receiverAddress = "0x13f022d72158410433cbd66f5dd8bf6d2d129924";
var amount = BigInteger.Parse("1000000000000000000"); // 1 ETH in wei
BigInteger nonce = 0;
BigInteger gasPrice = BigInteger.Parse("20000000000"); // 20 Gwei
BigInteger gasLimit = 21000;

var signedRlpHex = signer.SignTransaction(
    privateKey, receiverAddress, amount, nonce, gasPrice, gasLimit);
```

## Sign an EIP-1559 Transaction

<!-- tag:SignerDocExampleTests:ShouldSignEip1559Transaction -->
```csharp
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

## Next Steps

- [Guide: ABI Encoding](guide-abi-encoding.md) -- encode and decode smart contract data
- [Guide: Keys and Accounts](guide-keys-accounts.md) -- key generation, keystores, and account types

## Package References

- [Nethereum.Web3](nethereum-web3.md)
- [Nethereum.Accounts](nethereum-accounts.md)
