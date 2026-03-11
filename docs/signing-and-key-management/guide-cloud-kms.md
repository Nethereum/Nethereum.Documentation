---
title: Cloud KMS Signing
sidebar_label: "Cloud KMS"
sidebar_position: 8
description: Sign Ethereum transactions with AWS KMS and Azure Key Vault HSMs
---

# Cloud KMS Signing

:::tip The Simple Way
```csharp
var signer = new AWSKeyManagementExternalSigner(keyId: "your-kms-key-id");
var externalAccount = new ExternalAccount(signer, chainId: 1);
await externalAccount.InitialiseAsync();
var web3 = new Web3(externalAccount, "https://your-rpc-url");

// From here, use web3 exactly like a regular account
var receipt = await web3.Eth.GetEtherTransferService()
    .TransferEtherAndWaitForReceiptAsync(toAddress, 0.1m);
```
Create a signer with your KMS key ID, initialise the account, and use the same `web3.Eth` methods. Signing happens in the HSM automatically.
:::

For production servers and institutional custody, cloud KMS provides the highest security level — keys are generated and stored inside FIPS 140-2 validated HSMs, with audit logging and access control built in. Your application sends signing requests to the cloud service and receives signatures back; the private key is never exported.

Like [hardware wallets](./guide-hardware-wallets), both AWS KMS and Azure Key Vault use the `ExternalAccount` pattern — once initialised, they work identically to a regular `Account` with `Web3`. Both support Legacy, EIP-1559, EIP-2930, and EIP-7702 transaction types.

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

## Next Steps

- [Hardware Wallets](./guide-hardware-wallets) — for end-user signing on a local device instead of cloud
- [EIP-7702 Delegation](../core-foundation/guide-eip7702) — both KMS signers support Type 4 transactions for EOA code delegation
- [Keys & Accounts](./guide-keys-accounts) — account types and the `ExternalAccount` pattern in detail
- [Send ETH](../core-foundation/guide-send-eth) — once set up, use the same `web3.Eth` transfer methods as any account
