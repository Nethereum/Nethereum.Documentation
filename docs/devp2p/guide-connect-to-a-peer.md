---
title: Connect to a Peer
sidebar_label: Connect to a Peer
sidebar_position: 2
description: Dial a known Ethereum node by its enode URL, accept inbound connections, and understand capability negotiation and fork compatibility.
---

# Connect to a Peer

Before a Nethereum node can sync blocks, serve state, or discover the rest of the network, it needs to open at least one encrypted connection to another Ethereum node. This guide covers the two ways a connection starts — dialing a peer whose `enode://` address you already have, and accepting inbound connections from peers who dial you — plus what happens right after the socket opens: capability negotiation, which decides which sub-protocols (`eth`, `snap`) the two nodes will actually speak to each other. Once you can connect, [Peer Discovery](./guide-peer-discovery) covers finding `enode://` addresses when you don't have them yet, and [Run a Node](./guide-run-a-node) shows the `SyncNode` facade that wires connecting, serving, and syncing together.

## Prerequisites

```bash
dotnet add package Nethereum.DevP2P
```

You need a **node identity key** — a secp256k1 key whose public half becomes your node's id in every `enode://` URL you present. For a one-off connection or a test, generate one on the fly. For a node other peers should remember and reconnect to, persist it — [Peer Discovery](./guide-peer-discovery) shows `NodeKeyStore.LoadOrCreate` for that.

## Mental model: RLPx, then capabilities

Every devp2p connection is a two-layer negotiation:

1. **RLPx handshake** — an ECIES key exchange establishes a shared secret, then the connection switches to AES-CTR + Keccak-MAC framing. Both sides then exchange a `Hello` message listing the sub-protocols (`eth/68`, `eth/69`, `snap/1`, and so on) each one supports.
2. **Capability negotiation** — the two `Hello` capability lists are intersected. Only protocols both sides advertise survive, and each surviving protocol is assigned a block of message IDs on the shared socket (multiple sub-protocols share one TCP connection).

`Nethereum.DevP2P` handles both layers and hands you back a connection with `SharedCapabilities` already resolved. It does **not** run the `eth` Status exchange or the snap protocol loop — those live one layer up, in `Nethereum.DevP2P.Sync` (`SyncPeerSession`, `PeerListener`), which [Run a Node](./guide-run-a-node) covers.

## Generate a node identity and config

Every example below needs a key and a `DevP2PConfig`. `DevP2PConfig.ForDevChain` collapses the common dev-chain defaults into one call:

```csharp
using Nethereum.DevP2P;
using Nethereum.Signer;

// Node identity: generate a fresh key, or load your persisted node key.
var localKey = EthECKey.GenerateKey();

// Config quickstart — DevP2PConfig.ForDevChain(byte[] genesisHash, ulong networkId = 1337)
// collapses the sensible dev-chain knobs into one factory call.
var genesisHash = new byte[32];                       // your dev-chain genesis block hash
var config = DevP2PConfig.ForDevChain(genesisHash, networkId: 1337);
```

A key generated with `EthECKey.GenerateKey()` is fine for scripts and tests, but a real node loses its identity — and any peer that trusted it by node-id — on every restart if you don't persist it. Keep that in mind; [Peer Discovery](./guide-peer-discovery) shows the persisted alternative.

## Dial a peer you already have the address for

If you already have a peer's `enode://` URL — from a config file, a static-peers list, or a discovery result — `StaticPeerConnector.ConnectAsync` parses it and completes the RLPx handshake and `Hello` exchange in one call:

```csharp
using System.Threading;
using Nethereum.DevP2P;
using Nethereum.DevP2P.Rlpx;
using Nethereum.Signer;

var localKey = EthECKey.GenerateKey();
var connector = new StaticPeerConnector(localKey);           // config optional; defaults are fine
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

// ConnectAsync(string enode, CancellationToken ct = default)
RlpxConnection conn = await connector.ConnectAsync(
    "enode://<64-byte-hex-pubkey>@127.0.0.1:30303",
    cts.Token);

// conn.SharedCapabilities now lists the negotiated protocols (eth >= 68).
```

The `<64-byte-hex-pubkey>` is the peer's uncompressed secp256k1 public key without the `0x04` prefix, hex-encoded — the same identity that shows up as `PeerId` if you parse the URL with `EnodeUrl.Parse`. Once `ConnectAsync` returns, `conn.SharedCapabilities` tells you what you can actually do with this peer: if `eth` isn't in the list, this peer won't answer block/header requests; if `snap` isn't there, it won't serve state ranges.

**Source:** `src/Nethereum.DevP2P/README.md` — "Dial a peer — `StaticPeerConnector.ConnectAsync(enode, ct)`".

## Accept inbound connections

To let peers dial *you*, start an `RlpxListener`. It performs admission control, the RLPx handshake, and the `Hello` exchange, then raises `PeerAccepted` once a peer is fully connected:

```csharp
using System.Net;
using Nethereum.DevP2P;
using Nethereum.DevP2P.Rlpx;
using Nethereum.Signer;

var serverKey = EthECKey.GenerateKey();
var genesisHash = new byte[32];                              // your dev-chain genesis block hash
var config = DevP2PConfig.ForDevChain(genesisHash);

var listener = new RlpxListener(serverKey, config);
listener.PeerAccepted += (_, conn) =>
{
    // conn.SharedCapabilities is already negotiated. Run the eth Status
    // exchange and the protocol loop here — see Nethereum.DevP2P.Sync.
};

// Start(int port = 0, IPAddress bindAddress = null) — port 0 binds an ephemeral port.
listener.Start(port: 30303, bindAddress: IPAddress.Any);

// ... on shutdown:
await listener.StopAsync();                                 // StopAsync() drains in-flight handshakes
```

Notice the comment inside `PeerAccepted`: `RlpxListener` deliberately stops at "you have a negotiated connection." It does not know about `eth` Status messages or snap requests — that dispatch loop is [Run a Node](./guide-run-a-node)'s `PeerListener`, built on top of this same event.

**Source:** `src/Nethereum.DevP2P/README.md` — "Listen / accept peers — `RlpxListener`".

## See it end-to-end: a two-node handshake

The snippets above are one side of a connection each. Here both sides run in the same process — a listener and a client, both on loopback — which is exactly what the integration test that backs this example does:

```csharp
var serverKey = EthECKey.GenerateKey();
var clientKey = EthECKey.GenerateKey();
var config = new DevP2PConfig
{
    ClientId = "Nethereum/test",
    ConnectTimeoutMs = 5000,
    HandshakeTimeoutMs = 5000
};

var listener = new RlpxListener(serverKey, config);
RlpxConnection acceptedConnection = null;
var acceptedTcs = new TaskCompletionSource<RlpxConnection>();
listener.PeerAccepted += (_, conn) =>
{
    acceptedConnection = conn;
    acceptedTcs.TrySetResult(conn);
};

listener.Start(port: 0, bindAddress: IPAddress.Loopback);
var listenerPort = listener.Port;

var clientConn = new RlpxConnection(clientKey, config);
await clientConn.ConnectAsync("127.0.0.1", listenerPort, serverKey.GetPubKeyNoPrefix());
var server = await acceptedTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));

// Both sides are connected and see each other's Hello:
Console.WriteLine($"Client sees: {clientConn.RemoteHello.ClientId}, caps={string.Join(",", clientConn.SharedCapabilities.ConvertAll(c => $"{c.Name}/{c.Version}"))}");
Console.WriteLine($"Server sees: {server.RemoteHello.ClientId}, caps={string.Join(",", server.SharedCapabilities.ConvertAll(c => $"{c.Name}/{c.Version}"))}");

await clientConn.DisconnectAsync();
await listener.StopAsync();
```

Two details worth noticing: the outbound `ConnectAsync` overload here takes `(host, port, remotePubNoPrefix)` — the raw connection form, distinct from `StaticPeerConnector`'s single `enode://` string — and `clientConn.SharedCapabilities` will contain `eth` at version 68 or higher, because that's the floor this package advertises. Port `0` in `Start` binds an OS-assigned ephemeral port, which is why the test reads `listener.Port` back before dialing it.

**Source:** `tests/Nethereum.DevP2P.IntegrationTests/RlpxListenerIntegrationTests.cs:25` — `TwoNethereumNodes_PeerViaDevP2P_HelloAndCapabilities`, tagged `[NethereumDocExample(DocSection.DevP2P, "devp2p", "Two-node RLPx handshake over loopback")]` (adapted here: `Assert.*` calls replaced with `Console.WriteLine` for readability — the API calls are unchanged).

## Capability negotiation, in detail

`CapabilityNegotiator.Negotiate` is what computes `SharedCapabilities` from the two `Hello` messages. You don't normally call it directly — `RlpxConnection`/`RlpxListener` do it for you — but understanding it explains a real failure mode:

```csharp
List<P2PCapability> Negotiate(List<P2PCapability> local, List<P2PCapability> remote)
```

Each protocol gets a block of message IDs starting at `0x10`, sized by version: `eth` gets 17 slots at v68, 18 at v69–70, 20 at v71; `snap` gets 8 slots at v1, 10 at v2. If the `eth` version negotiated is wrong, `snap`'s message-id block shifts and the peer's dispatcher misroutes every snap message it receives — which is why this computation is centralized rather than inlined at each call site.

`RlpxConnection` advertises `eth/68`, `eth/69`, `eth/70`, `eth/71`, and `snap/1` in its own `Hello` — `snap/2` only appears when `DevP2PConfig.AdvertiseSnap2` is set, which matters once you're following [Block Access Lists](./guide-block-access-lists) for snap-v2 BAL heal.

**Source:** `src/Nethereum.DevP2P/README.md` — "RLPx transport" (`CapabilityNegotiator.Negotiate`) and "Notes".

## Why a peer might reject you: fork compatibility

Capability negotiation only checks *which protocols* two peers share — it says nothing about whether they're on the *same chain*. That check happens one layer up, in the `eth` Status message that `Nethereum.DevP2P.Sync`'s `SyncPeerSession` sends immediately after the handshake this guide covers: Status carries an EIP-2124 fork-ID, and `Eip2124ForkIdCalculator`/`Eip2124ValidationResult` decide whether the two nodes are running compatible or stale fork schedules. A connection can complete everything in this guide successfully and still be useless for syncing if the fork-ID check fails afterward — see [Run a Node](./guide-run-a-node) for where that happens.

## Common mistakes

| Symptom | Cause | Fix |
|---|---|---|
| `ConnectAsync` throws `RlpxPeerRejectedException` | The remote peer rejected the handshake (full, banned you, or a capability mismatch) | Inspect the exception's `Reason` (a `DisconnectReason`); not always retryable |
| `ConnectAsync` throws `RlpxNetRestrictedException` | None of the target's resolved IPs match your configured `NetRestrict` allow-list | Widen `NetRestrict`, or confirm you dialed the address you intended |
| `SharedCapabilities` is empty or missing `eth` | Passed the wrong pubkey form, or the peer only advertises protocols you don't support | Confirm you passed `remotePubNoPrefix` (64-byte uncompressed key, no `0x04`) to the raw `ConnectAsync(host, port, pubkey)` overload — `StaticPeerConnector` handles this for you from an `enode://` string |
| Connects, but never receives blocks | Handshake succeeded but the fork-ID Status check (in `Nethereum.DevP2P.Sync`) rejected the peer, or no `eth`/`snap` dispatch loop is wired to `PeerAccepted` | See [Run a Node](./guide-run-a-node) — `RlpxListener` alone does not run the protocol loop |

## Decision guidance

| I want to… | Use |
|---|---|
| Connect to one specific peer I already have an `enode://` for | `StaticPeerConnector.ConnectAsync` |
| Accept connections from peers dialing me | `RlpxListener` + `PeerAccepted` |
| Both sides in the same process (tests, local dev networks) | `RlpxListener` + `RlpxConnection.ConnectAsync(host, port, pubkey)`, as in the two-node example above |
| I don't have any peer addresses yet | Go to [Peer Discovery](./guide-peer-discovery) first |

Full API reference (admission control, `EnodeUrl`, `DialScheduler`, error types): see the [Nethereum.DevP2P reference](./nethereum-devp2p).

## Next steps

- **[Peer Discovery](./guide-peer-discovery)** — you now know how to dial an `enode://` once you have one; this guide covers finding those addresses via discv4, discv5, and DNS ENR trees, plus persisting your own node identity so peers can find you back.
- **[Run a Node](./guide-run-a-node)** — see how `SyncNode` and `PeerListener` turn an accepted connection into an actual `eth`/`snap` server, including the fork-ID Status check mentioned above.
- **[Full Sync](./guide-full-sync)** — once you have live connections, this covers pulling blocks over them.
