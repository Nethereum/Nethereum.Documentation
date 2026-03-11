---
title: "EIP-7702: EOA Code Delegation"
sidebar_label: "EIP-7702 Delegation"
sidebar_position: 8
description: Delegate smart contract code to EOAs with EIP-7702 — self-delegation, sponsored delegation, and querying delegation state
---

# EIP-7702: EOA Code Delegation

EIP-7702 lets an externally owned account (EOA) temporarily delegate its execution to a smart contract. When someone calls the EOA, the EVM runs the delegate contract's code in the context of the EOA — same address, same balance, same storage. This gives EOAs smart account capabilities (batch calls, spending limits, social recovery) without deploying a separate contract.

:::tip The Simple Way
```csharp
var authService = web3.Eth.GetEIP7022AuthorisationService();

// Delegate your EOA to a smart contract — gas overhead calculated automatically
var receipt = await authService
    .AuthoriseRequestAndWaitForReceiptAsync("0xDelegateContract");

// Check if an address has a smart account (is delegated)
bool isDelegated = await authService.IsDelegatedAccountAsync(address);

// Get the delegate contract address
string delegateContract = await authService.GetDelegatedAccountAddressAsync(address);

// Revoke delegation — removes smart account from EOA
var receipt = await authService.RemoveAuthorisationRequestAndWaitForReceiptAsync();
```
For sponsored delegation (someone else pays gas), use `EIP7022SponsorAuthorisationService`.
:::

The delegation is set by sending a **Type 4 transaction** that includes a signed authorization tuple. The EOA owner signs "I authorize contract X to act as my code" and the delegation takes effect when the transaction is mined.

## When to Use EIP-7702

| Scenario | Why EIP-7702 |
|----------|-------------|
| Batch multiple calls in one transaction | EOA delegates to a batch-call contract |
| Add spending limits or session keys | EOA delegates to a smart account with policy enforcement |
| Sponsor gas for another user | Sponsor signs the Type 4 tx, sponsored user signs just the authorization |
| Upgrade EOA to smart account | No new address — existing EOA gains contract capabilities |
| Account Abstraction without new address | ERC-4337 UserOps work with the EOA's existing address |

## Prerequisites

```bash
dotnet add package Nethereum.Web3
dotnet add package Nethereum.Accounts
```

For low-level signing only (no RPC):

```bash
dotnet add package Nethereum.Model
dotnet add package Nethereum.Signer
```

---

## Quick Start: Self-Delegation

The simplest workflow — delegate your own EOA to a contract using the high-level service:

<!-- tag:EIP7022Tests:ShouldCreateEip7022AuthorisationAndExecuteDelegatedSmartContractAsync -->

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

var account = new Account("0xYOUR_PRIVATE_KEY", Chain.MainNet);
var web3 = new Web3(account, "https://mainnet.infura.io/v3/YOUR_KEY");

var authorisationService = web3.Eth.GetEIP7022AuthorisationService();

// Delegate your EOA to a smart contract
var receipt = await authorisationService
    .AuthoriseRequestAndWaitForReceiptAsync("0xDelegateContractAddress");
```

This sends a Type 4 transaction to yourself with the signed authorization. After mining, calling your EOA address executes the delegate contract's code.

### Check Delegation State

```csharp
// Is this address delegated?
bool isDelegated = await authorisationService.IsDelegatedAccountAsync(account.Address);

// Get the delegate contract address
string delegateAddress = await authorisationService
    .GetDelegatedAccountAddressAsync(account.Address);
```

Under the hood, `IsDelegatedAccountAsync` checks if the account's code starts with `0xef0100` (the delegation prefix). The delegate address is the 20 bytes following the prefix.

### Remove Delegation

```csharp
var receipt = await authorisationService
    .RemoveAuthorisationRequestAndWaitForReceiptAsync();

// Verify it's gone
var delegateAddress = await authorisationService
    .GetDelegatedAccountAddressAsync(account.Address);
// delegateAddress is null
```

---

## Universal vs Chain-Specific Authorization

When signing an authorization, you choose the `chainId`:

- **Chain-specific** (default): The authorization only works on the chain matching the `chainId`. Safer — prevents replay on other chains.
- **Universal** (`chainId = 0`): The authorization is valid on any chain. Useful for cross-chain delegation setups.

```csharp
// Chain-specific (default — uses the account's chain ID)
await authorisationService.AuthoriseRequestAndWaitForReceiptAsync(
    "0xDelegateContract", useUniversalZeroChainId: false);

// Universal (chainId = 0 — valid on any chain)
await authorisationService.AuthoriseRequestAndWaitForReceiptAsync(
    "0xDelegateContract", useUniversalZeroChainId: true);
```

---

## Sponsored Delegation

A sponsor (who has ETH for gas) can delegate another account's EOA on their behalf. The sponsored account signs only the authorization — they don't need ETH for gas.

```csharp
using Nethereum.Accounts;
using Nethereum.Signer;

// Sponsor's web3 (has ETH, pays gas)
var sponsor = new Account("0xSPONSOR_KEY", Chain.MainNet);
var web3 = new Web3(sponsor, "https://mainnet.infura.io/v3/YOUR_KEY");

// Sponsored account's key (signs the authorization, doesn't need ETH)
var sponsoredKey = new EthECKey("0xSPONSORED_PRIVATE_KEY");

var sponsorService = new EIP7022SponsorAuthorisationService(
    web3.TransactionManager, web3.Eth);

// Sponsor sends the Type 4 tx with the sponsored account's signed authorization
var receipt = await sponsorService
    .AuthoriseSponsoredRequestAndWaitForReceiptAsync(
        sponsoredKey,
        "0xDelegateContractAddress",
        useUniversalZeroChainId: true,
        brandNewAccount: true);  // skip nonce lookup for fresh accounts
```

### Batch Sponsorship

Delegate multiple accounts in a single transaction:

<!-- tag:EIP7022Tests:ShouldCreateAuthoritiesForManyAccounts -->

```csharp
var keys = new EthECKey[]
{
    new EthECKey("0xKEY_1"),
    new EthECKey("0xKEY_2"),
    new EthECKey("0xKEY_3"),
};

var receipt = await sponsorService
    .AuthoriseBatchSponsoredRequestAndWaitForReceiptAsync(
        keys,
        "0xDelegateContractAddress",
        useUniversalZeroChainId: true,
        brandNewAccount: true);
```

Each account in the batch gets its own authorization in the same Type 4 transaction.

---

## Low-Level: Manual Authorization Signing

For full control over the authorization and transaction construction:

<!-- tag:ModelDocExampleTests:Transaction7702_CreateWithAuthorisation -->

```csharp
using Nethereum.Model;
using Nethereum.Signer;
using System.Collections.Generic;
using System.Numerics;

// 1. Create the authorization tuple
var authorisation = new Authorisation7702
{
    ChainId = 1,                                     // or 0 for universal
    Address = "0xDelegateContractAddress",            // contract to delegate to
    Nonce = 0                                         // must match the EOA's current nonce
};

// 2. Sign the authorization with the EOA's key
var ecKey = new EthECKey("0xYOUR_PRIVATE_KEY");
var authSigner = new Authorisation7702Signer();
var signedAuth = authSigner.SignAuthorisation(ecKey, authorisation);

// 3. Build the Type 4 transaction
var tx = new Transaction7702(
    chainId: 1,
    nonce: 0,
    maxPriorityFeePerGas: BigInteger.Parse("2000000000"),    // 2 Gwei
    maxFeePerGas: BigInteger.Parse("100000000000"),           // 100 Gwei
    gasLimit: 100000,
    receiverAddress: ecKey.GetPublicAddress(),                // send to self
    amount: BigInteger.Zero,
    data: null,
    accessList: new List<AccessListItem>(),
    authorisationList: new List<Authorisation7702Signed> { signedAuth });

// 4. Sign and broadcast
var txSigner = new Transaction7702Signer();
var signedTxHex = txSigner.SignTransaction(ecKey, tx);
await web3.Eth.Transactions.SendRawTransaction
    .SendRequestAsync("0x" + signedTxHex);
```

### Recover Signer from Authorization

<!-- tag:EIP7022Tests:ShouldDecodeEIP7022Authorisation -->

```csharp
using Nethereum.Signer;

var signerAddress = EthECKeyBuilderFromSignedAuthorisation
    .RecoverSignerAddress(signedAuth);
```

---

## Inline Authorization (with Contract Calls)

Instead of sending a separate delegation transaction, you can attach the authorization to the same transaction that calls the delegate contract. This delegates and executes in one step:

```csharp
using Nethereum.RPC.Eth.DTOs;

// The function you want to call on the delegate contract
var executeFunction = new ExecuteFunction
{
    Calls = batchCalls,
    Gas = 1000000,  // must set gas manually — estimates don't work with inline auth
    AuthorisationList = new List<Authorisation>
    {
        new Authorisation { Address = "0xDelegateContractAddress" }
    }
};

// The transaction manager signs the authorization automatically
var receipt = await contractService.ExecuteRequestAndWaitForReceiptAsync(executeFunction);
```

The unsigned `Authorisation` (with just the `Address` field) is signed automatically by the `AccountSignerTransactionManager` before sending.

---

## Gas Costs

EIP-7702 adds extra gas on top of the base transaction cost:

| Cost | Amount | When |
|------|--------|------|
| Base transaction | 21,000 | Every transaction |
| Per authorization | 12,500 | Each authorization tuple |
| Per account (new or existing) | 25,000 | Each account being delegated |

```csharp
using Nethereum.RPC.TransactionManagers;

// Calculate gas for authorization delegations
int extraGas = AuthorisationGasCalculator
    .CalculateGasForAuthorisationDelegation(
        numberOfNew: 3,
        numberOfExisting: 1);
// = 4 * 25000 = 100,000 additional gas
```

The transaction manager adds authorization gas automatically when using the high-level services.

---

## How Delegation Works On-Chain

When a Type 4 transaction is processed:

1. Each authorization tuple is validated (correct nonce, matching chainId)
2. The EOA's code is set to `0xef0100` + delegate address (23 bytes total)
3. The EOA's nonce is incremented
4. Any calls to the EOA now execute the delegate contract's code

The `0xef` prefix is a banned opcode (EIP-3541), so this bytecode can never be deployed normally — it can only be set via EIP-7702 authorization.

### Delegation Persists Across Transactions

Once set, the delegation stays until explicitly removed (by authorizing the zero address). It survives transaction failures — even if the Type 4 transaction reverts, the delegation still takes effect.

### No Delegation Chaining

If account A delegates to account B, and account B also has a delegation, calling A executes B's code directly. The EVM does **not** follow B's delegation — only the first level is resolved.

---

## Hardware Wallet & Cloud KMS Support

All external signers support Type 4 transactions:

```csharp
// Ledger
var signer = new LedgerExternalSigner(ledgerManager);
await signer.SignAsync(transaction7702);

// AWS KMS
var signer = new AWSKeyManagementExternalSigner(kmsClient, keyId);
await signer.SignAsync(transaction7702);
```

The same `IEthExternalSigner.SignAsync(Transaction7702)` interface works for Ledger, Trezor, AWS KMS, and Azure Key Vault.

---

## Account Abstraction Integration

EIP-7702 integrates with ERC-4337 account abstraction. An EOA delegates to a smart account contract, then sends UserOperations through the EntryPoint — all using the EOA's original address.

The `Nethereum.AccountAbstraction` package detects EIP-7702 UserOps by checking for a `0x7702` marker in the `initCode` field.

See the [Account Abstraction section](../account-abstraction/overview) for full details on combining EIP-7702 with ERC-4337.

---

## Next Steps

- [Transaction Types](guide-transaction-models) — overview of all Ethereum transaction types
- [Send ETH](guide-send-eth) — basic ETH transfers
- [Fee Estimation](guide-fee-estimation) — understand gas pricing
- [AWS KMS Signing](../signing-and-key-management/nethereum-signer-awskeymanagement) — sign with AWS Key Management Service
- [Azure Key Vault Signing](../signing-and-key-management/nethereum-signer-azurekeyvault) — sign with Azure Key Vault

## Package References

- [Nethereum.Model](nethereum-model) — `Transaction7702`, `Authorisation7702`, `Authorisation7702Signed`
- [Nethereum.Signer](../signing-and-key-management/nethereum-signer) — `Transaction7702Signer`, `Authorisation7702Signer`
- [Nethereum.RPC](nethereum-rpc) — `EIP7022AuthorisationService`, `AuthorisationGasCalculator`
- [Nethereum.Accounts](nethereum-accounts) — `EIP7022SponsorAuthorisationService`
