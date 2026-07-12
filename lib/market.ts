export const MARKET_API_SCHEMA_VERSION = "1.0" as const;

export type MarketFeedClass =
  | "real-time"
  | "delayed"
  | "end-of-day"
  | "mixed"
  | "unknown";

/** 兼容旧导入名；新代码应优先使用 MarketFeedClass。 */
export type DataTimeframe = MarketFeedClass;

export type AnalyticsStatus = "ready" | "degraded" | "unavailable";
export type MarketWarningSeverity = "info" | "warning" | "blocking";

export type MarketErrorCode =
  | "DATA_PROVIDER_NOT_CONFIGURED"
  | "INVALID_SYMBOL"
  | "SYMBOL_NOT_FOUND"
  | "OPTION_CHAIN_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_AUTH_FAILED"
  | "PROVIDER_RESPONSE_INVALID"
  | "PROVIDER_UNAVAILABLE"
  | "METHOD_NOT_ALLOWED"
  | "INTERNAL_ERROR";

export interface MarketWarning {
  code: string;
  severity: MarketWarningSeverity;
  message: string;
  affectedMetrics: string[];
}

export interface MarketOptionContract {
  ticker: string;
  type: "call" | "put";
  expiration: string;
  strike: number;
  multiplier: number;
  multiplierAssumed: boolean;
  openInterest: number | null;
  /** Massive 的 OI 是上一交易日收盘库存；接口未提供精确日期。 */
  oiObservedAt: string | null;
  oiBasis: "previous-trading-day-eod";
  volume: number | null;
  impliedVolatility: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  hasGreeks: boolean;
  bid: number | null;
  ask: number | null;
  quoteObservedAt: string | null;
  quoteFeedClass: MarketFeedClass;
  /** 供应商计算该合约快照时一并返回的标的输入。 */
  underlyingPrice: number | null;
  underlyingObservedAt: string | null;
  underlyingFeedClass: MarketFeedClass;
}

export interface MarketCoverage {
  contracts: number;
  expirations: number;
  withOpenInterest: number;
  missingOpenInterest: number;
  withCompleteGreeks: number;
  missingGreeks: number;
  withTwoSidedQuotes: number;
  missingQuotes: number;
  quoteCoveragePercent: number;
  greeksCoveragePercent: number;
}

export interface MarketReadyResponse {
  schemaVersion: typeof MARKET_API_SCHEMA_VERSION;
  status: "ready";
  requestId: string;
  requestedSymbol: string;
  symbol: string;
  name: string;
  currency: "USD";
  source: {
    provider: "Massive";
    endpoint: "option-chain-snapshot";
    providerRequestIds: string[];
  };
  feedClass: MarketFeedClass;
  /** 主标的价格的观测时间；未知时必须保持 null，不能用抓取时间代替。 */
  observedAt: string | null;
  requestStartedAt: string;
  fetchedAt: string;
  refreshSeconds: number;
  marketState: "open" | "closed" | "extended" | "unknown";
  marketStateEstimated: true;
  spot: number;
  change: number | null;
  changePercent: number | null;
  underlying: {
    price: number;
    source: "stock-last-trade" | "stock-minute-close" | "stock-day-close" | "chain-underlying";
    feedClass: MarketFeedClass;
    observedAt: string | null;
  };
  observations: {
    options: {
      source: "Massive option-chain snapshot";
      feedClass: MarketFeedClass;
      /** 这是链中最新一笔报价时间；完整分布见 chain.quoteWindow。 */
      observedAt: string | null;
    };
    openInterest: {
      source: "Massive open_interest";
      basis: "previous-trading-day-eod";
      observedAt: string | null;
      exactDateKnown: false;
    };
  };
  chain: {
    complete: boolean;
    analyticsStatus: AnalyticsStatus;
    requestedScope: {
      expirationFrom: string;
      expirationTo: string;
      strikeFrom: number;
      strikeTo: number;
    };
    returnedScope: {
      expirationFrom: string | null;
      expirationTo: string | null;
      strikeFrom: number | null;
      strikeTo: number | null;
    };
    pagination: {
      pagesFetched: number;
      pageSize: number;
      maxPages: number;
      hasMore: boolean;
    };
    quoteWindow: {
      oldestObservedAt: string | null;
      medianObservedAt: string | null;
      newestObservedAt: string | null;
    };
    coverage: MarketCoverage;
  };
  synchronization: {
    mixedObservationTimes: true;
    underlyingToNewestQuoteMs: number | null;
    maxChainUnderlyingDeviationBps: number | null;
  };
  analyticsStatus: AnalyticsStatus;
  contracts: MarketOptionContract[];
  warnings: MarketWarning[];
  hasBlockingWarnings: boolean;
}

/** UI 迁移时可继续把 ready 分支称为 MarketPayload。 */
export type MarketPayload = MarketReadyResponse;

export interface MarketUnconfiguredResponse {
  schemaVersion: typeof MARKET_API_SCHEMA_VERSION;
  status: "unconfigured";
  requestId: string;
  requestedSymbol: string;
  respondedAt: string;
  source: { provider: "Massive" };
  error: {
    code: "DATA_PROVIDER_NOT_CONFIGURED";
    message: string;
    retryable: false;
  };
}

export interface MarketErrorResponse {
  schemaVersion: typeof MARKET_API_SCHEMA_VERSION;
  status: "error";
  requestId: string;
  requestedSymbol: string;
  respondedAt: string;
  source: { provider: "Massive" };
  error: {
    code: Exclude<MarketErrorCode, "DATA_PROVIDER_NOT_CONFIGURED">;
    message: string;
    retryable: boolean;
  };
}

export type MarketApiResponse =
  | MarketReadyResponse
  | MarketUnconfiguredResponse
  | MarketErrorResponse;

interface MassiveSnapshot {
  details?: {
    contract_type?: "call" | "put";
    expiration_date?: string;
    shares_per_contract?: number;
    strike_price?: number;
    ticker?: string;
  };
  day?: { volume?: number };
  greeks?: { delta?: number; gamma?: number; theta?: number; vega?: number };
  implied_volatility?: number;
  last_quote?: {
    ask?: number;
    bid?: number;
    last_updated?: number;
    timeframe?: string;
  };
  open_interest?: number;
  underlying_asset?: {
    last_updated?: number;
    price?: number;
    /** Index snapshots (for example I:SPX) may expose `value` instead of `price`. */
    value?: number;
    timeframe?: string;
  };
}

interface MassiveChainResponse {
  request_id?: string;
  results?: MassiveSnapshot[];
  next_url?: string;
  status?: string;
  error?: string;
  message?: string;
}

interface MassiveStockResponse {
  request_id?: string;
  ticker?: {
    day?: { c?: number };
    lastTrade?: { p?: number; t?: number };
    min?: { c?: number; t?: number };
    prevDay?: { c?: number };
    todaysChange?: number;
    todaysChangePerc?: number;
    updated?: number;
  };
  status?: string;
  error?: string;
  message?: string;
}

interface UnderlyingObservation {
  price: number;
  source: MarketReadyResponse["underlying"]["source"];
  feedClass: MarketFeedClass;
  observedAt: string | null;
}

const COMPANY_NAMES: Record<string, string> = {
  MU: "Micron Technology",
  TSM: "Taiwan Semiconductor",
  NVDA: "NVIDIA",
  AMD: "Advanced Micro Devices",
  AAPL: "Apple",
  MSFT: "Microsoft",
  TSLA: "Tesla",
  SPY: "SPDR S&P 500 ETF",
  QQQ: "Invesco QQQ Trust",
  SPX: "S&P 500 Index",
};

const PROVIDER_SYMBOLS: Readonly<Record<string, string>> = {
  SPX: "I:SPX",
};

const DAY_MS = 86_400_000;
const PAGE_SIZE = 250;
const MAX_PAGES = 12;
const DEFAULT_TIMEOUT_MS = 12_000;

class MarketDataError extends Error {
  constructor(
    readonly code: Exclude<MarketErrorCode, "DATA_PROVIDER_NOT_CONFIGURED" | "METHOD_NOT_ALLOWED">,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `market-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createMarketErrorResponse(
  requestedSymbol: string,
  code: Exclude<MarketErrorCode, "DATA_PROVIDER_NOT_CONFIGURED">,
  message: string,
  retryable: boolean,
  requestId = createRequestId(),
): MarketErrorResponse {
  return {
    schemaVersion: MARKET_API_SCHEMA_VERSION,
    status: "error",
    requestId,
    requestedSymbol,
    respondedAt: new Date().toISOString(),
    source: { provider: "Massive" },
    error: { code, message, retryable },
  };
}

function createUnconfiguredResponse(
  requestedSymbol: string,
  requestId: string,
): MarketUnconfiguredResponse {
  return {
    schemaVersion: MARKET_API_SCHEMA_VERSION,
    status: "unconfigured",
    requestId,
    requestedSymbol,
    respondedAt: new Date().toISOString(),
    source: { provider: "Massive" },
    error: {
      code: "DATA_PROVIDER_NOT_CONFIGURED",
      message: "市场数据服务尚未配置，无法返回真实行情。",
      retryable: false,
    },
  };
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(number) ? number : null;
}

function positiveNumber(value: unknown): number | null {
  const number = finiteNumber(value);
  return number !== null && number > 0 ? number : null;
}

/** Massive 快照使用纳秒或毫秒时间戳；未知单位保持 null。 */
function isoFromEpoch(value?: number) {
  if (!value || !Number.isFinite(value)) return null;
  let milliseconds: number;
  if (value >= 1e17) milliseconds = value / 1e6;
  else if (value >= 1e11 && value < 1e14) milliseconds = value;
  else return null;
  const date = new Date(milliseconds);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  return new Date(date.valueOf() + days * DAY_MS);
}

function marketState(now: Date): MarketReadyResponse["marketState"] {
  const eastern = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    eastern.find((item) => item.type === type)?.value ?? "";
  const weekday = part("weekday");
  if (weekday === "Sat" || weekday === "Sun") return "closed";
  const minutes = Number(part("hour")) * 60 + Number(part("minute"));
  if (!Number.isFinite(minutes)) return "unknown";
  if (minutes >= 570 && minutes < 960) return "open";
  if (minutes >= 240 && minutes < 1200) return "extended";
  return "closed";
}

function normalizeFeedLabel(value?: string): MarketFeedClass {
  const label = value?.trim().toUpperCase();
  if (!label) return "unknown";
  if (label === "REAL-TIME" || label === "REALTIME") return "real-time";
  if (label === "DELAYED") return "delayed";
  if (label === "END-OF-DAY" || label === "EOD") return "end-of-day";
  return "unknown";
}

function combineFeedClasses(values: readonly MarketFeedClass[]): MarketFeedClass {
  const unique = new Set<MarketFeedClass>(values.length ? values : ["unknown"]);
  return unique.size === 1 ? [...unique][0] : "mixed";
}

function authHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };
}

async function checkedJson<T>(
  url: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { headers: authHeaders(apiKey), signal });
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      throw new MarketDataError("PROVIDER_TIMEOUT", "Massive API 请求超时。", true);
    }
    throw new MarketDataError(
      "PROVIDER_UNAVAILABLE",
      error instanceof Error ? `Massive API 不可用：${error.message}` : "Massive API 不可用。",
      true,
    );
  }

  let payload: T & { error?: string; message?: string; status?: string };
  try {
    payload = (await response.json()) as T & {
      error?: string;
      message?: string;
      status?: string;
    };
  } catch {
    throw new MarketDataError(
      "PROVIDER_RESPONSE_INVALID",
      "Massive API 返回了无法解析的响应。",
      true,
    );
  }

  if (!response.ok) {
    const detail = payload.message || payload.error || `HTTP ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      throw new MarketDataError("PROVIDER_AUTH_FAILED", `Massive API 授权失败：${detail}`, false);
    }
    if (response.status === 404) {
      throw new MarketDataError("SYMBOL_NOT_FOUND", `未找到标的：${detail}`, false);
    }
    throw new MarketDataError("PROVIDER_UNAVAILABLE", `Massive API：${detail}`, response.status >= 500);
  }
  if (payload.status && !["OK", "SUCCESS"].includes(payload.status.toUpperCase())) {
    throw new MarketDataError(
      "PROVIDER_RESPONSE_INVALID",
      `Massive API 返回异常状态：${payload.status}`,
      true,
    );
  }
  return payload;
}

function normalizeContract(item: MassiveSnapshot): MarketOptionContract | null {
  const details = item.details;
  const strike = finiteNumber(details?.strike_price);
  if (
    !details?.ticker ||
    !details.expiration_date ||
    !details.contract_type ||
    strike === null
  ) {
    return null;
  }
  const delta = finiteNumber(item.greeks?.delta);
  const gamma = finiteNumber(item.greeks?.gamma);
  const impliedVolatility = finiteNumber(item.implied_volatility);
  const multiplier = positiveNumber(details.shares_per_contract);
  return {
    ticker: details.ticker,
    type: details.contract_type,
    expiration: details.expiration_date,
    strike,
    multiplier: multiplier ?? 100,
    multiplierAssumed: multiplier === null,
    openInterest: finiteNumber(item.open_interest),
    oiObservedAt: null,
    oiBasis: "previous-trading-day-eod",
    volume: finiteNumber(item.day?.volume),
    impliedVolatility,
    delta,
    gamma,
    theta: finiteNumber(item.greeks?.theta),
    vega: finiteNumber(item.greeks?.vega),
    hasGreeks: delta !== null && gamma !== null && impliedVolatility !== null,
    bid: finiteNumber(item.last_quote?.bid),
    ask: finiteNumber(item.last_quote?.ask),
    quoteObservedAt: isoFromEpoch(item.last_quote?.last_updated),
    quoteFeedClass: normalizeFeedLabel(item.last_quote?.timeframe),
    underlyingPrice: positiveNumber(item.underlying_asset?.price ?? item.underlying_asset?.value),
    underlyingObservedAt: isoFromEpoch(item.underlying_asset?.last_updated),
    underlyingFeedClass: normalizeFeedLabel(item.underlying_asset?.timeframe),
  };
}

function chooseStockObservation(
  ticker: MassiveStockResponse["ticker"],
): UnderlyingObservation | null {
  const lastTrade = positiveNumber(ticker?.lastTrade?.p);
  if (lastTrade !== null) {
    return {
      price: lastTrade,
      source: "stock-last-trade",
      feedClass: "unknown",
      observedAt: isoFromEpoch(ticker?.lastTrade?.t ?? ticker?.updated),
    };
  }
  const minute = positiveNumber(ticker?.min?.c);
  if (minute !== null) {
    return {
      price: minute,
      source: "stock-minute-close",
      feedClass: "unknown",
      observedAt: isoFromEpoch(ticker?.min?.t ?? ticker?.updated),
    };
  }
  const day = positiveNumber(ticker?.day?.c);
  if (day !== null) {
    return {
      price: day,
      source: "stock-day-close",
      feedClass: "end-of-day",
      observedAt: null,
    };
  }
  return null;
}

function chainUnderlyingObservation(snapshot?: MassiveSnapshot): UnderlyingObservation | null {
  const price = positiveNumber(snapshot?.underlying_asset?.price ?? snapshot?.underlying_asset?.value);
  if (price === null) return null;
  return {
    price,
    source: "chain-underlying",
    feedClass: normalizeFeedLabel(snapshot?.underlying_asset?.timeframe),
    observedAt: isoFromEpoch(snapshot?.underlying_asset?.last_updated),
  };
}

function sortedIsoWindow(values: Array<string | null>) {
  const epochs = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).valueOf())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (!epochs.length) {
    return {
      oldestObservedAt: null,
      medianObservedAt: null,
      newestObservedAt: null,
    };
  }
  const middle = epochs[Math.floor((epochs.length - 1) / 2)];
  return {
    oldestObservedAt: new Date(epochs[0]).toISOString(),
    medianObservedAt: new Date(middle).toISOString(),
    newestObservedAt: new Date(epochs[epochs.length - 1]).toISOString(),
  };
}

function timeDifferenceMs(left: string | null, right: string | null) {
  if (!left || !right) return null;
  const difference = Math.abs(new Date(left).valueOf() - new Date(right).valueOf());
  return Number.isFinite(difference) ? difference : null;
}

function returnedScope(contracts: readonly MarketOptionContract[]) {
  if (!contracts.length) {
    return {
      expirationFrom: null,
      expirationTo: null,
      strikeFrom: null,
      strikeTo: null,
    };
  }
  const expirations = contracts.map((contract) => contract.expiration).sort();
  const strikes = contracts.map((contract) => contract.strike);
  return {
    expirationFrom: expirations[0],
    expirationTo: expirations[expirations.length - 1],
    strikeFrom: Math.min(...strikes),
    strikeTo: Math.max(...strikes),
  };
}

function makeCoverage(contracts: readonly MarketOptionContract[]): MarketCoverage {
  const withOpenInterest = contracts.filter((contract) => contract.openInterest !== null).length;
  const withCompleteGreeks = contracts.filter((contract) => contract.hasGreeks).length;
  const withTwoSidedQuotes = contracts.filter(
    (contract) => contract.bid !== null && contract.ask !== null,
  ).length;
  const count = contracts.length;
  return {
    contracts: count,
    expirations: new Set(contracts.map((contract) => contract.expiration)).size,
    withOpenInterest,
    missingOpenInterest: count - withOpenInterest,
    withCompleteGreeks,
    missingGreeks: count - withCompleteGreeks,
    withTwoSidedQuotes,
    missingQuotes: count - withTwoSidedQuotes,
    quoteCoveragePercent: count ? (withTwoSidedQuotes / count) * 100 : 0,
    greeksCoveragePercent: count ? (withCompleteGreeks / count) * 100 : 0,
  };
}

function maximumChainPriceDeviationBps(
  spot: number,
  contracts: readonly MarketOptionContract[],
) {
  const prices = contracts
    .map((contract) => contract.underlyingPrice)
    .filter((price): price is number => price !== null);
  if (!prices.length) return null;
  return Math.max(...prices.map((price) => Math.abs(price - spot) / spot)) * 10_000;
}

export interface FetchMarketOptions {
  timeoutMs?: number;
}

export async function fetchMassivePayload(
  symbol: string,
  apiKey: string,
  options: FetchMarketOptions = {},
  requestId = createRequestId(),
): Promise<MarketReadyResponse> {
  const normalized = symbol.toUpperCase();
  const providerSymbol = PROVIDER_SYMBOLS[normalized] ?? normalized;
  const isIndex = providerSymbol.startsWith("I:");
  const started = new Date();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const signal = AbortSignal.timeout(timeoutMs);
  const providerRequestIds: string[] = [];
  const stockUrl = `https://api.massive.com/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(
    normalized,
  )}`;
  let ticker: MassiveStockResponse["ticker"] | undefined;
  let stockWarning = "";
  if (!isIndex) {
    try {
      const stock = await checkedJson<MassiveStockResponse>(stockUrl, apiKey, signal);
      ticker = stock.ticker;
      if (stock.request_id) providerRequestIds.push(stock.request_id);
    } catch (error) {
      if (error instanceof MarketDataError && error.code === "PROVIDER_TIMEOUT") throw error;
      stockWarning = error instanceof Error ? error.message : "股票行情接口不可用";
    }
  }

  let underlying = chooseStockObservation(ticker);
  if (!underlying) {
    const seedUrl = new URL(
      `https://api.massive.com/v3/snapshot/options/${encodeURIComponent(providerSymbol)}`,
    );
    seedUrl.searchParams.set("expiration_date.gte", dateOnly(started));
    seedUrl.searchParams.set("limit", "1");
    const seed = await checkedJson<MassiveChainResponse>(seedUrl.toString(), apiKey, signal);
    if (seed.request_id) providerRequestIds.push(seed.request_id);
    underlying = chainUnderlyingObservation(seed.results?.[0]);
  }
  if (!underlying) {
    throw new MarketDataError(
      ticker ? "OPTION_CHAIN_UNAVAILABLE" : "SYMBOL_NOT_FOUND",
      ticker ? "Massive API 未返回可用标的价格。" : `未找到标的 ${normalized}。`,
      false,
    );
  }

  const expirationFrom = dateOnly(started);
  const expirationTo = dateOnly(addDays(started, 60));
  const strikeFrom = Number((underlying.price * 0.72).toFixed(2));
  const strikeTo = Number((underlying.price * 1.28).toFixed(2));
  const query = new URLSearchParams({
    "expiration_date.gte": expirationFrom,
    "expiration_date.lte": expirationTo,
    "strike_price.gte": strikeFrom.toFixed(2),
    "strike_price.lte": strikeTo.toFixed(2),
    limit: String(PAGE_SIZE),
    sort: "expiration_date",
    order: "asc",
  });
  let nextUrl: string | null = `https://api.massive.com/v3/snapshot/options/${encodeURIComponent(
    providerSymbol,
  )}?${query.toString()}`;
  const snapshots: MassiveSnapshot[] = [];
  let pagesFetched = 0;

  for (; nextUrl && pagesFetched < MAX_PAGES; pagesFetched += 1) {
    const chain: MassiveChainResponse = await checkedJson<MassiveChainResponse>(
      nextUrl,
      apiKey,
      signal,
    );
    if (chain.request_id) providerRequestIds.push(chain.request_id);
    snapshots.push(...(chain.results ?? []));
    nextUrl = chain.next_url ?? null;
  }

  const contracts = snapshots
    .map(normalizeContract)
    .filter((contract): contract is MarketOptionContract => contract !== null);
  if (!contracts.length) {
    throw new MarketDataError(
      "OPTION_CHAIN_UNAVAILABLE",
      `${normalized} 没有返回可用的期权链。`,
      false,
    );
  }

  const complete = nextUrl === null;
  const quoteWindow = sortedIsoWindow(
    contracts.map((contract) => contract.quoteObservedAt),
  );
  const optionFeedClass = combineFeedClasses(
    contracts.map((contract) => contract.quoteFeedClass),
  );
  const feedClass = combineFeedClasses([underlying.feedClass, optionFeedClass]);
  const coverage = makeCoverage(contracts);
  const maxDeviationBps = maximumChainPriceDeviationBps(underlying.price, contracts);
  const warnings: MarketWarning[] = [
    {
      code: "MIXED_OI_AND_QUOTES",
      severity: "info",
      message: "OI 来自上一交易日收盘；盘中报价、IV 与 OI 不是同一时间截面。",
      affectedMetrics: ["netGex", "dex", "walls", "zeroGamma"],
    },
  ];

  if (stockWarning) {
    warnings.push({
      code: "UNDERLYING_FROM_OPTION_CHAIN",
      severity: "warning",
      message: `股票行情接口不可用（${stockWarning}）；标的价格来自期权链 underlying_asset。`,
      affectedMetrics: ["spot", "netGex", "dex", "zeroGamma"],
    });
  }
  if (!complete) {
    warnings.push({
      code: "CHAIN_TRUNCATED",
      severity: "blocking",
      message: `达到 ${MAX_PAGES * PAGE_SIZE} 条抓取上限后仍有下一页；当前链不完整，禁止计算全局 Gamma 指标。`,
      affectedMetrics: ["netGex", "dex", "walls", "zeroGamma", "expectedMove"],
    });
  }
  if (underlying.observedAt === null) {
    warnings.push({
      code: "UNDERLYING_OBSERVED_AT_UNKNOWN",
      severity: "blocking",
      message: "标的价格缺少可验证的观测时间，不能判断数据新鲜度。",
      affectedMetrics: ["spot", "netGex", "dex", "zeroGamma"],
    });
  }
  if (quoteWindow.newestObservedAt === null) {
    warnings.push({
      code: "OPTION_QUOTE_TIME_UNKNOWN",
      severity: "warning",
      message: "期权报价缺少可验证的观测时间。",
      affectedMetrics: ["expectedMove", "liquidity"],
    });
  }
  if (coverage.missingGreeks > 0) {
    warnings.push({
      code: "GREEKS_INCOMPLETE",
      severity: coverage.withCompleteGreeks === 0 ? "blocking" : "warning",
      message: `${coverage.missingGreeks} 个合约缺少完整 Delta/Gamma/IV；缺失值保持 null。`,
      affectedMetrics: ["netGex", "dex", "walls", "zeroGamma", "expectedMove"],
    });
  }
  if (coverage.missingOpenInterest > 0) {
    warnings.push({
      code: "OPEN_INTEREST_INCOMPLETE",
      severity: coverage.withOpenInterest === 0 ? "blocking" : "warning",
      message: `${coverage.missingOpenInterest} 个合约缺少 OI；缺失值不会按 0 处理。`,
      affectedMetrics: ["netGex", "dex", "walls", "zeroGamma"],
    });
  }
  if (maxDeviationBps !== null && maxDeviationBps > 100) {
    warnings.push({
      code: "UNDERLYING_PRICE_MISMATCH",
      severity: "blocking",
      message: `股票 spot 与链内 underlying 最大偏差为 ${maxDeviationBps.toFixed(0)} bps。`,
      affectedMetrics: ["netGex", "dex", "zeroGamma"],
    });
  }
  if (feedClass === "mixed" || feedClass === "unknown") {
    warnings.push({
      code: "FEED_CLASS_MIXED_OR_UNKNOWN",
      severity: "warning",
      message: "标的与期权链的 feedClass 不一致或未知。",
      affectedMetrics: ["freshness"],
    });
  }

  const hasBlockingWarnings = warnings.some((warning) => warning.severity === "blocking");
  const analyticsStatus: AnalyticsStatus = hasBlockingWarnings
    ? "unavailable"
    : warnings.some((warning) => warning.severity === "warning")
      ? "degraded"
      : "ready";
  const fetchedAt = new Date().toISOString();
  const change = finiteNumber(ticker?.todaysChange);
  const previousClose = positiveNumber(ticker?.prevDay?.c);
  const calculatedChange = previousClose === null ? null : underlying.price - previousClose;
  const changeValue = change ?? calculatedChange;
  const providedChangePercent = finiteNumber(ticker?.todaysChangePerc);
  const changePercent =
    providedChangePercent ??
    (previousClose !== null && changeValue !== null
      ? (changeValue / previousClose) * 100
      : null);

  return {
    schemaVersion: MARKET_API_SCHEMA_VERSION,
    status: "ready",
    requestId,
    requestedSymbol: symbol,
    symbol: normalized,
    name: COMPANY_NAMES[normalized] ?? `${normalized} equity`,
    currency: "USD",
    source: {
      provider: "Massive",
      endpoint: "option-chain-snapshot",
      providerRequestIds,
    },
    feedClass,
    observedAt: underlying.observedAt,
    requestStartedAt: started.toISOString(),
    fetchedAt,
    refreshSeconds: 15,
    marketState: marketState(new Date()),
    marketStateEstimated: true,
    spot: underlying.price,
    change: changeValue,
    changePercent,
    underlying,
    observations: {
      options: {
        source: "Massive option-chain snapshot",
        feedClass: optionFeedClass,
        observedAt: quoteWindow.newestObservedAt,
      },
      openInterest: {
        source: "Massive open_interest",
        basis: "previous-trading-day-eod",
        observedAt: null,
        exactDateKnown: false,
      },
    },
    chain: {
      complete,
      analyticsStatus,
      requestedScope: {
        expirationFrom,
        expirationTo,
        strikeFrom,
        strikeTo,
      },
      returnedScope: returnedScope(contracts),
      pagination: {
        pagesFetched,
        pageSize: PAGE_SIZE,
        maxPages: MAX_PAGES,
        hasMore: !complete,
      },
      quoteWindow,
      coverage,
    },
    synchronization: {
      mixedObservationTimes: true,
      underlyingToNewestQuoteMs: timeDifferenceMs(
        underlying.observedAt,
        quoteWindow.newestObservedAt,
      ),
      maxChainUnderlyingDeviationBps: maxDeviationBps,
    },
    analyticsStatus,
    contracts,
    warnings,
    hasBlockingWarnings,
  };
}

export async function getMarketPayload(
  symbol: string,
  apiKey?: string,
  options: FetchMarketOptions = {},
): Promise<MarketApiResponse> {
  const requestId = createRequestId();
  const requestedSymbol = symbol.trim();
  const normalized = requestedSymbol.toUpperCase();
  if (!/^[A-Z][A-Z0-9.-]{0,7}$/.test(normalized)) {
    return createMarketErrorResponse(
      requestedSymbol,
      "INVALID_SYMBOL",
      "请输入有效的美股代码（1–8 位字母、数字、点或短横线）。",
      false,
      requestId,
    );
  }
  if (!apiKey) return createUnconfiguredResponse(normalized, requestId);

  try {
    return await fetchMassivePayload(normalized, apiKey, options, requestId);
  } catch (error) {
    if (error instanceof MarketDataError) {
      return createMarketErrorResponse(
        normalized,
        error.code,
        error.message,
        error.retryable,
        requestId,
      );
    }
    return createMarketErrorResponse(
      normalized,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "市场数据处理失败。",
      false,
      requestId,
    );
  }
}
