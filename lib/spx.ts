import type { MarketOptionContract, MarketReadyResponse } from "./market";

export type SpxMetricStatus = "ready" | "unavailable";

export interface SpxExposureRow {
  strike: number;
  callGex: number;
  putGex: number;
  netGex: number;
  callDex: number;
  putDex: number;
  netDex: number;
  callOpenInterest: number;
  putOpenInterest: number;
}

export interface SpxStructureSnapshot {
  expiration: string | null;
  contracts: number;
  quoteObservedAt: string | null;
  gexStatus: SpxMetricStatus;
  gexReason: string | null;
  dexStatus: SpxMetricStatus;
  dexReason: string | null;
  rows: SpxExposureRow[];
  netGex: number | null;
  netDex: number | null;
  callWall: number | null;
  putWall: number | null;
  atmStrike: number | null;
  atmIv: number | null;
  skew25Delta: number | null;
  expectedMove: number | null;
  expectedMoveLower: number | null;
  expectedMoveUpper: number | null;
  expectedMoveReason: string | null;
  pairedQuoteDeltaMs: number | null;
  zeroGamma: number | null;
  zeroGammaReason: string;
  gexContracts: number;
  dexContracts: number;
  quotePairs: number;
}

const MAX_PAIRED_QUOTE_DELTA_MS = 60_000;

function latestIso(values: Array<string | null>) {
  const epochs = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).valueOf())
    .filter(Number.isFinite);
  return epochs.length ? new Date(Math.max(...epochs)).toISOString() : null;
}

function quoteMid(contract: MarketOptionContract | undefined) {
  if (!contract || contract.bid === null || contract.ask === null) return null;
  if (contract.bid < 0 || contract.ask < contract.bid) return null;
  return (contract.bid + contract.ask) / 2;
}

function quoteDeltaMs(
  left: MarketOptionContract | undefined,
  right: MarketOptionContract | undefined,
) {
  if (!left?.quoteObservedAt || !right?.quoteObservedAt) return null;
  const delta = Math.abs(
    new Date(left.quoteObservedAt).valueOf() -
      new Date(right.quoteObservedAt).valueOf(),
  );
  return Number.isFinite(delta) ? delta : null;
}

function blockingReason(data: MarketReadyResponse) {
  if (!data.chain.complete) return "请求范围内的期权链被截断，禁止汇总全局暴露。";
  const warning = data.warnings.find((item) => item.severity === "blocking");
  return warning?.message ?? null;
}

export function spxExpirations(data: MarketReadyResponse) {
  return [...new Set(data.contracts.map((contract) => contract.expiration))].sort();
}

/**
 * 为一个明确到期日构建 SPX 结构快照。
 *
 * 每项指标独立门控：GEX 不会吞掉缺失 Gamma/OI，DEX 不会把缺失 Delta 当作 0；
 * 预期波动只接受同一行权价、同一到期日且报价相差不超过 60 秒的 ATM straddle。
 */
export function buildSpxStructure(
  data: MarketReadyResponse,
  requestedExpiration?: string,
): SpxStructureSnapshot {
  const expirations = spxExpirations(data);
  const expiration = requestedExpiration && expirations.includes(requestedExpiration)
    ? requestedExpiration
    : expirations[0] ?? null;
  const contracts = expiration
    ? data.contracts.filter((contract) => contract.expiration === expiration)
    : [];
  const globalBlock = blockingReason(data);
  const missingGex = contracts.filter((contract) =>
    contract.openInterest === null ||
    contract.openInterest < 0 ||
    contract.multiplierAssumed ||
    (contract.openInterest > 0 && (contract.gamma === null || contract.gamma < 0)),
  ).length;
  const missingDex = contracts.filter((contract) =>
    contract.openInterest === null ||
    contract.openInterest < 0 ||
    contract.multiplierAssumed ||
    (contract.openInterest > 0 && (
      contract.delta === null ||
      contract.delta < -1 ||
      contract.delta > 1
    )),
  ).length;
  const gexStatus: SpxMetricStatus = !globalBlock && contracts.length > 0 && missingGex === 0
    ? "ready"
    : "unavailable";
  const dexStatus: SpxMetricStatus = !globalBlock && contracts.length > 0 && missingDex === 0
    ? "ready"
    : "unavailable";
  const gexReason = gexStatus === "ready"
    ? null
    : globalBlock ?? (contracts.length === 0
      ? "该到期日没有合约。"
      : `${missingGex} 份合约的 OI、Gamma 或乘数不可验证，未用默认值回填。`);
  const dexReason = dexStatus === "ready"
    ? null
    : globalBlock ?? (contracts.length === 0
      ? "该到期日没有合约。"
      : `${missingDex} 份合约的 OI、Delta 或乘数不可验证，未用默认值回填。`);

  const buckets = new Map<number, SpxExposureRow>();
  for (const contract of contracts) {
    const row = buckets.get(contract.strike) ?? {
      strike: contract.strike,
      callGex: 0,
      putGex: 0,
      netGex: 0,
      callDex: 0,
      putDex: 0,
      netDex: 0,
      callOpenInterest: 0,
      putOpenInterest: 0,
    };
    const side = contract.type === "call" ? 1 : -1;
    if (gexStatus === "ready") {
      const gex = side * (contract.gamma ?? 0) * (contract.openInterest ?? 0) *
        contract.multiplier * data.spot * data.spot * 0.01;
      if (contract.type === "call") {
        row.callGex += gex;
        row.callOpenInterest += contract.openInterest ?? 0;
      } else {
        row.putGex += gex;
        row.putOpenInterest += contract.openInterest ?? 0;
      }
      row.netGex += gex;
    }
    if (dexStatus === "ready") {
      const dex = (contract.delta ?? 0) * (contract.openInterest ?? 0) *
        contract.multiplier * data.spot;
      if (contract.type === "call") row.callDex += dex;
      else row.putDex += dex;
      row.netDex += dex;
    }
    buckets.set(contract.strike, row);
  }
  const rows = [...buckets.values()].sort((left, right) => left.strike - right.strike);
  const callCandidates = gexStatus === "ready"
    ? rows.filter((row) => row.callGex > 0)
    : [];
  const putCandidates = gexStatus === "ready"
    ? rows.filter((row) => row.putGex < 0)
    : [];
  const callWall = callCandidates.length
    ? callCandidates.reduce((best, row) => row.callGex > best.callGex ? row : best).strike
    : null;
  const putWall = putCandidates.length
    ? putCandidates.reduce((best, row) => Math.abs(row.putGex) > Math.abs(best.putGex) ? row : best).strike
    : null;

  const pairs = new Map<number, { call?: MarketOptionContract; put?: MarketOptionContract }>();
  for (const contract of contracts) {
    const pair = pairs.get(contract.strike) ?? {};
    pair[contract.type] = contract;
    pairs.set(contract.strike, pair);
  }
  const completePairs = [...pairs.entries()]
    .filter(([, pair]) => pair.call && pair.put)
    .sort((left, right) => Math.abs(left[0] - data.spot) - Math.abs(right[0] - data.spot));
  const atm = completePairs[0] ?? null;
  const atmStrike = atm?.[0] ?? null;
  const call = atm?.[1].call;
  const put = atm?.[1].put;
  const callMid = quoteMid(call);
  const putMid = quoteMid(put);
  const pairedQuoteDeltaMs = quoteDeltaMs(call, put);
  const synchronizedPair = pairedQuoteDeltaMs !== null &&
    pairedQuoteDeltaMs <= MAX_PAIRED_QUOTE_DELTA_MS;
  const canUseStraddle = !globalBlock && callMid !== null && putMid !== null && synchronizedPair;
  const expectedMove = canUseStraddle ? callMid + putMid : null;
  let expectedMoveReason: string | null = null;
  if (!canUseStraddle) {
    expectedMoveReason = globalBlock ?? (
      callMid === null || putMid === null
        ? "最近 ATM Call/Put 缺少有效双边报价。"
        : pairedQuoteDeltaMs === null
          ? "ATM Call/Put 缺少可验证的报价时间。"
          : `ATM Call/Put 报价相差 ${Math.round(pairedQuoteDeltaMs / 1000)} 秒，超过 60 秒门槛。`
    );
  }
  const pairIvs = [call?.impliedVolatility, put?.impliedVolatility]
    .filter((value): value is number => value !== null && value !== undefined && value >= 0);
  const atmIv = !globalBlock && synchronizedPair && pairIvs.length === 2
    ? pairIvs.reduce((sum, value) => sum + value, 0) / pairIvs.length
    : null;

  const calls25 = contracts
    .filter((contract) => contract.type === "call" && contract.delta !== null && contract.impliedVolatility !== null)
    .sort((left, right) => Math.abs((left.delta ?? 0) - 0.25) - Math.abs((right.delta ?? 0) - 0.25));
  const puts25 = contracts
    .filter((contract) => contract.type === "put" && contract.delta !== null && contract.impliedVolatility !== null)
    .sort((left, right) => Math.abs((left.delta ?? 0) + 0.25) - Math.abs((right.delta ?? 0) + 0.25));
  const skew25Delta = !globalBlock && calls25[0] && puts25[0]
    ? (puts25[0].impliedVolatility ?? 0) - (calls25[0].impliedVolatility ?? 0)
    : null;

  return {
    expiration,
    contracts: contracts.length,
    quoteObservedAt: latestIso(contracts.map((contract) => contract.quoteObservedAt)),
    gexStatus,
    gexReason,
    dexStatus,
    dexReason,
    rows,
    netGex: gexStatus === "ready" ? rows.reduce((sum, row) => sum + row.netGex, 0) : null,
    netDex: dexStatus === "ready" ? rows.reduce((sum, row) => sum + row.netDex, 0) : null,
    callWall,
    putWall,
    atmStrike,
    atmIv,
    skew25Delta,
    expectedMove,
    expectedMoveLower: expectedMove === null ? null : Math.max(0, data.spot - expectedMove),
    expectedMoveUpper: expectedMove === null ? null : data.spot + expectedMove,
    expectedMoveReason,
    pairedQuoteDeltaMs,
    zeroGamma: null,
    zeroGammaReason: "缺少可验证的利率曲线、SPX 股息曲线与结算类型，未使用默认值伪造 Zero Gamma。",
    gexContracts: contracts.length - missingGex,
    dexContracts: contracts.length - missingDex,
    quotePairs: completePairs.filter(([, pair]) => quoteMid(pair.call) !== null && quoteMid(pair.put) !== null).length,
  };
}
