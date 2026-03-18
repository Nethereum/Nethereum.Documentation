---
title: Deploy with Forge Scripts
sidebar_label: Deploy with Forge
sidebar_position: 7
description: Write deployment scripts with Forge Script, broadcast transactions to the DevChain, and verify deployments.
---

# Deploy with Forge Scripts

After [testing your contracts](guide-forge-testing), you'll want to deploy them to the DevChain. Forge Scripts provide a declarative way to write deployment logic in Solidity itself — same language, same tooling, reproducible deployments.

Note: when using the dApp template's WebApp, you can also deploy contracts directly through the browser wallet UI. Forge Scripts are useful for automated deployments, CI pipelines, and deploying from the command line.

## The Template's Deploy Script

Open `contracts/script/Deploy.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MyToken.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        new MyToken("MyToken", "MTK", 1_000_000 ether);

        vm.stopBroadcast();
    }
}
```

The script:
- Reads the deployer's private key from an environment variable
- Wraps deployment in `startBroadcast` / `stopBroadcast` — only calls within this block are sent as real transactions
- Deploys MyToken with 1 million tokens (18 decimals)

## Deploy to the DevChain

First, start the AppHost so the DevChain is running:

```bash
dotnet run --project AppHost
```

Find the DevChain RPC URL in the Aspire dashboard, then deploy:

```bash
cd contracts
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url http://localhost:<port> \
    --private-key 5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a \
    --broadcast
```

Replace `<port>` with the actual DevChain port from the dashboard.

The `--broadcast` flag sends real transactions. Without it, Forge does a dry run (simulation only) — useful for checking deployment cost and correctness before committing.

After deployment, Forge prints the deployed contract address. You can verify it in the Explorer — navigate to the contract address and you should see the ABI auto-discovered from the Foundry build output.

## Deploy Multiple Contracts

Extend the deploy script to deploy several contracts in sequence:

```solidity
contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        MyToken token = new MyToken("MyToken", "MTK", 1_000_000 ether);
        // Deploy more contracts here, referencing `token.address` if needed

        vm.stopBroadcast();
    }
}
```

Each `new Contract(...)` inside the broadcast block becomes a separate transaction.

## Using Environment Variables

For CI or shared scripts, use environment variables instead of passing keys on the command line:

```bash
export PRIVATE_KEY=5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
export RPC_URL=http://localhost:8545

forge script script/Deploy.s.sol:DeployScript \
    --rpc-url $RPC_URL \
    --broadcast
```

The script reads `PRIVATE_KEY` via `vm.envUint("PRIVATE_KEY")`.

## Next Steps

With contracts deployed to the DevChain:

- **[Generate C# from Solidity](guide-codegen)** — Create typed C# services so your .NET code can call these contracts
- **[Explorer ABI Discovery](guide-explorer-abi-discovery)** — See how the Explorer auto-discovers ABIs for deployed contracts
