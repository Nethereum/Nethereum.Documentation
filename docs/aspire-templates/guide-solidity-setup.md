---
title: VS Code Solidity Setup
sidebar_label: VS Code Solidity Setup
sidebar_position: 4
description: Set up VS Code with the Solidity extension and Foundry toolchain for writing, compiling, and debugging smart contracts.
---

# VS Code Solidity Setup

After [creating your dApp project](guide-dapp-template), the next step is setting up your editor for Solidity development. You'll want a proper editor setup — syntax highlighting, compiler integration, error diagnostics, and auto-completion. This guide sets up VS Code with the Solidity extension and the Foundry toolchain.

## Install the VS Code Solidity Extension

The [Solidity extension by Juan Blanco](https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity) provides:

- Syntax highlighting and code snippets
- Compiler integration (solc, Foundry remappings)
- Error diagnostics as you type
- Go to definition and references
- NatSpec documentation support
- Code formatting

Install it from the VS Code Extensions panel — search for **"Solidity"** by Juan Blanco, or from the command line:

```bash
code --install-extension JuanBlanco.solidity
```

### Configure for Foundry

The dApp template uses Foundry as its Solidity toolchain. The extension auto-detects Foundry projects via `foundry.toml`, but you can explicitly configure it in your workspace `.vscode/settings.json`:

```json
{
    "solidity.packageDefaultDependenciesContractsDirectory": "src",
    "solidity.packageDefaultDependenciesDirectory": "lib"
}
```

This tells the extension where Foundry stores source files (`src/`) and dependencies (`lib/`), so import resolution and go-to-definition work correctly with paths like `import "@openzeppelin/contracts/token/ERC20/ERC20.sol";`.

## Install Foundry

Foundry is the Solidity development toolchain that provides `forge` (build, test, deploy) and `cast` (CLI interaction with chains).

### Linux / macOS / WSL

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Windows

```bash
# Using PowerShell
irm https://foundry.paradigm.xyz | iex
foundryup
```

After installation, verify it works:

```bash
forge --version
cast --version
```

## Verify Your Setup

Open the dApp template's `contracts/` directory in VS Code:

```bash
code contracts/
```

Open `src/MyToken.sol` — you should see:

- Syntax highlighting for Solidity keywords
- No red squiggles on the `import` statements (OpenZeppelin resolves via `lib/`)
- Hover over `ERC20` to see its NatSpec documentation
- `Ctrl+Click` on `ERC20` to jump to the OpenZeppelin source

If you see import errors, run `forge install` to ensure dependencies are present:

```bash
cd contracts
forge install
```

## Project Structure

The dApp template's Foundry project follows the standard layout:

```
contracts/
├── foundry.toml          Foundry configuration
├── remappings.txt        Import path aliases (e.g., @openzeppelin → lib/...)
├── src/                  Your Solidity source files
│   └── MyToken.sol       Starter ERC-20 contract
├── test/                 Forge test files
│   └── MyToken.t.sol     Unit tests for MyToken
├── script/               Deployment scripts
│   └── Deploy.s.sol      Forge Script for deploying MyToken
├── lib/                  Dependencies (installed via forge install)
└── out/                  Compiled artifacts (ABI, bytecode, source maps)
```

## Next Steps

With your editor and toolchain ready:

- **[Write Solidity Contracts](guide-solidity-contracts)** — Create ERC-20 tokens with OpenZeppelin and structure your contracts
- **[Test with Forge](guide-forge-testing)** — Write and run Solidity unit tests
