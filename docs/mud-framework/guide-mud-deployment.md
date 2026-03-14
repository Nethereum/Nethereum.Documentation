---
title: Deploy a MUD World
sidebar_label: Deploy a World
sidebar_position: 5
description: Deploy MUD World contracts, batch register tables and systems, deploy with CREATE2, manage access control and delegation
---

# Deploy a MUD World

Deploying a MUD application means standing up the enhanced diamond — creating a World contract, registering your namespace with its tables, and deploying system contracts. The namespace pattern shown in the [Quickstart](guide-mud-quickstart) handles most of the complexity: `BatchRegisterAllTablesRequestAndWaitForReceiptAsync` registers every table in one transaction, and `DeployAllCreate2ContractSystemsRequestAndWaitForReceiptAsync` deploys every system with deterministic addresses.

:::tip The Simple Way
```csharp
var app = new AppNamespace(web3, worldAddress);
await app.RegisterNamespaceRequestAndWaitForReceiptAsync();
await app.Tables.BatchRegisterAllTablesRequestAndWaitForReceiptAsync();
await app.Systems.DeployAllCreate2ContractSystemsRequestAndWaitForReceiptAsync(deployerAddress, salt);
await app.Systems.BatchRegisterAllSystemsRequestAndWaitForReceiptAsync(deployerAddress, salt);
```
Four calls: register namespace, batch register tables, deploy systems, register systems. Your namespace is live.
:::

## Prerequisites

```bash
dotnet add package Nethereum.Mud.Contracts
```

You need a funded account and an RPC endpoint. For local development, use a [DevChain](../devchain/overview) or Anvil.

## Deployment Sequence

A MUD World deployment follows a specific order — each step depends on the previous:

1. **Deploy the CREATE2 deterministic proxy** — enables deterministic addresses
2. **Deploy the World Factory** and its core system dependencies
3. **Deploy the World contract** via the factory
4. **Register your namespace** — create the access-control boundary
5. **Batch register all tables** — define data schemas on-chain in one transaction
6. **Deploy all systems via CREATE2** — deploy system contracts with deterministic addresses
7. **Batch register all systems** — register systems and their function selectors in one transaction
8. **Use your namespace** — call systems, read tables, set up delegation

The following sections walk through each step with code from the actual integration tests.

## Step 1: Deploy the CREATE2 Proxy

The CREATE2 deterministic deployment proxy is a standard Ethereum contract that enables deploying contracts to predictable addresses. This is used for both the World Factory infrastructure and your application's system contracts:

```csharp
var web3 = new Web3(new Account(privateKey), rpcUrl);

var create2Service = web3.Eth.Create2DeterministicDeploymentProxyService;

// Deploy the CREATE2 proxy (EIP-155 compatible)
var proxyDeployment = await create2Service
    .GenerateEIP155DeterministicDeploymentUsingPreconfiguredSignatureAsync();
var deployerAddress = await create2Service
    .DeployProxyAndGetContractAddressAsync(proxyDeployment);
```

The `deployerAddress` is the CREATE2 proxy contract — you'll pass it to every subsequent CREATE2 deployment. On testnets and many mainnets, this proxy may already be deployed.

## Step 2: Deploy the World Factory

The `WorldFactoryDeployService` deploys all core MUD infrastructure — the AccessManagement, BalanceTransfer, BatchCall, and Registration system contracts, plus the InitModule and WorldFactory itself:

```csharp
// Generate a unique salt for this deployment
var salt = Nethereum.Util.Sha3Keccack.Current.CalculateHash(
    new Random().Next(0, 1000000).ToString());

var worldFactoryService = new WorldFactoryDeployService();

// Deploy all World infrastructure contracts via CREATE2
var worldFactoryAddresses = await worldFactoryService
    .DeployWorldFactoryContractAndSystemDependenciesAsync(
        web3, deployerAddress, salt);
```

The `WorldFactoryContractAddresses` returned contains the addresses of all deployed infrastructure: `AccessManagementSystemAddress`, `BalanceTransferSystemAddress`, `BatchCallSystemAddress`, `RegistrationSystemAddress`, `InitModuleAddress`, and `WorldFactoryAddress`.

## Step 3: Deploy the World

With the factory deployed, create a World contract instance. The factory ensures consistent initialisation with all core systems registered:

```csharp
var worldEvent = await worldFactoryService.DeployWorldAsync(
    web3, salt, worldFactoryAddresses);

var worldAddress = worldEvent.NewContract;
```

The `WorldDeployedEventDTO` contains the new World contract address. You can verify the deployment succeeded by checking the store version:

```csharp
var world = new WorldNamespace(web3, worldAddress);
var version = await world.WorldService.StoreVersionQueryAsStringAsync();
// Returns "2.0.0"
```

`WorldNamespace` is a built-in namespace that gives you access to the World's core systems and tables — `world.Systems.RegistrationSystem`, `world.Systems.AccessManagementSystem`, `world.Tables.SystemsTableService`, etc.

## Step 4: Register Your Namespace

Create your application namespace and register it with the World. The namespace is the access-control boundary that groups your tables and systems:

```csharp
var app = new AppNamespace(web3, worldAddress);

// Checks IsNamespaceRegistered() internally — safe to call multiple times
await app.RegisterNamespaceRequestAndWaitForReceiptAsync();
```

`RegisterNamespaceRequestAndWaitForReceiptAsync` checks `Store.Tables.ResourceIdsTableService` first — if the namespace is already registered, it returns `null` without sending a transaction. The account that registers the namespace becomes its owner.

## Step 5: Batch Register All Tables

The `TablesServices` base class collects all table services registered in the constructor. `BatchRegisterAllTablesRequestAndWaitForReceiptAsync` registers every table's schema on-chain in a single batch call through the World's `BatchCallSystem`:

```csharp
var receipt = await app.Tables.BatchRegisterAllTablesRequestAndWaitForReceiptAsync();
```

This writes every table's schema (key types, value types, field names) to the World's Store in one transaction, enabling the World to validate and encode/decode records. Under the hood, it collects `GetRegisterTableFunctionBatchSystemCallData()` from each table service and executes them through `BatchCallSystemService.BatchCallRequestAndWaitForReceiptAsync`.

To exclude specific tables (e.g., tables already registered from a previous deployment):

```csharp
var receipt = await app.Tables.BatchRegisterAllTablesRequestAndWaitForReceiptAsync(
    new CounterTableResource());  // Skip the Counter table
```

For registering a specific subset of tables instead:

```csharp
var receipt = await app.Tables.BatchRegisterTablesAndWaitForReceiptAsync(
    new PlayerTableResource(), new InventoryTableResource());
```

You can also register tables one at a time when needed:

```csharp
await app.Tables.Player.RegisterTableRequestAndWaitForReceiptAsync();
```

## Step 6: Deploy All Systems via CREATE2

The `SystemsServices` base class deploys every system contract using CREATE2 deterministic deployment. Each system gets a predictable address based on its bytecode and the salt:

```csharp
var deployResults = await app.Systems
    .DeployAllCreate2ContractSystemsRequestAndWaitForReceiptAsync(
        deployerAddress, salt);
```

The method returns a `List<SystemDeploymentResult>`, one per system. Each result contains:
- `DeploymentResult.Address` — the deterministic address where the system was deployed
- `DeploymentResult.AlreadyDeployed` — `true` if the contract was already at that address (CREATE2 is idempotent)
- `SystemService` — the system service instance

Because CREATE2 addresses are deterministic, deploying the same bytecode with the same salt produces the same address on any chain — useful for multi-chain deployments.

## Step 7: Batch Register All Systems

After deploying the system contracts, register them with the World. This tells the World to route calls to each system and registers their function selectors:

```csharp
var registerReceipt = await app.Systems
    .BatchRegisterAllSystemsRequestAndWaitForReceiptAsync(
        deployerAddress, salt);
```

This calculates each system's CREATE2 address, then creates batch call data that registers the system and its root function selectors with the World. The `publicAccess` parameter defaults to `true`, meaning any account can call the systems:

```csharp
// Register with restricted access (only namespace owner can call)
var registerReceipt = await app.Systems
    .BatchRegisterAllSystemsRequestAndWaitForReceiptAsync(
        deployerAddress, salt, publicAccess: false);
```

If your systems use bytecode libraries, pass them so the CREATE2 address calculation is correct:

```csharp
var libraries = new[] { new ByteCodeLibrary("LibraryName", libraryAddress) };

var deployResults = await app.Systems
    .DeployAllCreate2ContractSystemsRequestAndWaitForReceiptAsync(
        deployerAddress, salt, libraries);

var registerReceipt = await app.Systems
    .BatchRegisterAllSystemsRequestAndWaitForReceiptAsync(
        deployerAddress, salt, byteCodeLibraries: libraries);
```

## Step 8: Use Your Namespace

With tables registered and systems deployed, your namespace is fully operational:

```csharp
// Call a system through the World
await app.Systems.Game.MoveRequestAndWaitForReceiptAsync(
    new MoveFunction { X = 10, Y = 20 });

// Read a table record
var player = await app.Tables.Player.GetTableRecordAsync(
    new PlayerTableRecord.PlayerKey { Address = playerAddress });
```

## Delegation

The World supports delegated calls — allowing one account to call systems on behalf of another. This is managed through the World's `RegistrationSystem`.

Grant unlimited delegation to another account:

```csharp
await app.World.Systems.RegistrationSystem
    .RegisterDelegationRequestAndWaitForReceiptAsync(
        delegateeAddress,
        ResourceEncoder.EncodeUnlimitedAccess(),
        new byte[] { });
```

Once delegation is registered, the delegatee can call systems on behalf of the delegator using `callFrom`:

```csharp
// Delegatee's namespace instance
var appAsDelegatee = new AppNamespace(web3Delegatee, worldAddress);

// Enable callFrom routing — all system calls now go through World.callFrom()
appAsDelegatee.Systems.SetSystemsCallFromDelegatorContractHandler(
    delegatorAddress);

// This calls World.callFrom(delegator, systemId, callData)
await appAsDelegatee.Systems.Game.MoveRequestAndWaitForReceiptAsync(
    new MoveFunction { X = 10, Y = 20 });
```

`SetSystemsCallFromDelegatorContractHandler` sets the delegation on all systems in the namespace at once.

To revoke delegation:

```csharp
await app.World.Systems.RegistrationSystem
    .UnregisterDelegationRequestAndWaitForReceiptAsync(delegateeAddress);
```

After unregistering, any `callFrom` attempt by the delegatee will revert with `World_DelegationNotFound`.

## Access Control

By default, systems registered with `publicAccess: true` can be called by anyone. When registered with `publicAccess: false`, only the namespace owner can call them.

To grant access to specific accounts:

```csharp
// Grant access to a specific resource (table or system)
await app.World.Systems.AccessManagementSystem
    .GrantAccessRequestAndWaitForReceiptAsync(
        new GrantAccessFunction
        {
            ResourceId = ResourceEncoder.EncodeTable("app", "Player"),
            Grantee = anotherAccountAddress
        });
```

## Changing System Permissions

You can change a system's access level after registration. The `SystemServiceResourceRegistrator` on each system service allows re-registering with different permissions:

```csharp
// Switch a system from public to private access
await app.Systems.Game.SystemServiceResourceRegistrator
    .RegisterSystemAndWaitForReceiptAsync(deployedAddress, publicAccess: false);
```

## Error Handling

MUD World contracts use custom errors for revert reasons. The `NamespaceBase` class provides error decoding that searches across all your systems and the World's built-in systems:

```csharp
try
{
    await app.Systems.Game.MoveRequestAndWaitForReceiptAsync(moveFunction);
}
catch (SmartContractCustomErrorRevertException ex)
{
    var decoded = app.FindCustomErrorException(ex);
    if (decoded != null)
    {
        Console.WriteLine($"MUD error: {decoded.ErrorABI.Name}");
    }
}
```

`FindCustomErrorException` checks your application's systems first, then the World's core systems (`WorldService`, `RegistrationSystem`, etc.), returning the first match.

Common MUD errors:
- `World_ResourceAlreadyExists` — namespace or table already registered
- `World_AccessDenied` — caller lacks permission for this resource
- `World_ResourceNotFound` — referencing an unregistered resource
- `World_DelegationNotFound` — `callFrom` attempted without delegation registered

## Verifying Deployment

After deployment, you can verify the state by reading the World's built-in tables through the `Store` and `World` namespaces that are available on every `NamespaceBase`:

```csharp
var storeLogService = app.Store.StoreEventsLogProcessingService;
var inMemoryStore = new InMemoryTableRepository();
await storeLogService.ProcessAllStoreChangesAsync(inMemoryStore);

// Check registered systems
var systemRecords = await app.World.Tables.SystemsTableService
    .GetRecordsFromRepository(inMemoryStore);

// Check namespace ownership
var namespaceRecords = await app.World.Tables.NamespaceOwnerTableService
    .GetRecordsFromRepository(inMemoryStore);

// Check registered tables
var tables = await app.Store.Tables.TablesTableService
    .GetRecordsFromLogsAsync();
```

## Common Gotchas

- **Order matters** — namespaces must be registered before tables, and tables before systems that use them. The World contract will revert with `World_ResourceNotFound` if you try to register a table in an unregistered namespace.
- **CREATE2 addresses are deterministic** — the same bytecode + salt always produces the same address. This is useful for multi-chain deployments but means you can't redeploy the same system to the same address with the same salt.
- **Namespace ownership** — the account that registers a namespace owns it. Transfer ownership carefully, as the owner controls all access to tables and systems within that namespace.
- **Gas limits for batch deployment** — registering many tables or systems in a single batch transaction can hit gas limits. Split large registrations using `BatchRegisterTablesAndWaitForReceiptAsync` with specific table resources, or register individual tables one at a time.
- **`publicAccess: true` is the default** — batch system registration defaults to public access. Set `publicAccess: false` explicitly if you need restricted access.

## Next Steps

- **[MUD Quickstart](guide-mud-quickstart)** — the code generation workflow and namespace pattern
- **[Tables and Records](guide-mud-tables)** — reading, writing, and querying table records after deployment
- **[Indexing Store Events](guide-mud-indexing)** — process Store events into repositories for off-chain state
