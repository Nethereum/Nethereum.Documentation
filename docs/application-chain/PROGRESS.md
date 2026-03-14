# AppChains (Preview) — Documentation Progress

## Status: COMPLETE

## Completed Stages

### Stage 1: Define Use Cases (COMPLETE)
Use cases identified:
1. Launch a Sequencer (CLI) — guide-appchain-quickstart
2. Launch a Follower (CLI) — guide-appchain-quickstart
3. Programmatic AppChain (AppChainBuilder) — guide-appchain-quickstart
4. Configure Storage (In-Memory / RocksDB) — guide-appchain-storage
5. Sync Follower Nodes — guide-appchain-sync

Excluded from guides (README-only, APIs still evolving):
- Policy/governance
- L1 anchoring/messaging
- Account abstraction on AppChain
- P2P networking details

### Stage 2: Validate READMEs (COMPLETE)
All 9 package READMEs validated against source code:
- Nethereum.AppChain — 3/3 classes verified
- Nethereum.AppChain.Server — 2/2 classes verified
- Nethereum.AppChain.Sequencer — 5/5 classes verified
- Nethereum.CoreChain — 6/6 interfaces verified
- Nethereum.CoreChain.RocksDB — 3/3 classes verified
- Nethereum.AppChain.Sync — 5/5 classes verified
- Nethereum.AppChain.P2P — 3/3 classes verified (README-only)
- Nethereum.AppChain.Policy — 3/3 classes verified (README-only)
- Nethereum.AppChain.Anchoring — 3/3 classes verified (README-only)

Total: 25/25 classes verified, 0 hallucinations found.

### Stage 3: Fix README Issues (COMPLETE)
No fixes needed — all READMEs validated clean.

### Stage 4: Create Guide Pages (COMPLETE)
Created:
- `docs/application-chain/overview.md` — rewritten with architecture diagram, simple path table, packages table, guide tables
- `docs/application-chain/guide-appchain-quickstart.md` — CLI launch, AppChainBuilder, presets, AppChainRpcClient, MUD at genesis
- `docs/application-chain/guide-appchain-storage.md` — storage interfaces, in-memory, RocksDB, DI, column families, tuning, snapshots
- `docs/application-chain/guide-appchain-sync.md` — two-phase sync, MultiPeerSyncService, PeerManager, batch import, BlockReExecutor, finality

### Stage 4b: Learning Journey Validation (COMPLETE)
All guides connect properly:
- Quickstart → Storage → Sync (forward progression)
- Each guide links back to at least one other guide
- Overview lists all 3 guides in guide table

### Stage 5: Plugin Skills (COMPLETE)
Created:
- `plugins/nethereum-skills/skills/appchain-quickstart/SKILL.md`

### Stage 5b: Global Pages (COMPLETE)
Updated:
- `docs/what-do-you-want-to-do.md` — added 4 linked AppChain rows with guide links
- `docs/component-catalog.md` — added 3 Quick Start entries, updated package descriptions, added missing packages
- `src/pages/index.tsx` — updated AppChain card description, linked task to quickstart guide

### Stage 6: Final Verification (COMPLETE)
- `npm run build` passes (only pre-existing broken anchor in nethereum-mud)
- Sidebar updated with Getting Started guide group
- All guide pages have correct frontmatter

## Notes
- All AppChain packages are marked as Preview throughout
- Policy, anchoring, and account abstraction left as README-only per user instruction
- CoreChain and CoreChain.RocksDB package pages live in the devchain section (shared infrastructure)
