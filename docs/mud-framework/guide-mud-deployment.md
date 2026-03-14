---
title: Deploy a MUD World
sidebar_label: Deploy a World
sidebar_position: 5
description: Deploy MUD World contracts, register namespaces and tables, deploy systems with CREATE2, and manage access control
---

# Deploy a MUD World

Deploying a MUD application involves creating a World contract, registering namespaces with tables, and deploying system contracts. This guide covers the deployment sequence, namespace registration, table registration, system deployment with CREATE2, and access control management.

## Prerequisites

```bash
dotnet add package Nethereum.Mud.Contracts
```

You need a funded account and an RPC endpoint. For local development, use a [DevChain](../devchain/overview) or Anvil.

## Deployment Sequence

A MUD World deployment follows a specific order — each step depends on the previous:

1. **Deploy the CREATE2 deterministic proxy** — enables deterministic addresses for systems
2. **Deploy the World Factory** and its dependencies (CoreModule, etc.)
3. **Deploy the World contract** via the factory
4. **Register namespaces** — create access-control boundaries
5. **Register tables** — define the data schema on-chain
6. **Deploy and register systems** — deploy system contracts and register them under namespaces
7. **Configure access control** — grant systems access to tables they need
8. **Initialise state** — set initial table values

### Deploy a World

The World contract is deployed through a WorldFactory, which ensures consistent initialisation:

```csharp
using Nethereum.Web3;
using Nethereum.Mud.Contracts.World;

var web3 = new Web3(new Account(privateKey), rpcUrl);

// Deploy World via factory
var worldReceipt = await WorldService.DeployContractAndWaitForReceiptAsync(
    web3, new WorldDeployment());

string worldAddress = worldReceipt.ContractAddress;
var worldService = new WorldService(web3, worldAddress);
```

For full deployment with CREATE2 factory and World Factory, see the integration tests in the Nethereum repository — particularly `WorldDeploymentTest.cs` which demonstrates the complete sequence.

## Register Namespaces

Namespaces are access-control boundaries that group related tables and systems. Register a namespace before adding tables or systems to it:

```csharp
var appNamespace = new AppNamespace(web3, worldAddress);

// Check if already registered
bool isRegistered = await appNamespace.IsNamespaceRegistered();

if (!isRegistered)
{
    var receipt = await appNamespace.RegisterNamespaceRequestAndWaitForReceiptAsync();
}
```

The namespace owner (the account that registers it) controls who can register tables and systems within it.

## Register Tables

Tables must be registered on-chain before they can be used. The generated table services provide a registration method:

```csharp
var playerService = new PlayerTableService(web3, worldAddress);

// Register the table's schema on-chain
await playerService.RegisterTableRequestAndWaitForReceiptAsync();
```

This writes the table's schema (key types, value types, field names) to the World's Store, enabling the World to validate and encode/decode records for this table.

For batch registration of multiple tables, use system call data:

```csharp
// Get the registration call data for batch execution
var registrationData = playerService.GetRegisterTableFunctionBatchSystemCallData();
```

## Deploy Systems

Systems are smart contracts registered under a namespace. They're typically deployed with CREATE2 for deterministic addresses:

```csharp
using Nethereum.Mud.Contracts.World.Systems.RegistrationSystem;

var registrationService = new RegistrationSystemService(web3, worldAddress);

// Deploy a system contract
var systemReceipt = await GameSystemService.DeployContractAndWaitForReceiptAsync(
    web3, new GameSystemDeployment());

string systemAddress = systemReceipt.ContractAddress;
```

After deploying the system contract, register it with the World under a namespace. The World then routes calls to that system through its `call` function.

## Access Control

By default, only the namespace owner can call systems and modify tables. Use `AccessManagementSystemService` to grant access to other accounts or systems:

```csharp
using Nethereum.Mud.Contracts.World.Systems.AccessManagementSystem;

var accessService = new AccessManagementSystemService(web3, worldAddress);

// Grant a system access to a resource (table or namespace)
await accessService.GrantAccessRequestAndWaitForReceiptAsync(
    new GrantAccessFunction
    {
        ResourceId = ResourceEncoder.EncodeTable("app", "Player"),
        Grantee = systemAddress
    });
```

This allows the deployed system to read and write the Player table through the World contract.

## System Calls

Once deployed and registered, systems are called through the World contract. The generated system services handle this routing:

```csharp
var gameSystem = new GameSystemService(web3, worldAddress);

// Call a system function through the World
await gameSystem.MoveRequestAndWaitForReceiptAsync(
    new MoveFunction { X = 10, Y = 20 });
```

For delegated calls (calling on behalf of another account):

```csharp
await worldService.CallFromRequestAndWaitForReceiptAsync(
    delegatorAddress, systemId, callData);
```

## Error Handling

MUD World contracts use custom errors for revert reasons. The `NamespaceBase` class provides error decoding:

```csharp
try
{
    await appNamespace.RegisterNamespaceRequestAndWaitForReceiptAsync();
}
catch (SmartContractCustomErrorRevertException ex)
{
    var decoded = appNamespace.FindCustomErrorException(ex);
    if (decoded != null)
    {
        Console.WriteLine($"MUD error: {decoded.ErrorABI.Name}");
    }
}
```

Common MUD errors include `World_ResourceAlreadyExists` (namespace or table already registered), `World_AccessDenied` (caller lacks permission), and `World_ResourceNotFound` (referencing an unregistered resource).

## Common Gotchas

- **Order matters** — namespaces must be registered before tables, and tables before systems that use them. The World contract will revert if you try to register a table in an unregistered namespace.
- **CREATE2 addresses are deterministic** — the same bytecode + salt always produces the same address. This is useful for multi-chain deployments but means you can't redeploy the same system to the same address.
- **Namespace ownership** — the account that registers a namespace owns it. Transfer ownership carefully, as the owner controls all access to tables and systems within that namespace.
- **Gas limits for batch deployment** — registering many tables in a single transaction can hit gas limits. Split large registrations into batches.

## Next Steps

- **[MUD Quickstart](guide-mud-quickstart)** — the code generation workflow and namespace pattern
- **[Tables and Records](guide-mud-tables)** — reading, writing, and querying table records
- **[Indexing Store Events](guide-mud-indexing)** — process Store events into repositories for off-chain state
