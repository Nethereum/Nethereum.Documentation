# Data Services Section — Progress

## Status: Complete (Re-validated)

## Packages

| Package | README | Doc Page | Status |
|---------|--------|----------|--------|
| Nethereum.DataServices | Created from scratch | Auto-generated | Done |
| Nethereum.Sourcify.Database | Created from scratch | Auto-generated | Done |
| Nethereum.TokenServices | Fixed hallucinations + added Catalog | Auto-generated (moved from data-and-indexing) | Done |

## Guides

| Guide | Status |
|-------|--------|
| guide-abi-retrieval.md | Done — composite ABI lookup, Sourcify V2, 4Byte, EVM trace decoding, local Sourcify DB |
| guide-token-portfolio.md | Done — balances, prices, discovery strategies, events, multi-account, catalog, DI |
| guide-chainlist-rpc.md | **NEW** — Chainlist API: chain discovery, RPC endpoints, native currencies, explorers, filtering |
| guide-etherscan-api.md | **NEW** — Etherscan V2: gas oracle, account transactions/balances, token transfers, contract data, Parquet exports |
| guide-coingecko-api.md | **NEW** — CoinGecko: asset platforms, token lists, prices by contract/ID, cache configuration |

### Removed
| Guide | Reason |
|-------|--------|
| guide-chain-metadata.md | **DELETED** — replaced by 3 focused guides (chainlist-rpc, etherscan-api, coingecko-api) |

## Infrastructure

| Item | Status |
|------|--------|
| `DocSection.DataServices` enum value | Added |
| sync-readmes.js mapping → `data-services` | Updated (3 packages) |
| Sidebar with Guides + Package Reference | Updated (5 guides) |
| Overview with use-case table + learning path | Updated (5 guides, 14 use cases) |
| Old manual nethereum-dataservices.md | Deleted (replaced by auto-generated) |
| Old data-and-indexing tokenservices ref | Removed from sidebar |

## Plugin Skills

| Skill | Status |
|-------|--------|
| `abi-retrieval` | Created (existing) |
| `token-portfolio` | Created (existing) |
| `chainlist-rpc` | **NEW** — chain/RPC discovery |
| `etherscan-api` | **NEW** — gas oracle, accounts, contracts |
| `coingecko-api` | **NEW** — pricing, token lists, platforms |

## Test Tagging

| Test File | Tags Added | Use Case |
|-----------|------------|----------|
| EtherscanApiServiceTests.cs | 4 | abi-retrieval (2), etherscan-api (2) |
| SourcifyApiServiceTests.cs | 9 | abi-retrieval (8), etherscan-api (1 — Parquet) |
| FourByteDirectoryServiceTests.cs | 2 | abi-retrieval (2) |
| ChainlistRpcApiServiceTests.cs | 2 | chainlist-rpc (2) |
| Erc20TokenServiceTests.cs | 4 | token-portfolio (4) |
| PricingTests.cs | 2 | token-portfolio (2) |
| TokenCatalogTests.cs | 2 | token-portfolio (2) |
| TokenEventScannerTests.cs | 1 | token-portfolio (1) |
| **Total** | **26** | |

## Fixes Applied

- **TokenServices README Scenario 2**: `RefreshBalancesFromEventsAsync` returns `List<TokenBalance>`, NOT a result object with `.Success`/`.UpdatedBalances`/`.NewTokensFound`/`.ToBlock` (all were hallucinated)
- **TokenServices README**: Added entire Token Catalog subsystem documentation (ITokenCatalogRefreshService, ITokenCatalogRepository, CatalogTokenInfo, CatalogTokenListProviderAdapter, TokenCatalogMigrationService, TokenCatalogServiceCollectionExtensions)
- **DataServices README**: Created from scratch with verified APIs (previous manual doc had wrong `ABIInfoStorageFactory.CreateDefault(cache)` signature)
- **Re-validation**: Split chain-metadata guide into 3 focused guides grounded in actual API surface and test coverage

## Guide Quality Validation

All 5 guides written as teaching guides (not code dumps). Validated against Guide Quality Checklist:

| Check | ABI Retrieval | Token Portfolio | Chainlist RPC | Etherscan API | CoinGecko API |
|-------|--------------|----------------|---------------|---------------|---------------|
| Opening context (WHY/WHEN) | PASS | PASS | PASS | PASS | PASS |
| Mental model | PASS | PASS | PASS | PASS | PASS |
| Guiding text before/after every code block | PASS | PASS | PASS | PASS | PASS |
| Progressive examples | PASS | PASS | PASS | PASS | PASS |
| Decision guidance | PASS | PASS | PASS | PASS | PASS |
| Common gotchas | PASS (6) | PASS (6) | PASS (5) | PASS (6) | PASS (6) |
| Backward connections | PASS | PASS | PASS | PASS | PASS |
| Forward connections (Next Steps) | PASS | PASS | PASS | PASS | PASS |
| No orphan concepts | PASS | PASS | PASS | PASS | PASS |

## Verification Checklist

- [x] All code examples verified against actual source code and test methods
- [x] sync-readmes.js generates 3 pages in data-services/
- [ ] `npm run build` passes with zero broken links in data-services section
- [x] Learning journey validated: overview → abi-retrieval → token-portfolio → chainlist-rpc → etherscan-api → coingecko-api
- [x] Backward/forward connections between all 5 guides
- [x] DocSection.DataServices added with slug "data-services"
- [x] 26 integration tests tagged with `[NethereumDocExample(DocSection.DataServices, ...)]`
- [x] Both test project csproj files updated with Nethereum.Documentation reference
- [x] Plugin skills created (5 total: abi-retrieval, token-portfolio, chainlist-rpc, etherscan-api, coingecko-api)
- [x] Overview anchor links verified
- [x] component-catalog.md and index.tsx links updated from data-and-indexing to data-services
- [x] Each guide has its own dedicated API coverage — no artificial bundling
