---
title: Nethereum.Beaconchain
sidebar_label: Nethereum.Beaconchain
description: Ethereum Beacon Chain REST API client for light client, state, and validator endpoints
---

# Nethereum.Beaconchain

Ethereum Beacon Chain REST API client library for accessing light client, state, and validator endpoints.

## Installation

```bash
dotnet add package Nethereum.Beaconchain
```

## Purpose

Provides a typed .NET client for the [Ethereum Beacon API](https://ethereum.github.io/beacon-APIs/), enabling:

- **Light client** bootstrap and update endpoints
- **State** queries (finality checkpoints, state root, validators)
- **Validator** duty and status lookups
- **Block** header and body retrieval

## Dependencies

- `Nethereum.Util.Rest` — HTTP client infrastructure
- `Nethereum.Hex` — hex encoding utilities
- `Nethereum.Consensus.Ssz` — SSZ serialization for beacon types

## Related Packages

- [Nethereum.Consensus.LightClient](../consensus-and-cryptography/nethereum-consensus-lightclient) — light client sync protocol implementation
- [Nethereum.Consensus.Ssz](../consensus-and-cryptography/nethereum-consensus-ssz) — SSZ serialization for consensus types
- [Nethereum.ChainStateVerification](../data-and-indexing/nethereum-chainstateverification) — verify on-chain state via light client proofs
