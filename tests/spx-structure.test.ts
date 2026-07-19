import assert from "node:assert/strict";
import test from "node:test";
import { buildSpxStructure } from "../lib/spx.ts";
import type { MarketOptionContract, MarketReadyResponse } from "../lib/market.ts";

const observedAt = "2026-07-20T14:30:00.000Z";

function contract(
  ticker: string,
  type: "call" | "put",
  strike: number,
  overrides: Partial<MarketOptionContract> = {},
): MarketOptionContract {
  return {
    ticker,
    type,
    expiration: "2026-07-20",
    strike,
    multiplier: 100,
    multiplierAssumed: false,
    openInterest: 100,
    oiObservedAt: null,
    oiBasis: "previous-trading-day-eod",
    volume: 20,
    impliedVolatility: .2,
    delta: type === "call" ? .5 : -.5,
    gamma: .002,
    theta: -.1,
    vega: .2,
    hasGreeks: true,
    bid: 9.8,
    ask: 10.2,
    quoteObservedAt: observedAt,
    quoteFeedClass: "real-time",
    underlyingPrice: 6000,
    underlyingObservedAt: observedAt,
    underlyingFeedClass: "real-time",
    ...overrides,
  };
}

function fixture(contracts: MarketOptionContract[]): MarketReadyResponse {
  return {
    schemaVersion: "1.1",
    status: "ready",
    requestId: "spx-test-request",
    requestedSymbol: "SPX",
    symbol: "SPX",
    name: "S&P 500 Index",
    currency: "USD",
    source: { provider: "Massive", endpoint: "option-chain-snapshot", providerRequestIds: ["provider-1"] },
    feedClass: "real-time",
    observedAt,
    requestStartedAt: observedAt,
    fetchedAt: observedAt,
    refreshSeconds: 15,
    marketState: "open",
    marketStateEstimated: true,
    spot: 6000,
    change: 10,
    changePercent: .17,
    underlying: { price: 6000, source: "chain-underlying", feedClass: "real-time", observedAt },
    observations: {
      options: { source: "Massive option-chain snapshot", feedClass: "real-time", observedAt },
      openInterest: { source: "Massive open_interest", basis: "previous-trading-day-eod", observedAt: null, exactDateKnown: false },
    },
    chain: {
      complete: true,
      analyticsStatus: "ready",
      requestedScope: { profile: "spx-front-structure", expirationFrom: "2026-07-20", expirationTo: "2026-07-27", strikeFrom: 5520, strikeTo: 6480 },
      returnedScope: { expirationFrom: "2026-07-20", expirationTo: "2026-07-20", strikeFrom: 5950, strikeTo: 6050 },
      pagination: { pagesFetched: 1, pageSize: 250, maxPages: 20, hasMore: false },
      quoteWindow: { oldestObservedAt: observedAt, medianObservedAt: observedAt, newestObservedAt: observedAt },
      coverage: { contracts: contracts.length, expirations: 1, withOpenInterest: contracts.length, missingOpenInterest: 0, withCompleteGreeks: contracts.length, missingGreeks: 0, withTwoSidedQuotes: contracts.length, missingQuotes: 0, quoteCoveragePercent: 100, greeksCoveragePercent: 100 },
    },
    synchronization: { mixedObservationTimes: true, underlyingToNewestQuoteMs: 0, maxChainUnderlyingDeviationBps: 0 },
    analyticsStatus: "ready",
    contracts,
    warnings: [],
    hasBlockingWarnings: false,
  };
}

test("SPX DEX is unavailable when any selected contract has missing delta", () => {
  const data = fixture([
    contract("C6000", "call", 6000),
    contract("P6000", "put", 6000, { delta: null, hasGreeks: false }),
  ]);
  const result = buildSpxStructure(data, "2026-07-20");
  assert.equal(result.gexStatus, "ready");
  assert.notEqual(result.netGex, null);
  assert.equal(result.dexStatus, "unavailable");
  assert.equal(result.netDex, null);
  assert.match(result.dexReason ?? "", /1 份合约的 OI、Delta 或乘数不可验证/);
});

test("SPX metrics never mix expirations", () => {
  const nextExpiry = contract("C6100NEXT", "call", 6100, {
    expiration: "2026-07-21",
    openInterest: 100_000,
  });
  const data = fixture([
    contract("C6000", "call", 6000),
    contract("P6000", "put", 6000),
    nextExpiry,
  ]);
  const result = buildSpxStructure(data, "2026-07-20");
  assert.equal(result.contracts, 2);
  assert.equal(result.callWall, 6000);
  assert.equal(result.expiration, "2026-07-20");
});

test("ATM straddle refuses quote pairs more than 60 seconds apart", () => {
  const data = fixture([
    contract("C6000", "call", 6000),
    contract("P6000", "put", 6000, { quoteObservedAt: "2026-07-20T14:31:01.000Z" }),
  ]);
  const result = buildSpxStructure(data, "2026-07-20");
  assert.equal(result.expectedMove, null);
  assert.equal(result.pairedQuoteDeltaMs, 61_000);
  assert.match(result.expectedMoveReason ?? "", /超过 60 秒门槛/);
});

test("truncated scope blocks aggregate GEX and DEX", () => {
  const data = fixture([
    contract("C6000", "call", 6000),
    contract("P6000", "put", 6000),
  ]);
  data.chain.complete = false;
  data.hasBlockingWarnings = true;
  data.warnings.push({ code: "CHAIN_TRUNCATED", severity: "blocking", message: "chain truncated", affectedMetrics: ["gex"] });
  const result = buildSpxStructure(data, "2026-07-20");
  assert.equal(result.gexStatus, "unavailable");
  assert.equal(result.dexStatus, "unavailable");
  assert.equal(result.netGex, null);
  assert.equal(result.netDex, null);
});
