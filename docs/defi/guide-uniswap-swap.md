---
title: "Uniswap: Swap Tokens"
sidebar_label: "Uniswap: Swap Tokens"
sidebar_position: 2
description: Quote prices, execute token swaps, and handle slippage using Nethereum's Uniswap integration
---

# Uniswap: Swap Tokens

:::tip The Simple Way
```csharp
var uniswap = web3.UniswapV4();
var quote = await uniswap.Pricing.Quoter.QuoteExactInputQueryAsync(quoteParams);
var receipt = await uniswap.UniversalRouter.ExecuteRequestAndWaitForReceiptAsync(executeFunction);
```
Access Uniswap through `web3.UniswapV4()` — pool discovery, quoting, and routing are all built in.
:::

Swapping tokens on Uniswap is the most common DeFi operation. Nethereum provides a complete Uniswap integration covering V2, V3, and V4 — including price quoting, slippage protection, and the Universal Router for executing swaps on-chain. This guide walks through the V4 flow (the latest and recommended version), with V3 and V2 patterns at the end.

```bash
dotnet add package Nethereum.Uniswap
```

## Connect to Uniswap V4

The `UniswapV4()` extension method on `Web3` gives you access to the entire Uniswap V4 service hierarchy — pools, pricing, positions, and routing. It defaults to Mainnet addresses, but you can pass addresses for any supported network:

```csharp
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Nethereum.Uniswap.V4;

var web3 = new Web3(new Account("0xYOUR_PRIVATE_KEY"), "https://base-sepolia.drpc.org");

// Defaults to Mainnet contract addresses
var uniswap = web3.UniswapV4();

// Or specify a different network
var uniswap = web3.UniswapV4(UniswapV4Addresses.BaseSepolia);
```

The `uniswap` object exposes sub-services: `uniswap.Pools` for pool state, `uniswap.Pricing` for quotes and price calculations, `uniswap.Positions` for liquidity management, and `uniswap.UniversalRouter` for executing swaps.

## Define a Pool

A Uniswap V4 pool is identified by a `PoolKey` — the two currencies, fee tier, tick spacing, and an optional hooks contract. You need to know the pool you want to trade in:

```csharp
using Nethereum.Uniswap.V4.Contracts.PoolManager.ContractDefinition;
using Nethereum.Util;

var eth = AddressUtil.ZERO_ADDRESS;  // Native ETH uses the zero address
var usdc = "0x91D1e0b9f6975655A381c79fd6f1D118D1c5b958";

var pool = new PoolKey
{
    Currency0 = eth,
    Currency1 = usdc,
    Fee = 500,           // 0.05% fee tier
    TickSpacing = 10,
    Hooks = AddressUtil.ZERO_ADDRESS  // No hooks
};
```

The `Currency0` must be the lower address (sorted). Native ETH is always `address(0)`, which sorts first. If you're not sure which pool exists for a pair, see the [Pool Discovery](#discover-pools) section below.

## Quote a Price

Before swapping, get a quote to see how much output you'll receive. The quoter simulates the swap on-chain without executing it — no gas cost, no state change:

```csharp
var v4Quoter = uniswap.Pricing.Quoter;

var pathKeys = V4PathEncoder.EncodeMultihopExactInPath(
    new List<PoolKey> { pool }, eth);

var amountIn = Web3.Convert.ToWei(0.001);

var quoteParams = new QuoteExactParams
{
    Path = pathKeys,
    ExactAmount = amountIn,
    ExactCurrency = eth
};

var quote = await v4Quoter.QuoteExactInputQueryAsync(quoteParams);
var quoteAmount = Web3.Convert.FromWei(quote.AmountOut, 6); // USDC has 6 decimals
Console.WriteLine($"0.001 ETH = {quoteAmount} USDC");
```

The `V4PathEncoder` handles encoding the swap path. For a single-hop swap (one pool), pass a list with one pool key. For multi-hop swaps, pass multiple pool keys — the router will execute them in sequence.

## Execute the Swap

Swaps go through the Universal Router, which batches multiple actions (swap, settle input, take output) into a single transaction. You build the actions with the V4 actions builder:

```csharp
var universalRouter = uniswap.UniversalRouter;
var v4ActionBuilder = uniswap.GetUniversalRouterV4ActionsBuilder();

// 1. Add the swap action
v4ActionBuilder.AddCommand(new SwapExactIn
{
    CurrencyIn = eth,
    AmountIn = amountIn,
    AmountOutMinimum = quote.AmountOut * 95 / 100, // 5% slippage tolerance
    Path = pathKeys.MapToActionV4()
});

// 2. Settle the input currency (send ETH to the router)
v4ActionBuilder.AddCommand(new SettleAll
{
    Currency = eth,
    Amount = amountIn
});

// 3. Take the output currency (receive USDC)
v4ActionBuilder.AddCommand(new TakeAll
{
    Currency = usdc,
    MinAmount = 0
});

// Build and execute
var routerBuilder = new UniversalRouterBuilder();
routerBuilder.AddCommand(v4ActionBuilder.GetV4SwapCommand());

var executeFunction = routerBuilder.GetExecuteFunction(amountIn);
var receipt = await universalRouter.ExecuteRequestAndWaitForReceiptAsync(executeFunction);
Console.WriteLine($"Swap tx: {receipt.TransactionHash}");
```

The three actions form the standard swap pattern: **swap** (exchange tokens in the pool), **settle** (pay the input), **take** (collect the output). The `AmountOutMinimum` on the swap protects you from getting less than expected due to price movement — this is your slippage tolerance.

## Slippage and Price Impact

Slippage protection is critical in DeFi. Nethereum provides calculators for both slippage bounds and price impact monitoring:

```csharp
var slippage = uniswap.Pricing.SlippageCalculator;

// For exact-input swaps: calculate the minimum acceptable output
var tolerance = new BigDecimal(0.5m); // 0.5% slippage
var minAmountOut = slippage.CalculateMinimumAmountOut(expectedAmountOut, tolerance);

// For exact-output swaps: calculate the maximum you're willing to pay
var maxAmountIn = slippage.CalculateMaximumAmountIn(expectedAmountIn, tolerance);
```

Price impact tells you how much your trade moves the pool price. Large trades in shallow pools can have significant impact:

```csharp
var impactCalc = uniswap.Pricing.PriceImpactCalculator;

var priceImpact = impactCalc.CalculatePriceImpact(inputAmount, outputAmount, midPrice);
var level = impactCalc.ClassifyPriceImpact(priceImpact);
// Returns: Low (<1%), Medium (1-3%), High (3-5%), Critical (>5%)

var warning = impactCalc.GetPriceImpactWarning(level);
```

A swap with >5% price impact usually means you're trading too large for that pool's liquidity. Consider splitting the trade or finding a deeper pool.

## Price Calculations

You can calculate human-readable prices from the pool's raw `sqrtPriceX96` value:

```csharp
var prices = uniswap.Pricing.PriceCalculator.CalculatePricesFromSqrtPriceX96(
    sqrtPriceX96,
    token0Decimals: 18,
    token1Decimals: 6);

var priceToken0InToken1 = prices.Item1; // e.g., 1 ETH = 3500 USDC
var priceToken1InToken0 = prices.Item2; // e.g., 1 USDC = 0.000286 ETH
```

Tick math conversions are also available for working with price ranges:

```csharp
var sqrtPriceX96 = uniswap.Math.Tick.GetSqrtRatioAtTick(tick);
var tick = uniswap.Math.Tick.GetTickAtSqrtRatio(sqrtPriceX96);
```

## Discover Pools

If you don't know which pools exist for a token pair, the pool cache can discover them from on-chain Initialize events:

```csharp
var poolCache = uniswap.Pools.Cache;
var latestBlock = await web3.Eth.Blocks.GetBlockNumber.SendRequestAsync();
var startBlock = latestBlock.Value - 100_000;

var pools = await poolCache.FindPoolsForTokenAsync(
    token: usdc,
    fromBlockNumber: startBlock,
    toBlockNumber: latestBlock.Value);

foreach (var p in pools)
{
    Console.WriteLine($"Pool: {p.Currency0}/{p.Currency1}, Fee: {p.Fee}");
}
```

Discovered pools are automatically cached. You can also fetch and cache a specific pool directly:

```csharp
var pool = await poolCache.GetOrFetchPoolAsync(
    currency0: eth, currency1: usdc, fee: 500, tickSpacing: 10);

Console.WriteLine($"Exists: {pool.Exists}, Tick: {pool.Tick}");
```

## Find the Best Swap Path

For large trades or exotic pairs, routing through an intermediate token (like WETH or DAI) can give better prices. The path finder evaluates all cached pools:

```csharp
var pathFinder = uniswap.Pricing.QuotePricePathFinder;
var cachedPools = await poolCache.GetAllCachedPoolsAsync();

// Direct path only
var bestDirect = await pathFinder.FindBestDirectPathAsync(
    tokenIn: eth, tokenOut: usdc,
    amountIn: Web3.Convert.ToWei(1),
    candidatePools: cachedPools);

// Multi-hop through intermediate tokens
var bestPath = await pathFinder.FindBestPathAsync(
    tokenIn: usdc, tokenOut: weth,
    amountIn: Web3.Convert.ToWei(1000, UnitConversion.EthUnit.Mwei),
    intermediateTokens: new[] { dai, eth },
    candidatePools: cachedPools);

Console.WriteLine($"Best output: {Web3.Convert.FromWei(bestPath.AmountOut, 18)} WETH");
Console.WriteLine($"Hops: {bestPath.Path.Count}");
```

## Token Approvals

Before swapping ERC-20 tokens (not native ETH), the router needs approval to spend them. Nethereum's approval service handles checking and approving in one call:

```csharp
await uniswap.Accounts.Approvals.CheckAndApproveIfNeededAsync(
    tokenAddress, owner, spender, requiredAmount);
```

You can also check approval status separately:

```csharp
var status = await uniswap.Accounts.Approvals.CheckApprovalAsync(
    tokenAddress, owner, spender, requiredAmount);

if (!status.IsApproved)
{
    await uniswap.Accounts.Approvals.ApproveAsync(
        tokenAddress, spender, AccountApprovalService.GetMaxApprovalAmount());
}
```

## Validate Balances

Before executing a swap, verify the sender has enough tokens:

```csharp
var balanceResult = await uniswap.Accounts.Balances.ValidateBalanceAsync(
    tokenAddress, owner, requiredAmount);

if (!balanceResult.HasSufficientBalance)
{
    Console.WriteLine($"Need {balanceResult.Deficit} more tokens");
}
```

## V3 Swaps with Permit2

For Uniswap V3, swaps use the same Universal Router but with Permit2 for gasless approvals. The flow is: approve Permit2 once, then sign off-chain permits for each swap:

```csharp
// One-time: approve Permit2 to spend your WETH
var weth9Service = web3.Eth.ERC20.GetContractService(weth9);
await weth9Service.ApproveRequestAndWaitForReceiptAsync(permit2Address, IntType.MAX_INT256_VALUE);

// Per-swap: sign a Permit2 authorization
var permit = new PermitSingle
{
    Spender = universalRouterAddress,
    SigDeadline = 2000000000,
    Details = new PermitDetails
    {
        Amount = amountIn * 100000,
        Expiration = 0,
        Nonce = 0,
        Token = weth9
    }
};

var permitService = new Permit2Service(web3, permit2Address);
var signedPermit = await permitService.GetSinglePermitWithSignatureAsync(
    permit, new EthECKey(privateKey));

// Build the swap via Universal Router
var planner = new UniversalRouterBuilder();
planner.AddCommand(new Permit2PermitCommand
{
    Permit = signedPermit.PermitRequest,
    Signature = signedPermit.GetSignatureBytes()
});
planner.AddCommand(new V3SwapExactInCommand
{
    AmountIn = amountIn,
    AmountOutMinimum = quote.AmountOut - 10000,
    Path = path,
    Recipient = account.Address,
    FundsFromPermit2OrUniversalRouter = true
});

var receipt = await universalRouterService.ExecuteRequestAndWaitForReceiptAsync(
    planner.GetExecuteFunction(amountIn));
```

## Error Handling

Uniswap reverts with custom errors. The Universal Router service can decode them:

```csharp
try
{
    var receipt = await universalRouter.ExecuteRequestAndWaitForReceiptAsync(executeFunction);
}
catch (SmartContractCustomErrorRevertException e)
{
    var error = universalRouterService.FindCustomErrorException(e);
    if (error != null)
    {
        Console.WriteLine($"Uniswap error: {error.Message}");
    }
}
```

Common errors: `InsufficientOutputAmount` (slippage too tight), `InvalidPool` (pool doesn't exist), `Expired` (deadline passed).

## Next Steps

- [Manage Liquidity](guide-uniswap-liquidity) -- provide liquidity, collect fees, and manage positions
- [Gnosis Safe](guide-gnosis-safe) -- execute Uniswap swaps through a multi-sig wallet
- [Nethereum.Uniswap Package Reference](nethereum-uniswap) -- complete API with V2, V3, V4, pool discovery, and position management
