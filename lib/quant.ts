/**
 * GammaLens 的透明量化工具。
 *
 * 约定：
 * - IV、利率、股息率均用小数，例如 45% 写作 0.45。
 * - Gamma 是 Delta 对标的价格每变动 1 美元的变化量。
 * - OI GEX 使用常见的“Call 正、Put 负”展示约定，单位为标的变动 1% 时的美元 Delta 名义额变化。
 * - 这些结果描述期权结构与局部对冲敏感度，不是方向预测，也不代表真实做市商账簿。
 */

export type OptionType = "call" | "put";
export type DateInput = Date | string | number;
export type CustomerOptionSide = "long" | "short" | "unknown";

export type HedgerClass =
  | "retailLottery"
  | "prop"
  | "cashSecuredPut"
  | "macro"
  | "coveredCall"
  | "volFund"
  | "assetManager"
  | "structured";

/** 订单流推断标签。所有字段都是模型输入，而非可直接观测的持仓事实。 */
export interface HedgingInference {
  /** 客户相对期权的方向；做市商方向在模型中假设为其相反数。 */
  customerSide: CustomerOptionSide;
  /** 客户类型；可使用自定义字符串，并在 config.weights 中提供对应权重。 */
  customerClass?: HedgerClass | (string & {});
  /** 单合约覆盖：客户动态 Delta 对冲意愿，0–1。 */
  customerHedgeWeight?: number;
  /** 单合约覆盖：做市商动态 Delta 对冲意愿，0–1；默认采用全局值。 */
  dealerHedgeWeight?: number;
  /** 对手方/方向分类置信度，0–1；它不是价格预测胜率。 */
  confidence?: number;
  /** 当前标签可归因的 OI 比例，0–1；用于避免把全部 OI 强行归给一笔流。 */
  attributedOpenInterestFraction?: number;
}

export interface OptionContract {
  id?: string;
  optionType: OptionType;
  strike: number;
  /** ISO 时间、Date 或毫秒时间戳；若同时提供年化剩余期限，优先使用后者。 */
  expiration?: DateInput;
  /** 年化剩余期限，例如 30 天约为 30 / 365.25。 */
  timeToExpirationYears?: number;
  openInterest: number;
  /** 年化隐含波动率，小数形式。 */
  impliedVolatility?: number;
  /** 数据源给出的当前 Gamma；缺失时可由 BS 模型重算。 */
  gamma?: number;
  /** 有符号 Delta：Call 通常在 [0,1]，Put 通常在 [-1,0]。 */
  delta?: number;
  /** 通常美股标准合约为 100。 */
  multiplier?: number;
  hedging?: HedgingInference;
}

export interface ExposureContext {
  spot: number;
  valuationDate?: DateInput;
  riskFreeRate?: number;
  dividendYield?: number;
  defaultMultiplier?: number;
  /** true 时忽略数据源 Greeks，按当前输入的 IV/期限重新计算。 */
  recalculateGreeks?: boolean;
}

export interface BlackScholesInputs {
  spot: number;
  strike: number;
  timeToExpirationYears: number;
  volatility: number;
  riskFreeRate?: number;
  dividendYield?: number;
}

export interface BlackScholesDeltaInputs extends BlackScholesInputs {
  optionType: OptionType;
}

export interface StrikeExposure {
  strike: number;
  callGex: number;
  putGex: number;
  netGex: number;
  callDex: number;
  putDex: number;
  netDex: number;
  callOpenInterest: number;
  putOpenInterest: number;
  contractCount: number;
}

export interface GammaWall {
  optionType: OptionType;
  strike: number;
  gex: number;
  openInterest: number;
}

export interface GammaWalls {
  callWall: GammaWall | null;
  putWall: GammaWall | null;
}

export interface ZeroGammaOptions
  extends Omit<ExposureContext, "spot" | "recalculateGreeks"> {
  referenceSpot: number;
  lowerBound?: number;
  upperBound?: number;
  /** 搜索网格区间数；每个变号区间再用二分法细化。 */
  steps?: number;
  priceTolerance?: number;
  maxIterations?: number;
}

export interface ZeroGammaEstimate {
  status: "found" | "not-found" | "indeterminate";
  /** 多个零点存在时，返回离 referenceSpot 最近者。 */
  nearestLevel: number | null;
  levels: number[];
  netGexAtReference: number;
  searchRange: readonly [number, number];
}

export type ExpectedMoveInput =
  | {
      method: "iv";
      spot: number;
      annualizedImpliedVolatility: number;
      daysToExpiration: number;
      /** 默认 1 个标准差，仅为波动尺度，不保证覆盖概率。 */
      standardDeviations?: number;
    }
  | {
      method: "straddle";
      spot: number;
      /** 同到期、近 ATM 的每股权利金/Mark。 */
      callPremium: number;
      putPremium: number;
      /** 默认 1；如需经验折扣必须由调用者显式提供。 */
      premiumMultiplier?: number;
    };

export interface ExpectedMoveResult {
  method: ExpectedMoveInput["method"];
  dollarMove: number;
  percentMove: number;
  lowerBound: number;
  upperBound: number;
}

export interface EffectiveHedgingGammaConfig
  extends Omit<ExposureContext, "spot"> {
  spot: number;
  /** 客户分类到动态对冲意愿的透明映射，可覆盖默认值。 */
  weights?: Readonly<Record<string, number>>;
  /** 做市商对冲意愿，默认 1。 */
  dealerHedgeWeight?: number;
  /** 未给 customerClass/权重时的显式后备值；省略则排除该合约。 */
  defaultCustomerHedgeWeight?: number;
}

export interface EffectiveGammaClassBreakdown {
  customerClass: string;
  grossAttributedGamma: number;
  customerContribution: number;
  dealerContribution: number;
  netEffectiveGamma: number;
  contracts: number;
}

export interface EffectiveHedgingGammaResult {
  /** 正值为净长 Gamma 对冲，负值为净短 Gamma 对冲。单位 $ / 标的 1% 变动。 */
  totalEffectiveGamma: number;
  customerContribution: number;
  dealerContribution: number;
  grossAttributedGamma: number;
  /** 局部线性近似：标的上涨 1% 时，为保持 Delta 中性所需的股票美元买卖；正=买入。 */
  estimatedHedgeFlowOnUpOnePercent: number;
  /** 局部线性近似：标的下跌 1% 时的股票美元买卖；正=买入。 */
  estimatedHedgeFlowOnDownOnePercent: number;
  includedContracts: number;
  excludedContracts: number;
  byClass: EffectiveGammaClassBreakdown[];
}

/**
 * 一组可解释、可覆盖的示例先验。它们不是经验真值，也不应被称为“真实持仓”。
 * 权重越高，仅表示模型假设该类客户更可能持续做 Delta 对冲。
 */
export const DEFAULT_HEDGE_PROPENSITY_WEIGHTS: Readonly<
  Record<HedgerClass, number>
> = Object.freeze({
  retailLottery: 0.05,
  prop: 0.6,
  cashSecuredPut: 0.05,
  macro: 0.3,
  coveredCall: 0.05,
  volFund: 0.75,
  assetManager: 0.15,
  structured: 0.5,
});

const DAYS_PER_YEAR = 365.25;
const MS_PER_YEAR = DAYS_PER_YEAR * 24 * 60 * 60 * 1_000;
const ONE_PERCENT = 0.01;

function finite(name: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} 必须是有限数值`);
  }
  return value;
}

function nonNegative(name: string, value: number): number {
  finite(name, value);
  if (value < 0) throw new RangeError(`${name} 不能为负数`);
  return value;
}

function positive(name: string, value: number): number {
  finite(name, value);
  if (value <= 0) throw new RangeError(`${name} 必须大于 0`);
  return value;
}

function unitInterval(name: string, value: number): number {
  finite(name, value);
  if (value < 0 || value > 1) {
    throw new RangeError(`${name} 必须位于 [0, 1]`);
  }
  return value;
}

function asDate(value: DateInput): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError("日期格式无效");
  return date;
}

function contractMultiplier(
  contract: OptionContract,
  context: Pick<ExposureContext, "defaultMultiplier">,
): number {
  return positive(
    "multiplier",
    contract.multiplier ?? context.defaultMultiplier ?? 100,
  );
}

function timeToExpirationYears(
  contract: OptionContract,
  valuationDate?: DateInput,
): number {
  if (contract.timeToExpirationYears !== undefined) {
    return nonNegative(
      "timeToExpirationYears",
      contract.timeToExpirationYears,
    );
  }
  if (contract.expiration === undefined) {
    throw new RangeError("重算 Greeks 需要 expiration 或 timeToExpirationYears");
  }
  const asOf = valuationDate === undefined ? new Date() : asDate(valuationDate);
  return Math.max(0, (asDate(contract.expiration).getTime() - asOf.getTime()) / MS_PER_YEAR);
}

function normalPdf(value: number): number {
  return Math.exp(-0.5 * value * value) / Math.sqrt(2 * Math.PI);
}

/** Abramowitz-Stegun 近似，足以用于看板级 BS Greeks。 */
function normalCdf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    sign *
    (1 -
      (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
        0.284496736) *
        t +
        0.254829592) *
        t) *
        Math.exp(-x * x));
  return 0.5 * (1 + erf);
}

function d1(inputs: BlackScholesInputs): number {
  const spot = positive("spot", inputs.spot);
  const strike = positive("strike", inputs.strike);
  const time = positive("timeToExpirationYears", inputs.timeToExpirationYears);
  const volatility = positive("volatility", inputs.volatility);
  const rate = finite("riskFreeRate", inputs.riskFreeRate ?? 0);
  const dividend = finite("dividendYield", inputs.dividendYield ?? 0);
  return (
    Math.log(spot / strike) +
    (rate - dividend + 0.5 * volatility * volatility) * time
  ) / (volatility * Math.sqrt(time));
}

/** Black-Scholes Gamma；过期或零波动输入按 0 返回。 */
export function blackScholesGamma(inputs: BlackScholesInputs): number {
  positive("spot", inputs.spot);
  positive("strike", inputs.strike);
  const time = nonNegative(
    "timeToExpirationYears",
    inputs.timeToExpirationYears,
  );
  const volatility = nonNegative("volatility", inputs.volatility);
  const dividend = finite("dividendYield", inputs.dividendYield ?? 0);
  finite("riskFreeRate", inputs.riskFreeRate ?? 0);
  if (time === 0 || volatility === 0) return 0;
  return (
    Math.exp(-dividend * time) * normalPdf(d1(inputs)) /
    (inputs.spot * volatility * Math.sqrt(time))
  );
}

/** Black-Scholes 有符号 Delta，主要供缺失 DEX 数据时透明回退。 */
export function blackScholesDelta(inputs: BlackScholesDeltaInputs): number {
  positive("spot", inputs.spot);
  positive("strike", inputs.strike);
  const time = nonNegative(
    "timeToExpirationYears",
    inputs.timeToExpirationYears,
  );
  const volatility = nonNegative("volatility", inputs.volatility);
  const dividend = finite("dividendYield", inputs.dividendYield ?? 0);
  finite("riskFreeRate", inputs.riskFreeRate ?? 0);

  if (time === 0 || volatility === 0) {
    if (inputs.optionType === "call") {
      return inputs.spot > inputs.strike ? 1 : inputs.spot < inputs.strike ? 0 : 0.5;
    }
    return inputs.spot < inputs.strike ? -1 : inputs.spot > inputs.strike ? 0 : -0.5;
  }

  const discounted = Math.exp(-dividend * time);
  const callDelta = discounted * normalCdf(d1(inputs));
  return inputs.optionType === "call"
    ? callDelta
    : callDelta - discounted;
}

function resolveGamma(contract: OptionContract, context: ExposureContext): number {
  nonNegative("openInterest", contract.openInterest);
  positive("strike", contract.strike);
  if (!context.recalculateGreeks && contract.gamma !== undefined) {
    return nonNegative("gamma", contract.gamma);
  }

  const time = timeToExpirationYears(contract, context.valuationDate);
  if (time === 0) return 0;
  if (contract.impliedVolatility === undefined) {
    throw new RangeError("重算 Gamma 需要 impliedVolatility");
  }
  return blackScholesGamma({
    spot: context.spot,
    strike: contract.strike,
    timeToExpirationYears: time,
    volatility: contract.impliedVolatility,
    riskFreeRate: context.riskFreeRate,
    dividendYield: context.dividendYield,
  });
}

function resolveDelta(contract: OptionContract, context: ExposureContext): number {
  if (!context.recalculateGreeks && contract.delta !== undefined) {
    const delta = finite("delta", contract.delta);
    if (contract.optionType === "call" && (delta < 0 || delta > 1)) {
      throw new RangeError("Call Delta 应位于 [0, 1]");
    }
    if (contract.optionType === "put" && (delta < -1 || delta > 0)) {
      throw new RangeError("Put Delta 应位于 [-1, 0]");
    }
    return delta;
  }

  const time = timeToExpirationYears(contract, context.valuationDate);
  if (contract.impliedVolatility === undefined && time > 0) {
    throw new RangeError("重算 Delta 需要 impliedVolatility");
  }
  return blackScholesDelta({
    optionType: contract.optionType,
    spot: context.spot,
    strike: contract.strike,
    timeToExpirationYears: time,
    volatility: contract.impliedVolatility ?? 0,
    riskFreeRate: context.riskFreeRate,
    dividendYield: context.dividendYield,
  });
}

/**
 * OI GEX：Call 为正、Put 为负的展示约定。
 * 注意：这不是从公开 OI 中直接观测到的“真实做市商 Gamma”。
 */
export function calculateOiGex(
  contract: OptionContract,
  context: ExposureContext,
): number {
  const spot = positive("spot", context.spot);
  const gamma = resolveGamma(contract, context);
  const typeSign = contract.optionType === "call" ? 1 : -1;
  return (
    typeSign *
    gamma *
    nonNegative("openInterest", contract.openInterest) *
    contractMultiplier(contract, context) *
    spot *
    spot *
    ONE_PERCENT
  );
}

/** OI DEX：有符号 Delta × OI × 合约乘数 × 现货，单位为美元 Delta 名义额。 */
export function calculateOiDex(
  contract: OptionContract,
  context: ExposureContext,
): number {
  const spot = positive("spot", context.spot);
  return (
    resolveDelta(contract, context) *
    nonNegative("openInterest", contract.openInterest) *
    contractMultiplier(contract, context) *
    spot
  );
}

/** 按行权价同时聚合 GEX、DEX 与 OI，输出按 strike 升序排列。 */
export function aggregateExposuresByStrike(
  contracts: readonly OptionContract[],
  context: ExposureContext,
): StrikeExposure[] {
  const buckets = new Map<number, StrikeExposure>();

  for (const contract of contracts) {
    const strike = positive("strike", contract.strike);
    const bucket = buckets.get(strike) ?? {
      strike,
      callGex: 0,
      putGex: 0,
      netGex: 0,
      callDex: 0,
      putDex: 0,
      netDex: 0,
      callOpenInterest: 0,
      putOpenInterest: 0,
      contractCount: 0,
    };
    const gex = calculateOiGex(contract, context);
    const dex = calculateOiDex(contract, context);
    const oi = nonNegative("openInterest", contract.openInterest);

    if (contract.optionType === "call") {
      bucket.callGex += gex;
      bucket.callDex += dex;
      bucket.callOpenInterest += oi;
    } else {
      bucket.putGex += gex;
      bucket.putDex += dex;
      bucket.putOpenInterest += oi;
    }
    bucket.netGex += gex;
    bucket.netDex += dex;
    bucket.contractCount += 1;
    buckets.set(strike, bucket);
  }

  return [...buckets.values()].sort((a, b) => a.strike - b.strike);
}

/** 与 aggregateExposuresByStrike 同义，便于 GEX 图表直接引用。 */
export const aggregateGexByStrike = aggregateExposuresByStrike;

/**
 * Call/Put wall 使用各自绝对 GEX 最大的行权价。
 * “墙”仅代表暴露集中点，不保证构成支撑、阻力或价格磁铁。
 */
export function findGammaWalls(
  strikes: readonly StrikeExposure[],
): GammaWalls {
  let callWall: GammaWall | null = null;
  let putWall: GammaWall | null = null;

  for (const row of strikes) {
    if (
      row.callGex > 0 &&
      (callWall === null || row.callGex > Math.abs(callWall.gex))
    ) {
      callWall = {
        optionType: "call",
        strike: row.strike,
        gex: row.callGex,
        openInterest: row.callOpenInterest,
      };
    }
    if (
      row.putGex < 0 &&
      (putWall === null || Math.abs(row.putGex) > Math.abs(putWall.gex))
    ) {
      putWall = {
        optionType: "put",
        strike: row.strike,
        gex: row.putGex,
        openInterest: row.putOpenInterest,
      };
    }
  }

  return { callWall, putWall };
}

/** 当前 spot 下的净 OI GEX。 */
export function calculateNetOiGex(
  contracts: readonly OptionContract[],
  context: ExposureContext,
): number {
  return contracts.reduce(
    (total, contract) => total + calculateOiGex(contract, context),
    0,
  );
}

function defaultZeroGammaRange(
  contracts: readonly OptionContract[],
  referenceSpot: number,
): readonly [number, number] {
  const strikes = contracts
    .map((contract) => contract.strike)
    .filter((strike) => Number.isFinite(strike) && strike > 0);
  if (strikes.length === 0) return [referenceSpot * 0.5, referenceSpot * 1.5];
  return [
    Math.max(0.01, Math.min(referenceSpot * 0.5, Math.min(...strikes) * 0.8)),
    Math.max(referenceSpot * 1.5, Math.max(...strikes) * 1.2),
  ];
}

/**
 * 以“IV、OI 与期限不随假设 spot 改变”为前提，重算 BS Gamma 并寻找净 GEX 零点。
 * 可能存在多个零点；若无变号则返回 not-found，而不是编造翻转位。
 */
export function approximateZeroGamma(
  contracts: readonly OptionContract[],
  options: ZeroGammaOptions,
): ZeroGammaEstimate {
  const referenceSpot = positive("referenceSpot", options.referenceSpot);
  const defaults = defaultZeroGammaRange(contracts, referenceSpot);
  const lower = positive("lowerBound", options.lowerBound ?? defaults[0]);
  const upper = positive("upperBound", options.upperBound ?? defaults[1]);
  if (upper <= lower) throw new RangeError("upperBound 必须大于 lowerBound");

  const steps = Math.trunc(options.steps ?? 240);
  if (steps < 2) throw new RangeError("steps 至少为 2");
  const tolerance = positive("priceTolerance", options.priceTolerance ?? 0.01);
  const maxIterations = Math.trunc(options.maxIterations ?? 60);
  if (maxIterations < 1) throw new RangeError("maxIterations 至少为 1");

  const shared: Omit<ExposureContext, "spot"> = {
    valuationDate: options.valuationDate,
    riskFreeRate: options.riskFreeRate,
    dividendYield: options.dividendYield,
    defaultMultiplier: options.defaultMultiplier,
    recalculateGreeks: true,
  };
  const netAt = (spot: number) =>
    calculateNetOiGex(contracts, { ...shared, spot });

  const points: Array<{ spot: number; gex: number }> = [];
  let maxAbsoluteGex = 0;
  for (let index = 0; index <= steps; index += 1) {
    const spot = lower + ((upper - lower) * index) / steps;
    const gex = netAt(spot);
    maxAbsoluteGex = Math.max(maxAbsoluteGex, Math.abs(gex));
    points.push({ spot, gex });
  }

  const netGexAtReference = netAt(referenceSpot);
  if (maxAbsoluteGex === 0) {
    return {
      status: "indeterminate",
      nearestLevel: null,
      levels: [],
      netGexAtReference,
      searchRange: [lower, upper],
    };
  }

  const roots: number[] = [];
  const addRoot = (value: number) => {
    if (!roots.some((root) => Math.abs(root - value) <= tolerance * 2)) {
      roots.push(value);
    }
  };

  for (let index = 1; index < points.length; index += 1) {
    const leftPoint = points[index - 1];
    const rightPoint = points[index];
    if (leftPoint.gex === 0) addRoot(leftPoint.spot);
    if (rightPoint.gex === 0) addRoot(rightPoint.spot);
    if (Math.sign(leftPoint.gex) === Math.sign(rightPoint.gex)) continue;

    let left = leftPoint.spot;
    let right = rightPoint.spot;
    let leftGex = leftPoint.gex;
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const middle = (left + right) / 2;
      const middleGex = netAt(middle);
      if (right - left <= tolerance || middleGex === 0) {
        left = middle;
        right = middle;
        break;
      }
      if (Math.sign(leftGex) === Math.sign(middleGex)) {
        left = middle;
        leftGex = middleGex;
      } else {
        right = middle;
      }
    }
    addRoot((left + right) / 2);
  }

  roots.sort((a, b) => a - b);
  const nearestLevel =
    roots.length === 0
      ? null
      : roots.reduce((best, level) =>
          Math.abs(level - referenceSpot) < Math.abs(best - referenceSpot)
            ? level
            : best,
        );

  return {
    status: nearestLevel === null ? "not-found" : "found",
    nearestLevel,
    levels: roots,
    netGexAtReference,
    searchRange: [lower, upper],
  };
}

/**
 * Expected Move 支持 IV 标准差法与 ATM straddle 法。
 * 输出是隐含波动尺度，不是目标价，也不保证价格落在区间内。
 */
export function calculateExpectedMove(
  input: ExpectedMoveInput,
): ExpectedMoveResult {
  const spot = positive("spot", input.spot);
  let dollarMove: number;

  if (input.method === "iv") {
    const iv = nonNegative(
      "annualizedImpliedVolatility",
      input.annualizedImpliedVolatility,
    );
    const days = nonNegative("daysToExpiration", input.daysToExpiration);
    const standardDeviations = nonNegative(
      "standardDeviations",
      input.standardDeviations ?? 1,
    );
    dollarMove =
      spot * iv * Math.sqrt(days / DAYS_PER_YEAR) * standardDeviations;
  } else {
    const callPremium = nonNegative("callPremium", input.callPremium);
    const putPremium = nonNegative("putPremium", input.putPremium);
    const multiplier = nonNegative(
      "premiumMultiplier",
      input.premiumMultiplier ?? 1,
    );
    dollarMove = (callPremium + putPremium) * multiplier;
  }

  return {
    method: input.method,
    dollarMove,
    percentMove: dollarMove / spot,
    lowerBound: Math.max(0, spot - dollarMove),
    upperBound: spot + dollarMove,
  };
}

type MutableClassBreakdown = EffectiveGammaClassBreakdown;

/**
 * 计算“有效对冲 Gamma”（EHG）。
 *
 * 对一份客户持仓：
 *   客户有效 Gamma = 客户方向 × Gamma名义额 × 客户对冲权重
 *   做市商有效 Gamma = -客户方向 × Gamma名义额 × 做市商对冲权重
 * 两者再乘以分类置信度与可归因 OI 比例。
 *
 * 因而 EHG < 0 表示净短 Gamma 对冲：上涨时估计需要买入、下跌时估计需要卖出；
 * 它只描述条件性的机械放大倾向，并不预测下一步方向。
 */
export function calculateEffectiveHedgingGamma(
  contracts: readonly OptionContract[],
  config: EffectiveHedgingGammaConfig,
): EffectiveHedgingGammaResult {
  const spot = positive("spot", config.spot);
  const defaultDealerWeight = unitInterval(
    "dealerHedgeWeight",
    config.dealerHedgeWeight ?? 1,
  );
  if (config.defaultCustomerHedgeWeight !== undefined) {
    unitInterval(
      "defaultCustomerHedgeWeight",
      config.defaultCustomerHedgeWeight,
    );
  }

  const weights: Readonly<Record<string, number>> = {
    ...DEFAULT_HEDGE_PROPENSITY_WEIGHTS,
    ...config.weights,
  };
  for (const [name, weight] of Object.entries(weights)) {
    unitInterval(`weights.${name}`, weight);
  }

  let total = 0;
  let customerTotal = 0;
  let dealerTotal = 0;
  let grossTotal = 0;
  let includedContracts = 0;
  let excludedContracts = 0;
  const classMap = new Map<string, MutableClassBreakdown>();

  const exposureContext: ExposureContext = {
    spot,
    valuationDate: config.valuationDate,
    riskFreeRate: config.riskFreeRate,
    dividendYield: config.dividendYield,
    defaultMultiplier: config.defaultMultiplier,
    recalculateGreeks: config.recalculateGreeks,
  };

  for (const contract of contracts) {
    const inference = contract.hedging;
    if (inference === undefined || inference.customerSide === "unknown") {
      excludedContracts += 1;
      continue;
    }

    const className = inference.customerClass ?? "unclassified";
    const classWeight = weights[className];
    const customerWeight =
      inference.customerHedgeWeight ??
      classWeight ??
      config.defaultCustomerHedgeWeight;
    if (customerWeight === undefined) {
      excludedContracts += 1;
      continue;
    }

    unitInterval("customerHedgeWeight", customerWeight);
    const dealerWeight = unitInterval(
      "dealerHedgeWeight",
      inference.dealerHedgeWeight ?? defaultDealerWeight,
    );
    const confidence = unitInterval("confidence", inference.confidence ?? 1);
    const attributedFraction = unitInterval(
      "attributedOpenInterestFraction",
      inference.attributedOpenInterestFraction ?? 1,
    );
    const gamma = resolveGamma(contract, exposureContext);
    const grossGamma =
      gamma *
      nonNegative("openInterest", contract.openInterest) *
      contractMultiplier(contract, exposureContext) *
      spot *
      spot *
      ONE_PERCENT *
      confidence *
      attributedFraction;
    const customerSign = inference.customerSide === "long" ? 1 : -1;
    const customerContribution = customerSign * grossGamma * customerWeight;
    const dealerContribution = -customerSign * grossGamma * dealerWeight;
    const netEffectiveGamma = customerContribution + dealerContribution;

    total += netEffectiveGamma;
    customerTotal += customerContribution;
    dealerTotal += dealerContribution;
    grossTotal += grossGamma;
    includedContracts += 1;

    const row = classMap.get(className) ?? {
      customerClass: className,
      grossAttributedGamma: 0,
      customerContribution: 0,
      dealerContribution: 0,
      netEffectiveGamma: 0,
      contracts: 0,
    };
    row.grossAttributedGamma += grossGamma;
    row.customerContribution += customerContribution;
    row.dealerContribution += dealerContribution;
    row.netEffectiveGamma += netEffectiveGamma;
    row.contracts += 1;
    classMap.set(className, row);
  }

  return {
    totalEffectiveGamma: total,
    customerContribution: customerTotal,
    dealerContribution: dealerTotal,
    grossAttributedGamma: grossTotal,
    estimatedHedgeFlowOnUpOnePercent: -total,
    estimatedHedgeFlowOnDownOnePercent: total,
    includedContracts,
    excludedContracts,
    byClass: [...classMap.values()].sort(
      (a, b) => Math.abs(b.netEffectiveGamma) - Math.abs(a.netEffectiveGamma),
    ),
  };
}
