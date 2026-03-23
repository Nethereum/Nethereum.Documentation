# EVM Simulator — Section Validation Progress

## Stage Status

| Stage | Status | Date |
|-------|--------|------|
| Stage 1: Use Cases | ✅ Complete | 2026-03-12 |
| Stage 2: README Validation | ✅ Complete | 2026-03-12 |
| Stage 3: Fix README Issues | ✅ Complete (5 bytecode fixes + 6 new sections in EVM README, 2 fixes in EVM.Contracts README) | 2026-03-12 |
| Stage 4: Guide Pages | ✅ Complete (8 guides created, sidebars.ts updated, overview rewritten) | 2026-03-12 |
| Stage 4b: Journey Validation | ✅ Complete (Tier 2 cross-linking improved, ERC-20 positioning clarified) | 2026-03-12 |
| Stage 5: Plugin Skills | ✅ Complete (evm-simulation skill created) | 2026-03-12 |
| Stage 6: Verification | ✅ Complete (`npm run build` passes, no new broken links) | 2026-03-12 |

## Scope

**In:** Nethereum.EVM, Nethereum.EVM.Contracts, Nethereum.EVM.Precompiles.Bls, Nethereum.EVM.Precompiles.Kzg

## Use Cases (8)

| # | Use Case | Guide | Plugin Skill | Package |
|---|----------|-------|-------------|---------|
| 1 | Preview transaction state changes (wallet pattern) | `guide-transaction-simulation` | `evm-simulation` | `Nethereum.EVM` |
| 2 | Decode call trees with parameters | `guide-call-tree-decoding` | `evm-simulation` | `Nethereum.EVM` |
| 3 | Extract token transfers from logs | `guide-log-extraction` | `evm-simulation` | `Nethereum.EVM` |
| 4 | Decode revert reasons and custom errors | `guide-revert-decoding` | `evm-simulation` | `Nethereum.EVM` |
| 5 | Simulate ERC-20 operations | `guide-erc20-simulation` | `evm-simulation` | `Nethereum.EVM.Contracts` |
| 6 | Execute raw bytecode locally | `guide-bytecode-execution` | `evm-simulation` | `Nethereum.EVM` |
| 7 | Debug with Solidity source maps | `guide-evm-debugging` | `evm-simulation` | `Nethereum.EVM` |
| 8 | Disassemble and analyze bytecode | `guide-bytecode-disassembly` | `evm-simulation` | `Nethereum.EVM` |

## EVM as Foundation

| System | Role | Frontend |
|--------|------|----------|
| Wallet Transaction Preview | Simulates tx → extracts all balance changes | Nethereum.Wallet.UI.Components.Blazor |
| DevChain | Powers the in-process development node | — |
| CoreChain | Full chain execution engine | — |
| Account Abstraction Bundler | Validates UserOps via ERC-7562 simulation | — |
| Solidity Debugger | Source-level debugging with source maps | Nethereum.Blazor.Solidity |

## README Fixes Applied (Stage 2-3)

### Nethereum.EVM — 5 Fixes + 6 New Sections
- `"600460040116"` had AND (0x16) instead of ADD (0x01) → fixed to `"6004600401"`
- `program.ReadFromMemory()` → `program.Memory.Count`
- `"03020208"` raw opcodes → `"60036002600208"` with PUSH1 prefixes
- `"600160055B60CC"` missing JUMPI → `"60016005575B60CC"`
- `SELFDESTRUCT = 5000` → `-1` (dynamic)
- Added sections: Transaction Execution Pipeline, Decoding Pipeline, State Changes Extraction, EVM Debugging, Gas Calculation Utilities, Precompile System (~960 lines)

### Nethereum.EVM.Contracts — 2 Fixes
- `log.Topics[0]` comparison → added `.ToString()`
- Balance check `< 0` → compare against `BalanceSenderBefore`

## Files Created/Modified

### Guide Pages (docs/evm-simulator/)
- `guide-transaction-simulation.md` — Flagship wallet preview pattern, 5-step pipeline
- `guide-call-tree-decoding.md` — DecodedCall tree walking, call types, Uniswap example
- `guide-log-extraction.md` — Event decoding, balance change consolidation, validation
- `guide-revert-decoding.md` — Custom errors, panic codes, common selectors table
- `guide-erc20-simulation.md` — ERC20ContractSimulator, fee-on-transfer detection
- `guide-bytecode-execution.md` — EVMSimulator step-by-step, stack/memory, traces
- `guide-evm-debugging.md` — EVMDebuggerSession, source maps, Blazor Solidity replay
- `guide-bytecode-disassembly.md` — Disassembly, function signature detection, opcode table
- `overview.md` — Rewritten with Foundation table, simple path, guide tables

### Plugin Skills (plugins/nethereum-skills/skills/)
- `evm-simulation/SKILL.md` — Complete skill covering all 8 use cases

### Package READMEs (src/)
- `Nethereum.EVM/README.md` — 5 fixes + 6 new sections
- `Nethereum.EVM.Contracts/README.md` — 2 fixes

### Sidebar (sidebars.ts)
- EVM section restructured: Overview → Simulation & Decoding (4 guides, collapsed: false) → Advanced (4 guides) → Package Reference

## Sidebar Structure

```
EVM Simulator
├── overview
├── Simulation & Decoding (collapsed: false)
│   ├── guide-transaction-simulation
│   ├── guide-call-tree-decoding
│   ├── guide-log-extraction
│   └── guide-revert-decoding
├── Advanced
│   ├── guide-erc20-simulation
│   ├── guide-bytecode-execution
│   ├── guide-evm-debugging
│   └── guide-bytecode-disassembly
└── Package Reference
    ├── nethereum-evm
    └── nethereum-evm-contracts
```

## Decisions

- EVM positioned as foundational engine powering Wallet, DevChain, CoreChain, AA Bundler, Debugger
- Single plugin skill (`evm-simulation`) covers all 8 use cases — they share the same package
- Guides split into two tiers: Simulation & Decoding (primary path) and Advanced (specialized)
- Transaction Simulation is the flagship guide, matching the wallet's StateChangesPreviewService pattern
- All code examples sourced from verified README content (which was validated against source in Stage 2)
- Blazor Solidity debugger referenced as frontend component but not documented in depth (separate package)

## Build Verification

- `npm run build` passes with no new broken links
- Pre-existing broken links in account-abstraction, application-chain, mud-framework are unrelated
