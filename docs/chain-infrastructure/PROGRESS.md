# Chain Infrastructure — Section Validation Progress

## Stage Status

| Stage | Status | Date |
|-------|--------|------|
| Stage 1: Use Cases | ✅ Complete | 2026-03-12 |
| Stage 2: README Validation | ✅ Complete | 2026-03-12 |
| Stage 3: Fix README Issues | ✅ Complete (IBlockStore, ITransactionStore, IReceiptStore method names fixed) | 2026-03-12 |
| Stage 4: Guide Pages | ✅ Complete (4 guides, sidebar updated, overview rewritten) | 2026-03-12 |
| Stage 4b: Journey Validation | ✅ Complete | 2026-03-12 |
| Stage 5: Plugin Skills | ⬜ Skipped (infrastructure section — not user-facing enough for auto-triggered skills) | |
| Stage 6: Verification | ✅ Complete (`npm run build` passes, no new broken links) | 2026-03-12 |

## Scope

**In:** Nethereum.CoreChain, Nethereum.CoreChain.RocksDB, Nethereum.Merkle.Patricia

## Use Cases (4)

| # | Use Case | Guide | Package |
|---|----------|-------|---------|
| 1 | Build a custom local chain node | `guide-custom-chain-node` | `Nethereum.CoreChain` |
| 2 | Implement custom storage backends | `guide-custom-storage` | `Nethereum.CoreChain`, `Nethereum.CoreChain.RocksDB` |
| 3 | Add custom JSON-RPC handlers | `guide-custom-rpc-handlers` | `Nethereum.CoreChain` |
| 4 | Fork state from live networks | `guide-forking` | `Nethereum.CoreChain` |

## README Fixes Applied (Stage 2-3)

### Nethereum.CoreChain — Interface Method Names
- `IBlockStore.SaveBlockAsync()` → `SaveAsync()`
- `IBlockStore.GetLatestBlockAsync()` → `GetLatestAsync()`
- `IBlockStore.GetBlockHashByNumberAsync()` → `GetHashByNumberAsync()`
- `IBlockStore.DeleteByBlockNumberAsync()` → `DeleteByNumberAsync()`
- `ITransactionStore`: `SignedTransaction` → `ISignedTransaction`
- `ITransactionStore.SaveTransactionAsync()` → `SaveAsync()` with corrected params
- `ITransactionStore.GetTransactionLocationAsync()` returning tuple → `GetLocationAsync()` returning `TransactionLocation`
- Added missing `GetHashesByBlockHashAsync()`
- `IReceiptStore.SaveReceiptAsync()` → `SaveAsync()`

### Nethereum.CoreChain.RocksDB — No fixes needed
All classes, methods, properties, configuration options verified 100% accurate.

## Sidebar Structure

```
Chain Infrastructure
├── overview
├── Guides (collapsed: false)
│   ├── guide-custom-chain-node
│   ├── guide-custom-storage
│   ├── guide-custom-rpc-handlers
│   └── guide-forking
└── Package Reference
    ├── nethereum-corechain
    ├── nethereum-corechain-rocksdb
    └── nethereum-merkle-patricia (from consensus-and-cryptography)
```

## Decisions

- No plugin skill for this section — CoreChain is infrastructure consumed by DevChain/AppChain, not directly by most developers
- 4 guides covering the main extensibility points: chain node assembly, storage backends, RPC handlers, forking
- Merkle Patricia remains in the Package Reference (cross-referenced from consensus-and-cryptography)
- Overview maintains the architecture diagram showing CoreChain → DevChain/AppChain relationship
