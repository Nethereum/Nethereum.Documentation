---
title: "Uniswap: Manage Liquidity"
sidebar_label: "Uniswap: Manage Liquidity"
sidebar_position: 3
description: Provide liquidity to Uniswap V4 pools, manage positions, collect fees, and rebalance with Nethereum
---

# Uniswap: Manage Liquidity

:::tip The Simple Way
```csharp
var uniswap = web3.UniswapV4();
var actionsBuilder = uniswap.Positions.CreatePositionManagerActionsBuilder();
actionsBuilder.AddCommand(new MintPosition { PoolKey = pool, TickLower = -600, TickUpper = 600, ... });
var receipt = await uniswap.Positions.Manager.ModifyLiquiditiesRequestAndWaitForReceiptAsync(modifyFunction);
```
All position operations (mint, increase, decrease, burn, collect fees) go through the Position Manager actions builder.
:::

Providing liquidity on Uniswap means depositing tokens into a pool to earn trading fees. In V4, liquidity positions are concentrated — you choose a price range (tick range), and your liquidity only earns fees when the pool price is within that range. This guide covers the full lifecycle: creating positions, adjusting liquidity, collecting fees, rebalancing, and closing out.

```bash
dotnet add package Nethereum.Uniswap
```

## Connect to the Position Manager

Position operations use the `Positions.Manager` service and the actions builder pattern. Every liquidity operation is built as a set of actions, then submitted in a single transaction:

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Nethereum.Uniswap.V4;

var web3 = new Web3(new Account("0xYOUR_PRIVATE_KEY"), "https://base-sepolia.drpc.org");
var uniswap = web3.UniswapV4(UniswapV4Addresses.BaseSepolia);

var positionManager = uniswap.Positions.Manager;
```

The `positionManager` is an ERC-721 contract — each liquidity position is an NFT with a unique `tokenId`.

## Create a New Position

To mint a new liquidity position, define the pool, the price range (as ticks), and how much liquidity to add. The `MintPosition` action creates the NFT and deposits tokens:

```csharp
var eth = AddressUtil.ZERO_ADDRESS;
var usdc = "0x91D1e0b9f6975655A381c79fd6f1D118D1c5b958";

var poolKey = new PoolKey
{
    Currency0 = eth,
    Currency1 = usdc,
    Fee = 500,
    TickSpacing = 10,
    Hooks = AddressUtil.ZERO_ADDRESS
};

var actionsBuilder = uniswap.Positions.CreatePositionManagerActionsBuilder();

actionsBuilder.AddCommand(new MintPosition
{
    PoolKey = poolKey,
    TickLower = -600,
    TickUpper = 600,
    Liquidity = Web3.Convert.ToWei(0.01m),
    Amount0Max = Web3.Convert.ToWei(0.1m),          // Max ETH to deposit
    Amount1Max = Web3.Convert.ToWei(300, UnitConversion.EthUnit.Mwei), // Max USDC
    Recipient = account,
    HookData = new byte[0]
});

actionsBuilder.AddCommand(new SettlePair { Currency0 = eth, Currency1 = usdc });

var receipt = await positionManager.ModifyLiquiditiesRequestAndWaitForReceiptAsync(
    new ModifyLiquiditiesFunction
    {
        UnlockData = actionsBuilder.GetUnlockData(),
        Deadline = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 60,
        AmountToSend = Web3.Convert.ToWei(0.1m) // ETH value for native currency
    });
```

The `Amount0Max` and `Amount1Max` are slippage protection — the transaction reverts if the pool price moves and would require more tokens than you specified. The actual amounts deposited depend on the current price relative to your tick range.

After minting, extract the token ID from the receipt:

```csharp
var tokenId = V4PositionReceiptHelper.GetMintedTokenId(
    receipt, UniswapAddresses.MainnetPositionManagerV4);
Console.WriteLine($"Position NFT: {tokenId}");
```

## Query Position Information

Once you have a position, you can query its liquidity, price range, and current value:

```csharp
// Get liquidity amount
var liquidity = await positionManager.GetPositionLiquidityQueryAsync(tokenId);

// Get pool key and position details
var positionInfo = await positionManager.GetPoolAndPositionInfoQueryAsync(tokenId);
Console.WriteLine($"Pool: {positionInfo.PoolKey.Currency0}/{positionInfo.PoolKey.Currency1}");
Console.WriteLine($"Fee: {positionInfo.PoolKey.Fee}");

// Decode tick range
var positionInfoBytes = await positionManager.PositionInfoQueryAsync(tokenId);
var decoded = uniswap.Positions.PositionInfoDecoder.DecodePositionInfo(positionInfoBytes);
Console.WriteLine($"Range: tick {decoded.TickLower} to {decoded.TickUpper}");

// Check owner
var owner = await positionManager.OwnerOfQueryAsync(tokenId);
```

## Calculate Position Value

To see how much each token your position currently holds (based on the pool's current price):

```csharp
var valueCalculator = uniswap.Positions.PositionValueCalculator;

var positionValue = await valueCalculator.GetPositionValueAsync(
    tokenId, token0Decimals: 18, token1Decimals: 6);

Console.WriteLine($"ETH: {Web3.Convert.FromWei(positionValue.Amount0, 18)}");
Console.WriteLine($"USDC: {Web3.Convert.FromWei(positionValue.Amount1, 6)}");
Console.WriteLine($"Total value in ETH: {positionValue.ValueInToken0}");
Console.WriteLine($"Total value in USDC: {positionValue.ValueInToken1}");
```

This calculation uses the position's liquidity and tick range against the pool's current `sqrtPriceX96`.

## Calculate Token Amounts from Liquidity

For more precise control, the liquidity calculator converts between liquidity units and token amounts:

```csharp
var amounts = uniswap.Positions.LiquidityCalculator.GetAmountsForLiquidityByTicks(
    sqrtPriceX96, tickLower, tickUpper, liquidity);

var amount0 = amounts.Item1; // Token0 amount in wei
var amount1 = amounts.Item2; // Token1 amount in wei
```

## Increase Liquidity

To add more tokens to an existing position (same price range), use `IncreaseLiquidity` with the position's `tokenId`:

```csharp
var actionsBuilder = uniswap.Positions.CreatePositionManagerActionsBuilder();

actionsBuilder.AddCommand(new IncreaseLiquidity
{
    TokenId = tokenId,
    Liquidity = Web3.Convert.ToWei(0.005m),
    Amount0Max = Web3.Convert.ToWei(0.05m),
    Amount1Max = Web3.Convert.ToWei(150, UnitConversion.EthUnit.Mwei),
    HookData = new byte[0]
});

actionsBuilder.AddCommand(new SettlePair { Currency0 = eth, Currency1 = usdc });

var receipt = await positionManager.ModifyLiquiditiesRequestAndWaitForReceiptAsync(
    new ModifyLiquiditiesFunction
    {
        UnlockData = actionsBuilder.GetUnlockData(),
        Deadline = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 60,
        AmountToSend = Web3.Convert.ToWei(0.05m)
    });
```

## Decrease Liquidity

To remove some liquidity and withdraw tokens back to your wallet:

```csharp
var actionsBuilder = uniswap.Positions.CreatePositionManagerActionsBuilder();

actionsBuilder.AddCommand(new DecreaseLiquidity
{
    TokenId = tokenId,
    Liquidity = Web3.Convert.ToWei(0.005m),
    Amount0Min = 0,  // Set > 0 for slippage protection
    Amount1Min = 0,
    HookData = new byte[0]
});

actionsBuilder.AddCommand(new TakePair { Currency0 = eth, Currency1 = usdc, Recipient = account });

var receipt = await positionManager.ModifyLiquiditiesRequestAndWaitForReceiptAsync(
    new ModifyLiquiditiesFunction
    {
        UnlockData = actionsBuilder.GetUnlockData(),
        Deadline = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 60
    });
```

After decreasing, you use `TakePair` (instead of `SettlePair`) to receive the withdrawn tokens.

## Collect Fees

Trading fees accumulate automatically. To collect them without removing liquidity, call `DecreaseLiquidity` with `Liquidity = 0`:

```csharp
var actionsBuilder = uniswap.Positions.CreatePositionManagerActionsBuilder();

actionsBuilder.AddCommand(new DecreaseLiquidity
{
    TokenId = tokenId,
    Liquidity = 0,         // Zero = collect fees only, no liquidity change
    Amount0Min = 0,
    Amount1Min = 0,
    HookData = new byte[0]
});

actionsBuilder.AddCommand(new TakePair { Currency0 = eth, Currency1 = usdc, Recipient = account });

var receipt = await positionManager.ModifyLiquiditiesRequestAndWaitForReceiptAsync(
    new ModifyLiquiditiesFunction
    {
        UnlockData = actionsBuilder.GetUnlockData(),
        Deadline = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 60
    });
```

This pattern is efficient — you pay gas once to collect all accumulated fees.

### Batch Fee Collection

You can collect fees from multiple positions in a single transaction:

```csharp
var actionsBuilder = uniswap.Positions.CreatePositionManagerActionsBuilder();

// Collect from position 1
actionsBuilder.AddCommand(new DecreaseLiquidity
    { TokenId = tokenId1, Liquidity = 0, Amount0Min = 0, Amount1Min = 0, HookData = new byte[0] });

// Collect from position 2
actionsBuilder.AddCommand(new DecreaseLiquidity
    { TokenId = tokenId2, Liquidity = 0, Amount0Min = 0, Amount1Min = 0, HookData = new byte[0] });

actionsBuilder.AddCommand(new TakePair { Currency0 = eth, Currency1 = usdc, Recipient = account });

var receipt = await positionManager.ModifyLiquiditiesRequestAndWaitForReceiptAsync(
    new ModifyLiquiditiesFunction
    {
        UnlockData = actionsBuilder.GetUnlockData(),
        Deadline = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 60
    });
```

## Atomic Rebalancing

When the market price moves outside your range, your position stops earning fees. You can rebalance atomically — close the old position and open a new one with a different range — in a single transaction:

```csharp
var actionsBuilder = uniswap.Positions.CreatePositionManagerActionsBuilder();

// Close old position
actionsBuilder.AddCommand(new DecreaseLiquidity
{
    TokenId = oldTokenId,
    Liquidity = oldLiquidity,
    Amount0Min = 0,
    Amount1Min = 0,
    HookData = new byte[0]
});

// Open new position with wider range
actionsBuilder.AddCommand(new MintPosition
{
    PoolKey = poolKey,
    TickLower = -1200,
    TickUpper = 1200,
    Liquidity = Web3.Convert.ToWei(0.01m),
    Amount0Max = Web3.Convert.ToWei(0.1m),
    Amount1Max = Web3.Convert.ToWei(300, UnitConversion.EthUnit.Mwei),
    Recipient = account,
    HookData = new byte[0]
});

actionsBuilder.AddCommand(new CloseCurrency { Currency = eth });
actionsBuilder.AddCommand(new CloseCurrency { Currency = usdc });

var receipt = await positionManager.ModifyLiquiditiesRequestAndWaitForReceiptAsync(
    new ModifyLiquiditiesFunction
    {
        UnlockData = actionsBuilder.GetUnlockData(),
        Deadline = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 60,
        AmountToSend = Web3.Convert.ToWei(0.15m)
    });
```

Because both operations happen atomically, there's no risk of the price moving between closing and opening. `CloseCurrency` handles the net settlement — if the old position returns more tokens than the new one needs, you receive the difference; if it needs more, you pay the difference.

## Burn a Position

To fully close a position and burn the NFT, first remove all liquidity, then burn:

```csharp
var actionsBuilder = uniswap.Positions.CreatePositionManagerActionsBuilder();

actionsBuilder.AddCommand(new DecreaseLiquidity
{
    TokenId = tokenId,
    Liquidity = totalLiquidity,  // Remove everything
    Amount0Min = 0,
    Amount1Min = 0,
    HookData = new byte[0]
});

actionsBuilder.AddCommand(new BurnPosition
{
    TokenId = tokenId,
    Amount0Min = 0,
    Amount1Min = 0,
    HookData = new byte[0]
});

actionsBuilder.AddCommand(new TakePair { Currency0 = eth, Currency1 = usdc, Recipient = account });

var receipt = await positionManager.ModifyLiquiditiesRequestAndWaitForReceiptAsync(
    new ModifyLiquiditiesFunction
    {
        UnlockData = actionsBuilder.GetUnlockData(),
        Deadline = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 60
    });
```

After burning, the NFT is destroyed and the `tokenId` is no longer valid.

## Next Steps

- [Uniswap: Swap Tokens](guide-uniswap-swap) -- quote prices and execute swaps
- [Gnosis Safe](guide-gnosis-safe) -- execute Uniswap operations through a multi-sig wallet
- [Nethereum.Uniswap Package Reference](nethereum-uniswap) -- full API covering V2, V3, V4, Permit2, pool discovery, and path finding
