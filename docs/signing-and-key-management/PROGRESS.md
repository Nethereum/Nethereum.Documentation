---
title: Signing & Key Management Documentation Progress
sidebar_label: PROGRESS
unlisted: true
---

# Signing & Key Management Section — Documentation Progress

## Stage Status

| Stage | Status | Date |
|-------|--------|------|
| Stage 1: Use Cases | ✅ Complete | 2026-03-11 |
| Stage 2: README Validation | ✅ Complete | 2026-03-11 |
| Stage 3: README Fixes | ✅ Complete | 2026-03-11 |
| Stage 4: Guide Pages | ✅ Complete | 2026-03-11 |
| Stage 4b: Journey Validation | ✅ Complete | 2026-03-11 |
| Stage 5: Plugin Skills | ✅ Complete (pre-existing) | 2026-03-10 |
| Stage 6: Final Verification | ✅ Complete | 2026-03-11 |

## Use Cases (Stage 1)

| # | Use Case | Guide Page | Plugin Skill | Tagged Tests |
|---|----------|------------|--------------|--------------|
| 1 | Generate keys, create accounts | `guide-keys-accounts.md` | `send-eth` (shared) | `AccountTypesDocExampleTests.cs` ✅ |
| 2 | Sign and verify messages | `guide-message-signing.md` | `send-eth` (shared) | `PersonalSignDocExampleTests.cs`, `EthereumMessageSignerTests.cs` ✅ |
| 3 | EIP-712 typed data signing | `guide-eip712-signing.md` | `eip712-signing` ✅ | `Eip712DocExampleTests.cs` (6 tests) ✅ |
| 4 | Encrypt/decrypt keys with KeyStore | `guide-keystore.md` | `keystore` ✅ | `KeyStoreDocExampleTests.cs` (6 tests) ✅ |
| 5 | Derive accounts from mnemonic (HD Wallet) | `guide-hd-wallets.md` | `hd-wallets` ✅ | `WalletTests.cs` (4), `MinimalHDWalletTests.cs` (2) ✅ |
| 6 | Sign with Ledger/Trezor hardware | `guide-hardware-wallets.md` | `hardware-wallets` ✅ | N/A (hardware-dependent) |
| 7 | Sign with AWS KMS / Azure Key Vault | `guide-cloud-kms.md` | `cloud-kms` ✅ | N/A (cloud-dependent) |

## README Fixes Applied (Stage 3)

### Nethereum.Signer/README.md
- Fixed `MessageSigner` API reference: removed phantom `Hash(string)` overload, fixed `HashAndSign` signature
- Fixed `EthECDSASignature` API reference: corrected constructors to match actual `(BigInteger r, BigInteger s, byte[] v)`, `(ECDSASignature)`, `(byte[] derSig)`; replaced phantom `ToByteArray()` with actual `ToDER()`, `FromDER()`, `CreateStringSignature()`

### Nethereum.KeyStore/README.md
- Fixed Example 2: replaced incorrect `EncryptAndGenerateKeyStore(password, key, N, R, P, salt)` with correct `EncryptAndGenerateKeyStore(password, key, address, scryptParams)`
- Fixed API Reference section: corrected `KeyStoreScryptService` method signatures to show actual overloads with `ScryptParams` parameter

### Nethereum.Signer.Bls.Herumi/README.md
- Removed phantom `DomainTypes` class (code block that didn't exist in source)
- Replaced with factual domain type prefix table

## Section Consolidation (2026-03-11)

Moved `guide-keys-accounts.md` and `guide-message-signing.md` from Core Foundation into this section. These guides cover keys, accounts, and message signing — they belong with the other signing guides rather than scattered in Core Foundation.

**Changes:**
- Copied guides to `signing-and-key-management/` with updated sidebar_position (2, 3) and cross-refs
- Updated sidebar: split "Guides" into "Keys & Signing", "Key Storage & Derivation", "External Signers"
- EIP-712 moved to position 4 (after message signing)
- Deleted old files from `core-foundation/`
- Updated Core Foundation overview: renamed "Keys, Signing & Encoding" to "Encoding & Utilities"
- Fixed all cross-references in both sections

## Guide Pages Updated (Stage 4)

### overview.md (position 1) — Rewritten
- Added "Choosing a Key Storage Method" decision table with security levels
- Added guide tables at bottom (Signing Techniques, Key Storage & Derivation, External Signers)
- Added Next Steps with both linear path and jump-to-need options
- Added Claude Code plugin tip
- Added Delegated EOA mention (EIP-7702)
- Removed duplicate KeyStore code example (that's what the guide is for)

### guide-eip712-signing.md (position 2)
- Added `:::tip The Simple Way` callout (sign + recover in 3 lines)
- Changed sidebar_position from 12 to 2
- Updated opening to mention permits, meta-transactions, off-chain order books
- Updated Next Steps to point forward → KeyStore

### guide-keystore.md (position 3)
- Added `:::tip The Simple Way` callout (encrypt + decrypt in 4 lines)
- Changed sidebar_position from 4 to 3
- Added opening context linking back to Keys & Accounts
- Updated Next Steps to point forward → HD Wallets, Hardware Wallets

### guide-hd-wallets.md (position 4)
- Added `:::tip The Simple Way` callout (generate + derive + use in 3 lines)
- Changed sidebar_position from 3 to 4
- Added opening context explaining the problem HD wallets solve
- Updated Next Steps to point forward → Hardware Wallets

### guide-hardware-wallets.md (position 5)
- Added `:::tip The Simple Way` callout (connect + init + transfer pattern)
- Improved opening context: explains WHY hardware wallets + ExternalAccount pattern
- Updated Next Steps to point forward → Cloud KMS, EIP-7702

### guide-cloud-kms.md (position 6)
- Added `:::tip The Simple Way` callout (KMS signer + init + transfer pattern)
- Improved opening context: FIPS 140-2, audit logging, references hardware wallets
- Updated Next Steps with Send ETH, EIP-7702, backward reference to Hardware Wallets

## Journey Validation (Stage 4b)

Learning path verified: Overview → Keys & Accounts → Message Signing → EIP-712 → KeyStore → HD Wallets → Hardware Wallets → Cloud KMS

All guides have:
- ✅ `:::tip The Simple Way` callouts
- ✅ Opening WHY/WHEN context
- ✅ Forward Next Steps links through the chain
- ✅ Backward links to Core Foundation
- ✅ Claude Code plugin tips (where applicable)
- ✅ Verified code examples (tagged tests for guides 1-3; hardware/cloud inherently untestable)

## Plugin Skills (Stage 5)

All 5 use cases have pre-existing plugin skills:
- ✅ `eip712-signing` — EIP-712 typed data signing
- ✅ `keystore` — KeyStore file encryption/decryption
- ✅ `hd-wallets` — HD wallet derivation (Full + Light)
- ✅ `hardware-wallets` — Ledger and Trezor integration
- ✅ `cloud-kms` — AWS KMS and Azure Key Vault signing

## Tagged Tests ([NethereumDocExample])

### Signing section (DocSection.Signing)
- `Eip712DocExampleTests.cs` — 6 tests (eip712-signing)
- `KeyStoreDocExampleTests.cs` — 6 tests (keystore)
- `WalletTests.cs` — 4 tests (hd-wallets, Order 1-4)
- `MinimalHDWalletTests.cs` — 2 tests (hd-wallets, Order 5-6)

### Related (DocSection.CoreFoundation, personal-sign)
- `SignerDocExampleTests.cs` — 10 tests
- `PersonalSignDocExampleTests.cs` — 4 tests
- `EthereumMessageSignerTests.cs` — 2 tests
- `ModelDocExampleTests.cs` — 12 tests

## Build Status

✅ `npm run build` passes — no new broken links in signing section
