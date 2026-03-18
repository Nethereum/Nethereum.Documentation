---
title: Write Solidity Contracts
sidebar_label: Write Contracts
sidebar_position: 5
description: Create ERC-20 tokens with OpenZeppelin, structure a Foundry project, and compile with forge build.
---

# Write Solidity Contracts

The dApp template ships with a starter ERC-20 contract (`MyToken.sol`). This guide walks through how it's structured, how to modify it, and how to add new contracts to the project. If you've completed the [VS Code setup](guide-solidity-setup), you'll have full editor support as you work.

## The Starter Contract: MyToken

Open `contracts/src/MyToken.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply
    ) ERC20(name_, symbol_) {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

This is a standard ERC-20 token that:
- Accepts a name, symbol, and initial supply at deployment
- Mints the initial supply to the deployer
- Exposes a public `mint` function (no access control — suitable for development)

The contract inherits from OpenZeppelin's `ERC20`, which provides the full ERC-20 interface: `transfer`, `approve`, `transferFrom`, `balanceOf`, `allowance`, and all the standard events.

## Add OpenZeppelin Dependencies

The template includes OpenZeppelin via Foundry's dependency management. If you need to reinstall or add new OpenZeppelin libraries:

```bash
cd contracts
forge install openzeppelin/openzeppelin-contracts
```

Dependencies are stored in `lib/` and mapped via `remappings.txt`:

```
@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
```

This lets you use clean import paths like `import "@openzeppelin/contracts/token/ERC20/ERC20.sol";`.

## Add a New Contract

To add a new contract to the project, create a new `.sol` file in `contracts/src/`. For example, an ERC-721 NFT:

```solidity
// contracts/src/MyNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MyNFT is ERC721 {
    uint256 private _nextTokenId;

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    function mint(address to) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        return tokenId;
    }
}
```

## Compile

Build all contracts with Forge:

```bash
cd contracts
forge build
```

This compiles every `.sol` file in `src/` and writes artifacts to `out/`. Each contract gets a JSON file containing its ABI, bytecode, deployed bytecode, and source maps. For example, `out/MyToken.sol/MyToken.json` contains everything needed for deployment and interaction.

After adding a new contract, you'll want to [generate C# typed services](guide-codegen) so you can interact with it from .NET.

## The `foundry.toml` Configuration

The template's `foundry.toml` is minimal — Foundry's defaults work well:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
```

Common additions:
- `optimizer = true` and `optimizer_runs = 200` — enable the Solidity optimizer for production
- `via_ir = true` — use the IR-based code generator (produces smaller bytecode for complex contracts)
- `solc_version = "0.8.24"` — pin a specific compiler version

## Next Steps

Now that you have contracts compiling:

- **[Test with Forge](guide-forge-testing)** — Write Solidity unit tests before deploying
- **[Deploy with Forge Scripts](guide-forge-deploy)** — Deploy to the DevChain using `forge script`
