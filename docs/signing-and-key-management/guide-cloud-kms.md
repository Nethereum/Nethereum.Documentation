---
title: Cloud KMS Signing
sidebar_label: "Cloud KMS"
sidebar_position: 6
description: Sign Ethereum transactions with AWS KMS and Azure Key Vault HSMs
---

# Cloud KMS Signing

Sign Ethereum transactions using cloud-managed HSM keys. The private key is generated inside the HSM and never leaves it — your application only receives signatures.

Both implementations support Legacy, EIP-1559, EIP-2930, and EIP-7702 transaction types.

## AWS Key Management Service

```bash
dotnet add package Nethereum.Signer.AWSKeyManagement
```

### Create the KMS Key

```bash
aws kms create-key \
  --key-spec ECC_SECG_P256K1 \
  --key-usage SIGN_VERIFY \
  --description "Ethereum signing key"
```

### Sign Transactions

```csharp
using Nethereum.Signer.AWSKeyManagement;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

// Uses default AWS credentials chain (env vars, profile, IAM role)
var signer = new AWSKeyManagementExternalSigner(keyId: "your-kms-key-id");

var externalAccount = new ExternalAccount(signer, chainId: 1);
await externalAccount.InitialiseAsync();

var web3 = new Web3(externalAccount, "https://your-rpc-url");

var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(toAddress, 0.1m);
```

### Authentication Methods

```csharp
// Default credentials chain (recommended for Lambda, ECS, EC2)
var signer = new AWSKeyManagementExternalSigner(keyId);

// Explicit access key
var signer = new AWSKeyManagementExternalSigner(
    keyId, accessKeyId: "AKIA...", secretAccessKey: "...");

// Specific region
var signer = new AWSKeyManagementExternalSigner(
    keyId, region: Amazon.RegionEndpoint.EUWest1);
```

## Azure Key Vault

```bash
dotnet add package Nethereum.Signer.AzureKeyVault
```

### Create the Key

```bash
az keyvault key create \
  --vault-name my-vault \
  --name ethereum-key \
  --kty EC \
  --curve SECP256K1
```

### Sign Transactions

```csharp
using Nethereum.Signer.AzureKeyVault;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Azure.Identity;

// Uses DefaultAzureCredential (managed identity, Azure CLI, etc.)
var signer = new AzureKeyVaultExternalSigner(
    keyIdentifier: "https://my-vault.vault.azure.net/keys/ethereum-key");

var externalAccount = new ExternalAccount(signer, chainId: 1);
await externalAccount.InitialiseAsync();

var web3 = new Web3(externalAccount, "https://your-rpc-url");

var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(toAddress, 0.1m);
```

### Authentication Methods

```csharp
// DefaultAzureCredential (auto-detect — recommended)
var signer = new AzureKeyVaultExternalSigner(keyIdentifier);

// Managed identity (Azure VMs, App Service, Functions)
var signer = new AzureKeyVaultExternalSigner(
    keyIdentifier, new ManagedIdentityCredential());

// Service principal
var signer = new AzureKeyVaultExternalSigner(
    keyIdentifier, new ClientSecretCredential(tenantId, clientId, clientSecret));
```

## Comparison

| Feature | AWS KMS | Azure Key Vault |
|---|---|---|
| Package | `Nethereum.Signer.AWSKeyManagement` | `Nethereum.Signer.AzureKeyVault` |
| Key curve | ECC_SECG_P256K1 | EC SECP256K1 |
| HSM backing | Standard or CloudHSM | Standard or Premium (FIPS 140-2 Level 3) |
| Transaction types | Legacy, 1559, 2930, 7702 | Legacy, 1559, 2930, 7702 |
| Audit logging | CloudTrail | Azure Monitor |
| Pricing model | Per-request + key storage | Per-operation + key storage |

:::tip Claude Code
Install the Nethereum skills plugin for AI-assisted development: `/plugin install nethereum-skills`
:::

## Next Steps

- [Hardware Wallets](./guide-hardware-wallets) — Ledger and Trezor signing
- [Keys & Accounts](../core-foundation/guide-keys-accounts) — account types
