---
title: CREATE2 Deterministic Deployment
sidebar_label: "CREATE2 Deployment"
sidebar_position: 10
description: Deploy contracts to deterministic addresses using CREATE2 with Nethereum
---

# CREATE2 Deterministic Deployment

:::tip The Simple Way
```csharp
var create2 = web3.Eth.Create2DeterministicDeploymentProxyService;
var address = create2.CalculateCreate2Address(deployment, salt);
var receipt = await create2.DeployContractRequestAndWaitForReceiptAsync(deployment, salt);
```
Predict the address, then deploy — same address on every chain with the same salt.
:::

CREATE2 lets you deploy a contract to a predictable address that depends only on the deployer address, a salt, and the contract bytecode. This is useful for counterfactual deployments (predicting addresses before deployment), deploying the same contract to the same address across multiple chains, and factory patterns.

Nethereum provides `Create2DeterministicDeploymentProxyService` accessible via `web3.Eth.Create2DeterministicDeploymentProxyService`.

```bash
dotnet add package Nethereum.Web3
```

## How CREATE2 Addressing Works

The CREATE2 address is computed as:

```
address = keccak256(0xff ++ deployerAddress ++ salt ++ keccak256(bytecode))[12:]
```

This means the resulting address is fully deterministic -- if you know the deployer, salt, and bytecode, you can compute the address before deployment.

## Predict a Contract Address

Calculate the CREATE2 address without deploying:

```csharp
using Nethereum.Web3;
using Nethereum.Contracts.Create2Deployment;

var web3 = new Web3(account, rpcUrl);
var create2Service = web3.Eth.Create2DeterministicDeploymentProxyService;

var salt = "0x0000000000000000000000000000000000000000000000000000000000000001";

var predictedAddress = create2Service
    .CalculateCreate2Address<MyContractDeployment>(
        new MyContractDeployment { /* constructor args */ },
        proxyAddress,
        salt);

Console.WriteLine($"Contract will deploy to: {predictedAddress}");
```

## Check If Already Deployed

Before deploying, check if the contract already exists at the predicted address:

```csharp
var alreadyDeployed = await create2Service
    .HasContractAlreadyDeployedAsync(predictedAddress);

if (!alreadyDeployed)
{
    // Safe to deploy
}
```

## Deploy via CREATE2 Proxy

The service uses a deterministic deployment proxy. First ensure the proxy is deployed, then deploy your contract through it:

```csharp
var web3 = new Web3(account, rpcUrl);
var create2Service = web3.Eth.Create2DeterministicDeploymentProxyService;

var salt = "0x0000000000000000000000000000000000000000000000000000000000000001";

// Deploy your contract via CREATE2
var result = await create2Service
    .DeployContractRequestAndWaitForReceiptAsync<MyContractDeployment>(
        new MyContractDeployment { /* constructor args */ },
        proxyAddress,
        salt);

Console.WriteLine($"Deployed to: {result.ContractAddress}");
Console.WriteLine($"Transaction: {result.TransactionHash}");
```

## Deploy the Proxy Itself

If the deterministic deployment proxy isn't deployed on your chain yet:

```csharp
var proxyAddress = await create2Service
    .DeployProxyAndGetContractAddressAsync();

Console.WriteLine($"Proxy deployed at: {proxyAddress}");
```

## Check If Proxy Exists

```csharp
var proxyDeployed = await create2Service
    .HasProxyBeenDeployedAsync(proxyAddress);
```

## EIP-155 Chain-Specific Deployment

For chain-specific deterministic deployments (where the deployment transaction includes the chain ID):

```csharp
var deployment = await create2Service
    .GenerateEIP155DeterministicDeploymentAsync();
```

This creates a deployment that is specific to the current chain, producing a different proxy address per chain but with a deterministic result on each chain.

## Key Types

- `Create2DeterministicDeploymentProxyService` -- main service accessible via `web3.Eth.Create2DeterministicDeploymentProxyService`
- `Create2ContractDeploymentTransactionResult` -- result containing `ContractAddress` and `TransactionHash`
- `ContractUtils.CalculateCreate2Address()` -- low-level address calculation utility

## Common Patterns

| Task | Method |
|------|--------|
| Predict address | `create2Service.CalculateCreate2Address<T>(deployment, proxy, salt)` |
| Check if deployed | `create2Service.HasContractAlreadyDeployedAsync(address)` |
| Deploy contract | `create2Service.DeployContractRequestAndWaitForReceiptAsync<T>(deployment, proxy, salt)` |
| Deploy proxy | `create2Service.DeployProxyAndGetContractAddressAsync()` |
| Check proxy exists | `create2Service.HasProxyBeenDeployedAsync(proxyAddress)` |
| EIP-155 deployment | `create2Service.GenerateEIP155DeterministicDeploymentAsync()` |
## Next Steps

- [Deploy a Contract](./deploy-a-contract.md) -- standard contract deployment
- [Built-in Contract Standards](./guide-built-in-standards.md) -- typed services for ERC-20, ERC-721, and more
- [Error Handling](./guide-error-handling.md) -- handle deployment errors and custom reverts
