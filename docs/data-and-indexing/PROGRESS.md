# Data & Indexing — Documentation Progress

## Section Status: Complete (Validated)

## Guides (4)

| Guide | Status | Content |
|-------|--------|---------|
| `guide-blockchain-processing` | Done | Processing pipeline, steps, handlers, progress tracking, reorg handling, ERC20/721 services |
| `guide-database-storage` | Done | EF Core storage providers, hosted services, configuration, repository API, schema |
| `guide-token-indexing` | Done | 3-stage pipeline (logs → denormalise → aggregate), all token standards, configuration |
| `guide-explorer` | Done | Full feature overview, setup, configuration, ABI sources, APIs, pages reference, MUD |

## Package References (12 auto-generated from READMEs)

| Package | Status |
|---------|--------|
| `nethereum-blockchainprocessing` | Validated |
| `nethereum-blockchainstorage-processors` | Validated |
| `nethereum-blockchainstorage-processors-postgres` | Validated |
| `nethereum-blockchainstorage-processors-sqlserver` | Validated |
| `nethereum-blockchainstorage-processors-sqlite` | Validated |
| `nethereum-blockchainstore-efcore` | Validated |
| `nethereum-blockchainstore-postgres` | Validated |
| `nethereum-blockchainstore-sqlserver` | Validated |
| `nethereum-blockchainstore-sqlite` | Validated |
| `nethereum-blockchainstorage-token-postgres` | Validated |
| `nethereum-explorer` | Validated |
| `nethereum-chainstateverification` | (in consensus-light-client section) |

## Skills (2)

| Skill | Status |
|-------|--------|
| `blockchain-indexing` | Created |
| `blockchain-explorer` | Created |

## Global Pages Updated

- [x] `what-do-you-want-to-do.md` — 15 use cases with guide links
- [x] `component-catalog.md` — Updated Data Processing & Storage table
- [x] `src/pages/index.tsx` — Updated card description and task rows

## Test Tags

- `DocSection.DataIndexing` exists but has 0 test usages (backlog item)

## Learning Journey (Validated Stage 4b)

1. Overview → understand the modular architecture
2. Blockchain Processing → learn the pipeline and handler patterns
3. Database Storage → set up persistence with hosted services (backward ref to Processing ✅)
4. Token Indexing → add ERC-20/721/1155 tracking (backward ref to Storage ✅)
5. Explorer → embed a UI over the indexed data (backward refs to Storage + Tokens ✅)

All Next Steps point forward through the sequence. Build passes clean.

## Final Verification (Stage 6) — 2026-03-13

- [x] Sidebar: Overview → Guides (collapsed: false) → Package Reference (last)
- [x] Guide ordering: Processing → Storage → Tokens → Explorer
- [x] Every guide has backward references and forward Next Steps
- [x] No code dumps — context before every code block
- [x] All code examples verified against source/tests
- [x] Aspire template wiring from actual Program.cs files
- [x] 2 skills created (blockchain-indexing, blockchain-explorer)
- [x] 3 global pages updated
- [x] `npm run build` passes (only pre-existing MUD anchor warning)
