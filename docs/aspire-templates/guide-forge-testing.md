---
title: Test with Forge
sidebar_label: Test with Forge
sidebar_position: 6
description: Write and run Solidity unit tests with Forge, including fuzz testing, gas reports, and coverage.
---

# Test with Forge

Forge is Foundry's testing framework — it runs Solidity tests against a local EVM with zero setup. The dApp template ships with tests for the [MyToken contract](guide-solidity-contracts) you explored in the previous guide. This guide explains the testing patterns and shows how to add your own.

## Run the Template Tests

```bash
cd contracts
forge test
```

You should see all tests pass:

```
[PASS] test_InitialSupply() (gas: ...)
[PASS] test_Mint() (gas: ...)
[PASS] test_MintAndTransfer() (gas: ...)
[PASS] test_Name() (gas: ...)
[PASS] test_Symbol() (gas: ...)
[PASS] test_Transfer() (gas: ...)
```

Add `-vvv` for detailed trace output on failures:

```bash
forge test -vvv
```

## Test Structure

Open `contracts/test/MyToken.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/MyToken.sol";

contract MyTokenTest is Test {
    MyToken public token;
    address public deployer;
    address public alice;
    address public bob;

    function setUp() public {
        deployer = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        token = new MyToken("MyToken", "MTK", 1_000_000 ether);
    }

    function test_InitialSupply() public view {
        assertEq(token.totalSupply(), 1_000_000 ether);
        assertEq(token.balanceOf(deployer), 1_000_000 ether);
    }

    function test_Name() public view {
        assertEq(token.name(), "MyToken");
    }

    function test_Symbol() public view {
        assertEq(token.symbol(), "MTK");
    }

    function test_Mint() public {
        token.mint(alice, 500 ether);
        assertEq(token.balanceOf(alice), 500 ether);
    }

    function test_Transfer() public {
        token.transfer(alice, 100 ether);
        assertEq(token.balanceOf(alice), 100 ether);
        assertEq(token.balanceOf(deployer), 1_000_000 ether - 100 ether);
    }

    function test_MintAndTransfer() public {
        token.mint(alice, 200 ether);

        vm.prank(alice);
        token.transfer(bob, 50 ether);

        assertEq(token.balanceOf(alice), 150 ether);
        assertEq(token.balanceOf(bob), 50 ether);
    }
}
```

Key patterns:
- **`setUp()`** runs before each test — deploy fresh contract state
- **`test_` prefix** marks a function as a test
- **`assertEq`** for equality checks, `assertTrue`, `assertFalse` for booleans
- **`address(this)`** is the test contract itself (the deployer/caller)
- **`ether`** is a Solidity unit (10^18 wei) — convenient for token amounts with 18 decimals

## Fuzz Testing

Forge can automatically generate random inputs to find edge cases. Prefix your test parameter with a variable name and Forge will fuzz it:

```solidity
function test_MintFuzz(uint256 amount) public {
    vm.assume(amount > 0 && amount < type(uint128).max);
    token.mint(address(0xBEEF), amount);
    assertEq(token.balanceOf(address(0xBEEF)), amount);
}
```

`vm.assume()` filters out invalid inputs. Forge runs 256 random inputs by default — configure with `fuzz.runs` in `foundry.toml`:

```toml
[fuzz]
runs = 1000
```

## Gas Reports

See how much gas each function uses:

```bash
forge test --gas-report
```

This produces a table showing min, average, median, and max gas for each function call across all tests. Useful for optimizing contract operations.

## Test Coverage

Check which lines of your contracts are exercised by tests:

```bash
forge coverage
```

This shows a per-file percentage of lines, branches, and functions covered. For a summary report:

```bash
forge coverage --report summary
```

## Testing Reverts

Test that functions revert when they should:

```solidity
function test_TransferMoreThanBalance() public {
    vm.expectRevert();
    token.transfer(address(0xBEEF), 2_000_000 ether); // Only have 1M
}
```

For specific revert messages:

```solidity
function test_TransferFromWithoutApproval() public {
    vm.prank(address(0xBEEF));
    vm.expectRevert();
    token.transferFrom(address(this), address(0xCAFE), 100 ether);
}
```

`vm.prank(address)` makes the next call appear to come from that address — useful for testing access control and multi-party scenarios.

## Next Steps

Your Solidity tests verify contract logic at the EVM level. The full testing story continues with:

- **[Deploy with Forge Scripts](guide-forge-deploy)** — Deploy contracts to the DevChain for manual testing
- **[Generate C# from Solidity](guide-codegen)** — Convert your ABIs into typed C# services
- **[Unit Test with C#](guide-csharp-unit-testing)** — Write complementary tests in C# using the generated services
