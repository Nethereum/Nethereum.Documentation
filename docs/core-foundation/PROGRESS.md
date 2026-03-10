# Core Foundation Section — Validation Progress

## Stage 1: Define Use Cases ✅ COMPLETE
Approved 10 use cases — see conversation for full table.

## Stage 2: Validate READMEs ✅ COMPLETE
Found 13 code issues (6 critical), 10+ missing functionality gaps.

## Stage 3: Fix README Issues ✅ COMPLETE

### Key Finding: Doc Page Generation
Doc pages in `website/docs/` are **auto-generated** from Nethereum repo READMEs via:
```
node scripts/sync-readmes.js <nethereum-repo-path>
```
**Never manually edit the generated `.md` files** — only edit the source READMEs, then re-run the sync script.

Known script issue: `stripFirstH1` regex doesn't catch H1 headings that aren't on the very first line, causing duplicate headings when README starts with badges.

### Fixes Applied to Nethereum Repo READMEs:

#### Nethereum.Accounts/README.md
- [x] Fixed `IEthExternalSigner` example — removed incorrect implementation, added note about `EthExternalSignerBase`
- [x] Fixed `AccountOfflineTransactionSigner.SignTransactionAsync` → `SignTransaction` (sync, correct param order)
- [x] Fixed `ViewOnlyAccount` namespace → `Nethereum.Accounts.ViewOnly`
- [x] Fixed `Chain.BSC` → `Chain.Binance`
- [x] Updated `SignTransactionAsync` API reference note

#### Nethereum.Web3/README.md
- [x] Fixed account switching example — removed invalid `TransactionManager.Account = ` setter
- [x] Fixed Multicall example — `MultiCallInput<F, BigInteger>` → `MulticallInputOutput<F, OutputDTO>`, correct param order, added RPC batch alternative

#### Nethereum.RPC.Reactive/README.md
- [x] Fixed `.Path` property reference in reconnect example (private field, not public)

#### Nethereum.JsonRpc.SystemTextJsonRpcClient/README.md
- [x] Fixed `.NET 9.0+` → `.NET 7.0+` throughout (actual `#if` guard is `NET7_0_OR_GREATER`)

#### Nethereum.Util/README.md
- [x] Added Poseidon hashing section (PoseidonHasher, PoseidonParameterPreset, PoseidonHashProvider)
- [x] Added IHashProvider abstraction section
- [x] Added API reference for PoseidonHasher, IHashProvider

#### Nethereum.RPC/README.md
- [x] Added Fee Estimation (EIP-1559) section with 3 strategies, API reference, comparison table

#### Nethereum.ABI/README.md
- [x] Added error handling: ErrorFunction.IsErrorData(), SmartContractRevertException, custom error decoding with [Error] attribute

#### Nethereum.Model/README.md
- [x] Added EIP-7702: Transaction7702 full properties, Gas7702 constants, Authorisation7702/Authorisation7702Signed full detail

### Sync Verification
- [x] Ran `node scripts/sync-readmes.js` — 99 packages synced
- [x] `npm run build` passes — no new broken links from core-foundation changes

## Stage 4: Create Guide Pages ✅ COMPLETE

10 guide pages created in `docs/core-foundation/`:

| # | Guide | File | Test Slugs Used |
|---|-------|------|-----------------|
| 1 | Send ETH to an Address | guide-send-eth.md | account-types, transaction-signing |
| 2 | Encode and Decode ABI Data | guide-abi-encoding.md | abi-encoding |
| 3 | Work with Hex Data | guide-hex-encoding.md | hex-encoding |
| 4 | Manage Keys, Accounts, and Keystores | guide-keys-accounts.md | ec-key-management, account-types, keystore |
| 5 | Sign and Verify Messages | guide-message-signing.md | personal-sign, message-signing |
| 6 | Estimate Gas Fees (EIP-1559) | guide-fee-estimation.md | fee-estimation |
| 7 | Validate and Format Addresses | guide-address-utils.md | address-checksum, address-validation, address-empty, address-collections, address-padding |
| 8 | Convert Between Wei, Ether, and Gwei | guide-unit-conversion.md | unit-conversion |
| 9 | Understand Transaction Types | guide-transaction-models.md | transaction-models |
| 10 | RLP Encoding and Decoding | guide-rlp-encoding.md | rlp-encoding |

### Sidebar Updated
- Added `Guides` sub-category under `1. Core Foundation` in `sidebars.ts`
- `npm run build` passes — no new broken links from guide pages

## Stage 5: Create Plugin Skills ✅ COMPLETE

10 user-invocable skills created in `plugins/nethereum-skills/skills/`:

| # | Skill | Directory | Trigger Keywords |
|---|-------|-----------|-----------------|
| 1 | send-eth | send-eth/ | transfer ETH, send crypto, gas, nonce |
| 2 | abi-encoding | abi-encoding/ | encode functions, decode output, ABI, selectors |
| 3 | hex-encoding | hex-encoding/ | hex conversion, byte array, HexBigInteger |
| 4 | keys-accounts | keys-accounts/ | generate keys, accounts, keystores, wallets |
| 5 | message-signing | message-signing/ | sign message, verify signature, personal_sign |
| 6 | fee-estimation | fee-estimation/ | gas fees, EIP-1559, maxFeePerGas |
| 7 | address-utils | address-utils/ | address validation, checksum, zero address |
| 8 | unit-conversion | unit-conversion/ | Wei, Ether, Gwei, token decimals |
| 9 | transaction-models | transaction-models/ | transaction types, Chain IDs, block headers |
| 10 | rlp-encoding | rlp-encoding/ | RLP, binary serialization |

All skills contain verified code from `[NethereumDocExample]` tagged tests.

## Stage 6: Final Verification ✅ COMPLETE

### Checklist
- [x] Every use case has a guide page in the Docusaurus site (10/10)
- [x] Every use case has a Claude Code skill (10/10)
- [x] Every code example in guide pages sourced from `[NethereumDocExample]` tagged tests
- [x] Every NuGet package name matches its actual .csproj
- [x] Sidebar includes all new pages under Guides sub-category
- [x] `npm run build` passes — no new broken links from core-foundation
- [x] PROGRESS.md updated with completion status

### Pre-existing broken links (other sections, not ours)
- account-abstraction/nethereum-accountabstraction-simpleaccount → smartcontracts
- application-chain/nethereum-appchain-sequencer → metrics
- application-chain/nethereum-appchain-server → metrics
- mud-framework/nethereum-mud → contracts#advanced anchor

### Section Status: COMPLETE

## Stage 7: Core Foundation Audit ✅ COMPLETE

### Gaps Identified
1. Missing transaction types (EIP-2930, EIP-7702, recovery)
2. No RPC transport guide
3. No real-time streaming guide
4. No block/transaction query guide
5. Missing default fee behavior (TimePreference default)
6. Misplaced Nethereum.UI package (core-foundation → wallet-and-ui)
7. Default Docusaurus favicon → Nethereum favicon
8. "Application Chains" → "AppChains" sidebar label

### Changes Applied

#### New Tagged Tests (Nethereum Repo)
- `Transaction2930_CreateWithAccessList` — EIP-2930 model creation
- `Transaction7702_CreateWithAuthorisation` — EIP-7702 with authorization signing
- `TransactionFactory_Detects1559And2930` — auto-detection of typed transactions
- `ShouldSignEip2930Transaction` — sign EIP-2930 transaction
- `ShouldRecoverSenderFromSignedLegacy` — recover sender from legacy tx
- `ShouldRecoverSenderFromSigned1559` — recover sender from EIP-1559 tx
- `ShouldVerifySignedTransaction` — verify signed transaction
- `DefaultStrategy_IsTimePreference` — Web3 default fee strategy
- `UseLegacyAsDefault_IsFalse` — EIP-1559 is default type

#### New Guides
- `guide-query-blocks.md` — Query blocks, transactions, receipts, balances
- `guide-rpc-transport.md` — Choose HTTP, WebSocket, IPC, SystemTextJson
- `guide-realtime-streaming.md` — WebSocket subscriptions and Rx streams

#### Updated Guides
- `guide-fee-estimation.md` — Added "Default Behavior in Web3" section
- `guide-transaction-models.md` — Added EIP-2930, EIP-7702, and transaction recovery

#### Updated Skills
- `transaction-models/SKILL.md` — Added EIP-2930, EIP-7702, recovery
- `fee-estimation/SKILL.md` — Added default behavior info

#### New Skills
- `rpc-transport/SKILL.md` — Transport selection guidance
- `realtime-streaming/SKILL.md` — WebSocket/Rx streaming patterns

#### Sidebar Changes
- Moved `nethereum-ui` from core-foundation to wallet-and-ui/Wallet Core
- Added 3 new guides to Guides sub-category
- Renamed "8. Application Chains" → "8. AppChains"

#### Favicon & GitHub Pages
- Copied Nethereum favicons (32x32, 16x16, apple-touch-icon) from nethereum.com
- Updated docusaurus.config.ts favicon reference and headTags
