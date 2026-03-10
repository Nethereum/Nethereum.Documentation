---
title: Consensus Light Client
sidebar_label: Overview
sidebar_position: 0
description: Verify Ethereum state without running a full node using the beacon chain light client protocol
---

# Consensus Light Client

Verify Ethereum state without running a full node. These packages implement the beacon chain light client sync protocol, SSZ serialization, and state proof verification.

## Packages

| Package | Description |
|---------|-------------|
| [`Nethereum.Beaconchain`](nethereum-beaconchain) | Beacon Chain REST API client (light client, state, validator endpoints) |
| [`Nethereum.Consensus.LightClient`](../consensus-and-cryptography/nethereum-consensus-lightclient) | Light client sync protocol implementation |
| [`Nethereum.Consensus.Ssz`](../consensus-and-cryptography/nethereum-consensus-ssz) | SSZ serialization for consensus-layer types |
| [`Nethereum.SSZ`](../consensus-and-cryptography/nethereum-ssz) | Core SSZ encoding/decoding library |
| [`Nethereum.ChainStateVerification`](../data-and-indexing/nethereum-chainstateverification) | Verify on-chain state using light client proofs |
