---
title: Client Extensions
sidebar_label: Overview
sidebar_position: 1
description: Geth and Besu client-specific RPC methods
---

# Client Extensions

Nethereum provides packages for client-specific RPC methods that go beyond the standard Ethereum JSON-RPC API.

## Geth

`Nethereum.Geth` wraps Geth-specific methods including admin, miner, txpool, debug tracing, and Geth's `eth_pendingTransactions` and `eth_call` with state overrides.

## Besu

`Nethereum.Besu` wraps Hyperledger Besu-specific methods including admin, debug, miner, Clique and IBFT consensus management, permissioning, EEA private transactions, and txpool.
