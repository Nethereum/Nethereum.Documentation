---
title: Smart Contracts Documentation Progress
sidebar_label: PROGRESS
unlisted: true
---

# Smart Contracts Section — Documentation Progress

## Stage Status

| Stage | Status | Date |
|-------|--------|------|
| Stage 1: Use Cases | ✅ Complete | 2026-03-10 |
| Stage 2: README Validation | ✅ Complete | 2026-03-11 |
| Stage 3: Fix README Issues | ✅ Complete | 2026-03-11 |
| Stage 4: Guide Pages | ✅ Complete | 2026-03-10 |
| Stage 5: Plugin Skills | ✅ Complete | 2026-03-10 |
| Stage 6: Verification | ✅ Complete | 2026-03-10 |

## Use Cases (Stage 1)

| # | Use Case | Guide Page | Plugin Skill | Tagged Tests |
|---|----------|------------|--------------|--------------|
| 1 | Filter & query contract events | `guide-events.md` | `events` | `EventFilterTest.cs` (1), `EventFilterNewFilterInputTests.cs` (1), `FilterInputBuilderTests.cs` (4), `FilterBuilderInstantiation.cs` (2), `IndexedEvents.cs` (1) |
| 2 | Batch contract queries (multicall) | `guide-multicall.md` | `multicall` | `MultiCall.cs` (2), `MultiSendTests.cs` (2) |
| 3 | Handle contract errors & reverts | `guide-error-handling.md` | `error-handling` | `CustomErrorTest.cs` (3), `ErrorReasonTest.cs` (2) |
| 4 | Use built-in token standards | `guide-built-in-standards.md` | `built-in-standards` | `ERC20Tests.cs` (1), `ERC721Tests.cs` (1), `ERC1155Tests.cs` (1), `ERC6492Tests.cs` (1), `ENSTests.cs` (2), `ERC165Tests.cs` (2), `ERC1271Tests.cs` (1), `StorageUtilTests.cs` (1), `ContractServiceBaseTests.cs` (1), `X402TransferWithAuthorisation3009ServiceTests.cs` (2), `X402ReceiveWithAuthorisation3009ServiceTests.cs` (2) |
| 5 | CREATE2 deterministic deployment | `guide-create2-deployment.md` | `create2-deployment` | `Create2DeploymentTests.cs` (3) |
| 6 | Deploy a contract | `deploy-a-contract.md` | — | `ContractDeploymentAndCall.cs` (1 test) |
| 7 | ERC-20 tokens | `erc20.md` | — | `ERC20Tests.cs` (1 test) |
| 8 | Code generation | `code-generation.md` | `code-generation` | — |
| 9 | Full smart contract interaction lifecycle | `guide-smart-contract-interaction.md` | `smart-contract-interaction` | `SmartContractInteractionLifecycleTests.cs` (7), `NonTypeSafeInteractionTests.cs` (1) |

## Guide Pages Created (Stage 4)

- [x] `guide-events.md` — Filter & Query Events (position 6)
- [x] `guide-multicall.md` — Multicall & Batch Queries (position 7)
- [x] `guide-error-handling.md` — Error Handling & Custom Reverts (position 8)
- [x] `guide-built-in-standards.md` — Built-in Contract Standards (position 9)
- [x] `guide-create2-deployment.md` — CREATE2 Deterministic Deployment (position 10)
- [x] `guide-smart-contract-interaction.md` — Full Contract Interaction Lifecycle (position 2)
- [x] `code-generation.md` — Comprehensive rewrite: Forge workflow, multisettings config, generator types, shared types, MUD, Unity, Blazor, Node.js API

## Plugin Skills Created (Stage 5)

- [x] `events` — Smart Contract Events
- [x] `multicall` — Multicall & Batch Queries
- [x] `error-handling` — Error Handling & Custom Reverts
- [x] `built-in-standards` — Built-in Contract Standards
- [x] `create2-deployment` — CREATE2 Deterministic Deployment
- [x] `smart-contract-interaction` — Full Contract Interaction Lifecycle
- [x] `code-generation` — Forge workflow, multisettings, generator types, shared types, MUD, Unity, Blazor

## Sidebar Updated

- [x] `guide-events` added to Smart Contracts section
- [x] `guide-multicall` added to Smart Contracts section
- [x] `guide-error-handling` added to Smart Contracts section
- [x] `guide-built-in-standards` added to Smart Contracts section
- [x] `guide-create2-deployment` added to Smart Contracts section
- [x] `guide-smart-contract-interaction` added to Smart Contracts section (position 2, after overview)

## Tagged Tests ([NethereumDocExample])

### Existing (pre-backlog)
- `EventFilterTest.cs` — 1 test (SmartContracts, events)
- `MultiCall.cs` — 2 tests (SmartContracts, multicall)
- `ERC20Tests.cs` — 1 test (SmartContracts, erc20-tokens)
- `ContractDeploymentAndCall.cs` — 1 test (SmartContracts, deploy-contract)

### Tagged in This Session (2026-03-10)
- [x] `CustomErrorTest.cs` — 3 tests tagged (SmartContracts, error-handling)
- [x] `Create2DeploymentTests.cs` — 3 tests tagged (SmartContracts, create2-deployment)
- [x] `ERC721Tests.cs` — 1 test tagged (SmartContracts, built-in-standards)
- [x] `ERC1155Tests.cs` — 1 test tagged (SmartContracts, built-in-standards)
- [x] `EventFilterNewFilterInputTests.cs` — 1 test tagged (SmartContracts, events) — indexed params filtering
- [x] `FilterInputBuilderTests.cs` — 4 tests tagged (SmartContracts, events) — FilterInputBuilder unit tests
- [x] `FilterBuilderInstantiation.cs` — 2 tests tagged (SmartContracts, events) — FilterBuilder from web3/Event/DTO
- [x] `IndexedEvents.cs` — 1 test tagged (SmartContracts, events) — DecodeAllEvents from receipt
- [x] `ErrorReasonTest.cs` — 2 tests tagged (SmartContracts, error-handling) — SmartContractRevertException
- [x] `ERC6492Tests.cs` — 1 test tagged (SmartContracts, built-in-standards) — ERC-6492 signature validation
- [x] `ENSTests.cs` — 2 tests tagged (SmartContracts, built-in-standards) — ENS resolve + reverse

### New Tests Created (2026-03-10)
- [x] `ERC165Tests.cs` — 2 tests created (SmartContracts, built-in-standards) — interface detection + ERC-721 check
- [x] `ERC1271Tests.cs` — 1 test created (SmartContracts, built-in-standards) — contract signature validation
- [x] `StorageUtilTests.cs` — 1 test created (SmartContracts, built-in-standards) — mapping storage key calculation
- [x] `ContractServiceBaseTests.cs` — 1 test created (SmartContracts, built-in-standards) — type introspection
- [x] `MultiSendTests.cs` — 2 tests created (SmartContracts, multicall) — batched write + encoding

### Solidity Contracts Created (2026-03-10)
- [x] `contracts/src/examples/ERC165Test.sol` — custom interface detection contract
- [x] `contracts/src/examples/ERC1271Mock.sol` — mock isValidSignature contract
- [x] `contracts/src/examples/StorageTest.sol` — mapping storage for StorageUtil tests
- [x] `contracts/src/examples/MultiSendTest.sol` — MultiSend + Counter contracts

### EIP-3009 Tagged (X402 Tests, 2026-03-10)
- [x] `X402TransferWithAuthorisation3009ServiceTests.cs` — 2 tests tagged (SmartContracts, built-in-standards) — verify + settle TransferWithAuthorization
- [x] `X402ReceiveWithAuthorisation3009ServiceTests.cs` — 2 tests tagged (SmartContracts, built-in-standards) — verify + settle ReceiveWithAuthorization

### Smart Contract Interaction Lifecycle (Playground 1007/1045 Port, 2026-03-10)
- [x] `SmartContractInteractionLifecycleTests.cs` — 7 tests created (SmartContracts, smart-contract-interaction) — deploy, query, transact, historical state, gas estimation, offline signing, event decoding
- [x] `NonTypeSafeInteractionTests.cs` — 1 test created (SmartContracts, smart-contract-interaction) — ABI JSON deploy + interact

### Still Needed (Backlog)
- [ ] Struct interaction (PurchaseOrder with nested LineItem[]) — Playground 1012
- [ ] JSON input/output with structs — Playground 1070
- [ ] ERC20 multicall with token list — Playground 1066
- [ ] ERC721 log processing for owned tokens — Playground 1067

## Simple Path First Updates (2026-03-11)

- [x] All 9 guides have `:::tip The Simple Way` callouts
- [x] `deploy-a-contract.md` and `erc20.md` have Next Steps sections
- [x] Opening context added to `deploy-a-contract.md` and `erc20.md`
- [x] Sidebar restructured: "Getting Started" (collapsed: false) + "Advanced Patterns"
- [x] Overview updated with simple path table and guide tables grouped by sub-category
- [x] README fix: ADRaffy.ENSNormalize version v0.1.5 → v0.3.1
- [x] `npm run build` passes (no new broken links)

## Known Gaps

1. ~~**README validation not yet performed**~~ — ✅ Validated 2026-03-11, one version number fix applied
2. ~~**MultiSend not documented**~~ — ✅ Added to multicall guide and skill (2026-03-10)
3. ~~**MulticallInput vs MulticallInputOutput**~~ — ✅ Added to multicall guide and skill (2026-03-10)
4. ~~**ContractServiceBase**~~ — ✅ Added to built-in-standards guide + tested (2026-03-10)
5. ~~**StorageUtil**~~ — ✅ Added to built-in-standards guide + tested (2026-03-10)
6. ~~**EventTopicBuilder**~~ — ✅ Replaced with FilterInputBuilder<T> in events guide and skill (2026-03-10)
7. ~~**EIP-3009**~~ — ✅ X402 tests tagged + guide/skill updated with TransferWithAuthorization + ReceiveWithAuthorization (2026-03-10)
