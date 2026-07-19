"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  MarketApiResponse,
  MarketOptionContract,
  MarketReadyResponse,
} from "@/lib/market";
import { SpxStructureTerminal } from "@/app/SpxStructureTerminal";
import {
  CATEGORY_LABELS,
  MODULES,
  findModule,
  type ModuleCategory,
  type QuantModule,
} from "@/lib/modules";

type ExposureRow = {
  strike: number;
  callGex: number;
  putGex: number;
  netGex: number;
  netDex: number;
  callOi: number;
  putOi: number;
};

type DerivedAnalytics = {
  available: boolean;
  rows: ExposureRow[];
  netGex: number | null;
  netDex: number | null;
  callWall: number | null;
  putWall: number | null;
  atmIv: number | null;
  nearestExpiry: string | null;
  expectedMove: number | null;
  usableContracts: number;
};

const WATCHLIST = ["SPX", "SPY", "QQQ", "NVDA", "TSM", "MU", "AMD", "AAPL", "MSFT", "TSLA", "META", "AMZN"];
const categories: ModuleCategory[] = ["daily", "spx", "quant", "research"];

const compact = new Intl.NumberFormat("zh-CN", {
  notation: "compact",
  maximumFractionDigits: 2,
});

const precise = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 8);
}

function symbolFromPath(pathname: string) {
  const match = pathname.match(/^\/(?:ticker|effective-gamma)\/([^/?#]+)/i);
  return normalizeSymbol(match?.[1] ?? "");
}

function feedLabel(value: MarketReadyResponse["feedClass"]) {
  const labels = {
    "real-time": "实时",
    delayed: "延迟",
    "end-of-day": "收盘",
    mixed: "混合时点",
    unknown: "时效未知",
  } as const;
  return labels[value];
}

function errorMessage(response: Exclude<MarketApiResponse, MarketReadyResponse>) {
  const messages: Record<string, string> = {
    DATA_PROVIDER_NOT_CONFIGURED: "服务器尚未配置行情授权。为避免误导，所有合成价格和合成期权链均已停用。",
    INVALID_SYMBOL: "标的代码格式无效。",
    SYMBOL_NOT_FOUND: "数据源没有找到这个标的。",
    OPTION_CHAIN_UNAVAILABLE: "数据源没有返回可用的期权链。",
    PROVIDER_TIMEOUT: "行情服务响应超时，请稍后重试。",
    PROVIDER_AUTH_FAILED: "行情授权无效或套餐权限不足。",
    PROVIDER_UNAVAILABLE: "行情服务暂时不可用。",
    PROVIDER_RESPONSE_INVALID: "行情服务返回了无法验证的数据结构。",
  };
  return messages[response.error.code] ?? response.error.message;
}

function asEt(value: string | null) {
  if (!value) return "未知";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "未知";
  return `${new Intl.DateTimeFormat("zh-CN", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date)} ET`;
}

function usd(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `$${precise.format(Number(value.toFixed(digits)))}`;
}

function exposure(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}$${compact.format(Math.abs(value))}`;
}

function pct(value: number | null, fraction = false) {
  if (value === null || !Number.isFinite(value)) return "—";
  const normalized = fraction ? value * 100 : value;
  return `${normalized.toFixed(1)}%`;
}

function daysTo(expiration: string, observedAt: string) {
  const end = new Date(`${expiration}T20:00:00Z`).valueOf();
  const start = new Date(observedAt).valueOf();
  return Math.max(0, (end - start) / 86_400_000);
}

function deriveAnalytics(data: MarketReadyResponse): DerivedAnalytics {
  if (
    data.analyticsStatus === "unavailable" ||
    !data.chain.complete ||
    data.chain.coverage.missingGreeks > 0 ||
    data.chain.coverage.missingOpenInterest > 0
  ) {
    return {
      available: false,
      rows: [],
      netGex: null,
      netDex: null,
      callWall: null,
      putWall: null,
      atmIv: null,
      nearestExpiry: null,
      expectedMove: null,
      usableContracts: 0,
    };
  }

  const buckets = new Map<number, ExposureRow>();
  let usableContracts = 0;
  for (const contract of data.contracts) {
    const oi = contract.openInterest;
    const gamma = contract.gamma;
    const delta = contract.delta;
    if (oi === null || gamma === null || delta === null || oi < 0 || gamma < 0) continue;
    const multiplier = contract.multiplier;
    const sign = contract.type === "call" ? 1 : -1;
    const gex = sign * gamma * oi * multiplier * data.spot * data.spot * 0.01;
    const dex = delta * oi * multiplier * data.spot;
    const row = buckets.get(contract.strike) ?? {
      strike: contract.strike,
      callGex: 0,
      putGex: 0,
      netGex: 0,
      netDex: 0,
      callOi: 0,
      putOi: 0,
    };
    if (contract.type === "call") {
      row.callGex += gex;
      row.callOi += oi;
    } else {
      row.putGex += gex;
      row.putOi += oi;
    }
    row.netGex += gex;
    row.netDex += dex;
    buckets.set(contract.strike, row);
    usableContracts += 1;
  }

  const rows = [...buckets.values()].sort((a, b) => a.strike - b.strike);
  const callRows = rows.filter((row) => row.callGex > 0);
  const putRows = rows.filter((row) => row.putGex < 0);
  const callWall = callRows.length
    ? callRows.reduce((best, row) => (row.callGex > best.callGex ? row : best)).strike
    : null;
  const putWall = putRows.length
    ? putRows.reduce((best, row) => (Math.abs(row.putGex) > Math.abs(best.putGex) ? row : best)).strike
    : null;
  const expirations = [...new Set(data.contracts.map((item) => item.expiration))].sort();
  const nearestExpiry = expirations[0] ?? null;
  const nearest = data.contracts
    .filter((item) => item.expiration === nearestExpiry && item.impliedVolatility !== null)
    .sort((a, b) => Math.abs(a.strike - data.spot) - Math.abs(b.strike - data.spot))
    .slice(0, 2);
  const atmIv = nearest.length
    ? nearest.reduce((sum, item) => sum + (item.impliedVolatility ?? 0), 0) / nearest.length
    : null;
  const dte = nearestExpiry ? daysTo(nearestExpiry, data.observedAt ?? data.fetchedAt) : 0;
  const expectedMove = atmIv !== null && dte > 0
    ? data.spot * atmIv * Math.sqrt(dte / 365.25)
    : null;

  return {
    available: rows.length > 0,
    rows,
    netGex: rows.reduce((sum, row) => sum + row.netGex, 0),
    netDex: rows.reduce((sum, row) => sum + row.netDex, 0),
    callWall,
    putWall,
    atmIv,
    nearestExpiry,
    expectedMove,
    usableContracts,
  };
}

function ModuleDirectory({
  data,
  navigate,
}: {
  data: MarketApiResponse | null;
  navigate: (href: string) => void;
}) {
  return (
    <>
      <section className="landing-hero">
        <div>
          <p className="kicker">OPEN OPTIONS RESEARCH TERMINAL</p>
          <h1>先验证数据，<br />再解释结构。</h1>
          <p className="hero-copy">
            22 个研究模块，一个公开入口。GammaLens 不复制第三方私有算法；每个数字都附带来源、
            观测时间、覆盖率和可计算条件。
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => navigate("/ticker/MU")}>打开标的工作台</button>
            <button className="quiet" onClick={() => navigate("/effective-gamma")}>理解有效 Gamma</button>
          </div>
        </div>
        <div className="integrity-card">
          <div className="card-label">DATA INTEGRITY GATE</div>
          <strong>{data?.status === "ready" ? "数据源已连接" : "真实数据未连接"}</strong>
          <p>
            {data?.status === "ready"
              ? `${data.source.provider} · ${feedLabel(data.feedClass)} · ${data.chain.coverage.contracts} 份合约`
              : "合成价格、虚构 OI 和伪实时戳已全部禁用。"}
          </p>
          <div className="gate-rows">
            <span><i className={data?.status === "ready" ? "ok" : "stop"} />行情授权</span>
            <span><i className="ok" />无登录墙</span>
            <span><i className="ok" />公式可审计</span>
            <span><i className="ok" />缺失值不回填</span>
          </div>
        </div>
      </section>

      <section className="directory-section">
        <div className="section-title-row">
          <div>
            <p className="kicker">FULL MODULE DIRECTORY</p>
            <h2>22 个页面已纳入同一信息架构</h2>
          </div>
          <span className="count-badge">{MODULES.length} MODULES</span>
        </div>
        {categories.map((category) => (
          <div className="directory-group" key={category}>
            <h3>{CATEGORY_LABELS[category]}</h3>
            <div className="module-grid">
              {MODULES.filter((item) => item.category === category).map((item, index) => (
                <button className="module-card" key={item.id} onClick={() => navigate(item.href)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.name}</strong>
                  <small>{item.english}</small>
                  <p>{item.summary}</p>
                  <b>打开模块 →</b>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="method-strip">
        <article><span>01</span><strong>来源</strong><p>价格、报价、Greeks 与 OI 分开标注。</p></article>
        <article><span>02</span><strong>时点</strong><p>观测时间与抓取时间绝不混用。</p></article>
        <article><span>03</span><strong>覆盖</strong><p>链被截断时，全局指标直接停算。</p></article>
        <article><span>04</span><strong>解释</strong><p>结构指标不是方向预测或投资建议。</p></article>
      </section>
    </>
  );
}

function DataGate({ data, loading, onRefresh }: {
  data: MarketApiResponse | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading && !data) {
    return <section className="data-gate loading"><span className="spinner" />正在核验数据源…</section>;
  }
  if (!data || data.status !== "ready") {
    return (
      <section className="data-gate blocked">
        <div className="gate-icon">!</div>
        <div>
          <span className="gate-state">BLOCKED · NO FABRICATED FALLBACK</span>
          <h3>当前没有可验证的市场快照</h3>
          <p>{data ? errorMessage(data) : "尚未请求行情。"}</p>
        </div>
        <button className="outline" onClick={onRefresh} disabled={loading}>{loading ? "重试中" : "重新检查"}</button>
      </section>
    );
  }

  const hasBlock = data.hasBlockingWarnings || data.analyticsStatus === "unavailable";
  return (
    <section className={`data-gate ${hasBlock ? "degraded" : "ready"}`}>
      <div className="gate-icon">{hasBlock ? "!" : "✓"}</div>
      <div>
        <span className="gate-state">{hasBlock ? "DATA AVAILABLE · ANALYTICS BLOCKED" : "VERIFIED SNAPSHOT"}</span>
        <h3>{data.source.provider} · {feedLabel(data.feedClass)} · {data.symbol}</h3>
        <p>
          Spot {asEt(data.underlying.observedAt)} · 链最新 {asEt(data.observations.options.observedAt)} ·
          OI 为上一交易日收盘批次
        </p>
      </div>
      <button className="outline" onClick={onRefresh} disabled={loading}>{loading ? "刷新中" : "刷新"}</button>
    </section>
  );
}

function MetricGrid({ data, analytics }: { data: MarketReadyResponse; analytics: DerivedAnalytics }) {
  const metrics = [
    ["SPOT", usd(data.spot), data.changePercent === null ? "涨跌未知" : `${data.changePercent >= 0 ? "+" : ""}${data.changePercent.toFixed(2)}%`],
    ["NET OI GEX / 1%", exposure(analytics.netGex), "Call 正 / Put 负展示约定"],
    ["NET OI DEX", exposure(analytics.netDex), "公开 OI 的 Delta 名义额"],
    ["ATM IV", pct(analytics.atmIv, true), analytics.nearestExpiry ?? "到期日未知"],
    ["EXPECTED MOVE", usd(analytics.expectedMove), "1σ IV 尺度，不是目标价"],
  ];
  return (
    <div className="metric-grid">
      {metrics.map(([label, value, note]) => (
        <article key={label}><span>{label}</span><strong>{analytics.available || label === "SPOT" ? value : "—"}</strong><small>{note}</small></article>
      ))}
    </div>
  );
}

function ExposureChart({ data, analytics, mode = "gex" }: {
  data: MarketReadyResponse;
  analytics: DerivedAnalytics;
  mode?: "gex" | "dex";
}) {
  if (!analytics.available) return <UnavailableMetric reason="期权链不完整或关键 Greeks / OI 缺失，结构图已停算。" />;
  const rows = [...analytics.rows]
    .sort((a, b) => Math.abs(a.strike - data.spot) - Math.abs(b.strike - data.spot))
    .slice(0, 24)
    .sort((a, b) => a.strike - b.strike);
  const max = Math.max(1, ...rows.map((row) => Math.abs(mode === "gex" ? row.netGex : row.netDex)));
  return (
    <div className="chart-panel">
      <div className="panel-head">
        <div><span>STRIKE DISTRIBUTION</span><h3>{mode === "gex" ? "OI Gamma 暴露" : "OI Delta 暴露"}</h3></div>
        <small>仅显示 Spot 附近 {rows.length} 个行权价</small>
      </div>
      <div className="exposure-chart">
        {rows.map((row) => {
          const value = mode === "gex" ? row.netGex : row.netDex;
          const width = `${Math.max(1.5, Math.abs(value) / max * 48)}%`;
          return (
            <div className={`bar-row ${Math.abs(row.strike - data.spot) < data.spot * .006 ? "at-spot" : ""}`} key={row.strike}>
              <span>{precise.format(row.strike)}</span>
              <div className="negative-side">{value < 0 && <i style={{ width }} />}</div>
              <div className="positive-side">{value >= 0 && <i style={{ width }} />}</div>
              <b>{exposure(value)}</b>
            </div>
          );
        })}
      </div>
      <p className="chart-footnote">这是一种公开 OI 展示约定，不等同于可观察的做市商真实持仓。</p>
    </div>
  );
}

function UnavailableMetric({ reason }: { reason: string }) {
  return (
    <div className="unavailable-metric">
      <span>NOT COMPUTED</span>
      <strong>—</strong>
      <p>{reason}</p>
    </div>
  );
}

function ChainTable({ data }: { data: MarketReadyResponse }) {
  const contracts = [...data.contracts]
    .sort((a, b) => {
      const expiry = a.expiration.localeCompare(b.expiration);
      return expiry || Math.abs(a.strike - data.spot) - Math.abs(b.strike - data.spot);
    })
    .slice(0, 28);
  return (
    <div className="table-panel">
      <div className="panel-head">
        <div><span>RAW CHAIN</span><h3>近月 / 近 ATM 合约</h3></div>
        <small>展示 {contracts.length} / {data.contracts.length}</small>
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr><th>到期</th><th>类型</th><th>行权价</th><th>Bid</th><th>Ask</th><th>IV</th><th>Delta</th><th>Gamma</th><th>OI</th><th>报价时间</th></tr></thead>
          <tbody>
            {contracts.map((item) => (
              <tr key={item.ticker}>
                <td>{item.expiration}</td>
                <td className={item.type === "call" ? "green" : "red"}>{item.type.toUpperCase()}</td>
                <td>{precise.format(item.strike)}</td>
                <td>{item.bid === null ? "—" : item.bid.toFixed(2)}</td>
                <td>{item.ask === null ? "—" : item.ask.toFixed(2)}</td>
                <td>{pct(item.impliedVolatility, true)}</td>
                <td>{item.delta === null ? "—" : item.delta.toFixed(3)}</td>
                <td>{item.gamma === null ? "—" : item.gamma.toFixed(5)}</td>
                <td>{item.openInterest === null ? "—" : compact.format(item.openInterest)}</td>
                <td>{asEt(item.quoteObservedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QualityPanel({ data }: { data: MarketReadyResponse }) {
  const quality = data.chain.coverage;
  const rows = [
    ["期权链完整", data.chain.complete ? "是" : "否", data.chain.complete ? 100 : 0],
    ["双边报价覆盖", pct(quality.quoteCoveragePercent), quality.quoteCoveragePercent],
    ["完整 Greeks 覆盖", pct(quality.greeksCoveragePercent), quality.greeksCoveragePercent],
    ["Spot / 链同步", data.synchronization.underlyingToNewestQuoteMs === null ? "未知" : `${Math.round(Math.abs(data.synchronization.underlyingToNewestQuoteMs) / 1000)} 秒`, data.synchronization.underlyingToNewestQuoteMs === null ? 0 : Math.max(0, 100 - Math.abs(data.synchronization.underlyingToNewestQuoteMs) / 600)],
  ] as const;
  return (
    <div className="quality-panel">
      <div className="panel-head"><div><span>LINEAGE</span><h3>数据质量与时间同步</h3></div><small>{data.requestId.slice(0, 12)}</small></div>
      {rows.map(([label, value, score]) => (
        <div className="quality-row" key={label}>
          <span>{label}</span><strong>{value}</strong><div><i style={{ width: `${Math.max(0, Math.min(100, Number(score)))}%` }} /></div>
        </div>
      ))}
      <dl className="lineage-list">
        <div><dt>Spot 来源</dt><dd>{data.underlying.source} · {asEt(data.underlying.observedAt)}</dd></div>
        <div><dt>最旧报价</dt><dd>{asEt(data.chain.quoteWindow.oldestObservedAt)}</dd></div>
        <div><dt>中位报价</dt><dd>{asEt(data.chain.quoteWindow.medianObservedAt)}</dd></div>
        <div><dt>最新报价</dt><dd>{asEt(data.chain.quoteWindow.newestObservedAt)}</dd></div>
        <div><dt>OI 批次</dt><dd>上一交易日收盘 · 精确日期未知</dd></div>
      </dl>
      {data.warnings.length > 0 && (
        <div className="warning-list">
          {data.warnings.map((warning) => <p className={warning.severity} key={warning.code}><b>{warning.code}</b>{warning.message}</p>)}
        </div>
      )}
    </div>
  );
}

function EffectiveGammaView({ data, analytics, detail }: {
  data: MarketReadyResponse | null;
  analytics: DerivedAnalytics | null;
  detail: boolean;
}) {
  const [participation, setParticipation] = useState(65);
  if (!detail) {
    return (
      <>
        <div className="radar-explainer">
          <span>RADAR HONESTY CHECK</span>
          <h3>“有期权链”不等于“能计算有效 Gamma”</h3>
          <p>标准 OPRA 快照包含报价、交易、IV、Greeks 和 OI，但不直接告诉我们客户是买方还是卖方、客户类型及其实际对冲倾向。因此这里不制造 EHG 排名。</p>
        </div>
        <div className="radar-grid">
          {WATCHLIST.map((symbol) => (
            <article key={symbol}><span>{symbol}</span><strong>待归因数据</strong><small>OI GEX ≠ 有效对冲 Gamma</small><i>FLOW REQUIRED</i></article>
          ))}
        </div>
        <div className="formula-band">
          <article><span>可观察</span><strong>OI、Gamma、Delta、报价</strong></article>
          <article><span>需要推断</span><strong>客户方向、客户类型、归因比例</strong></article>
          <article><span>模型输出</span><strong>带置信度的对冲 Gamma 情景</strong></article>
        </div>
      </>
    );
  }

  const scenario = analytics?.netGex === null || analytics?.netGex === undefined
    ? null
    : analytics.netGex * participation / 100;
  return (
    <div className="effective-layout">
      <div className="ehg-status">
        <span>TRUE EFFECTIVE HEDGING GAMMA</span>
        <strong>不可从标准期权快照直接计算</strong>
        <p>缺少带方向的客户订单流、客户类别推断、可归因 OI 比例和逐类对冲倾向。显示一个精确美元数会造成错误确定性。</p>
        <ul><li>公开 OI 不是客户净头寸</li><li>Call 正 / Put 负只是展示约定</li><li>报价活跃度不能替代持仓方向</li></ul>
      </div>
      <div className="scenario-lab">
        <span>TRANSPARENT SCENARIO · NOT EHG</span>
        <h3>OI GEX × 假设对冲参与率</h3>
        <strong>{exposure(scenario)}</strong>
        <label>参与率 <b>{participation}%</b><input type="range" min="0" max="100" value={participation} onChange={(event) => setParticipation(Number(event.target.value))} /></label>
        <p>该滑杆只用于敏感度分析，不代表观察到的客户或做市商行为。</p>
      </div>
      {data && <QualityPanel data={data} />}
    </div>
  );
}

function ExpiryWallView({ data }: { data: MarketReadyResponse }) {
  if (!data.chain.complete || data.analyticsStatus === "unavailable") {
    return <UnavailableMetric reason="链不完整时不能比较全局到期墙。" />;
  }
  const groups = new Map<string, MarketOptionContract[]>();
  data.contracts.forEach((item) => groups.set(item.expiration, [...(groups.get(item.expiration) ?? []), item]));
  const rows = [...groups.entries()].slice(0, 12).map(([expiration, contracts]) => {
    const call = contracts.filter((item) => item.type === "call" && item.gamma !== null && item.openInterest !== null)
      .map((item) => ({ strike: item.strike, value: (item.gamma ?? 0) * (item.openInterest ?? 0) }))
      .sort((a, b) => b.value - a.value)[0] ?? null;
    const put = contracts.filter((item) => item.type === "put" && item.gamma !== null && item.openInterest !== null)
      .map((item) => ({ strike: item.strike, value: (item.gamma ?? 0) * (item.openInterest ?? 0) }))
      .sort((a, b) => b.value - a.value)[0] ?? null;
    return { expiration, call, put, contracts: contracts.length };
  });
  return (
    <div className="expiry-grid">
      {rows.map((row) => (
        <article key={row.expiration}><span>{row.expiration}</span><div><small>CALL WALL</small><strong>{usd(row.call?.strike ?? null)}</strong></div><div><small>PUT WALL</small><strong>{usd(row.put?.strike ?? null)}</strong></div><p>{row.contracts} 份合约 · Gamma×OI 集中度</p></article>
      ))}
    </div>
  );
}

function IvView({ data }: { data: MarketReadyResponse }) {
  if (!data.chain.complete) return <UnavailableMetric reason="链不完整时不显示期限结构，以免近月截断造成假斜率。" />;
  const expirations = [...new Set(data.contracts.map((item) => item.expiration))].sort().slice(0, 12);
  const rows = expirations.map((expiration) => {
    const near = data.contracts.filter((item) => item.expiration === expiration && item.impliedVolatility !== null)
      .sort((a, b) => Math.abs(a.strike - data.spot) - Math.abs(b.strike - data.spot)).slice(0, 4);
    return {
      expiration,
      iv: near.length ? near.reduce((sum, item) => sum + (item.impliedVolatility ?? 0), 0) / near.length : null,
      dte: Math.ceil(daysTo(expiration, data.observedAt ?? data.fetchedAt)),
    };
  });
  const max = Math.max(.01, ...rows.map((row) => row.iv ?? 0));
  return (
    <div className="term-panel">
      <div className="panel-head"><div><span>TERM STRUCTURE</span><h3>近 ATM 隐含波动率</h3></div><small>每个到期日最近 4 份合约</small></div>
      {rows.map((row) => <div className="term-row" key={row.expiration}><span>{row.expiration}<small>{row.dte} DTE</small></span><div><i style={{ width: `${row.iv === null ? 0 : row.iv / max * 100}%` }} /></div><strong>{pct(row.iv, true)}</strong></div>)}
      <p className="chart-footnote">仅使用供应商返回的 IV；缺失时显示“—”，不使用固定波动率回填。</p>
    </div>
  );
}

function OrderReferenceView() {
  const [account, setAccount] = useState(30_000);
  const [risk, setRisk] = useState(.5);
  const [premium, setPremium] = useState(4.2);
  const budget = account * risk / 100;
  const contractRisk = premium * 100;
  const quantity = contractRisk > 0 ? Math.floor(budget / contractRisk) : 0;
  return (
    <div className="calculator-layout">
      <div className="calculator-card">
        <span>PREMIUM RISK BUDGET</span><strong>{usd(budget)}</strong>
        <div className="field-grid">
          <label>账户规模<input type="number" min="0" value={account} onChange={(e) => setAccount(Number(e.target.value))} /></label>
          <label>单笔风险 %<input type="number" min="0" max="100" step="0.1" value={risk} onChange={(e) => setRisk(Number(e.target.value))} /></label>
          <label>每股权利金<input type="number" min="0" step="0.05" value={premium} onChange={(e) => setPremium(Number(e.target.value))} /></label>
          <label>合约乘数<input value="100" disabled /></label>
        </div>
      </div>
      <div className="quantity-card"><span>MAX CONTRACTS</span><strong>{quantity}</strong><p>每份最大损失 {usd(contractRisk)}。不包含价差、佣金、滑点或提前平仓差异。</p><b className={quantity > 0 ? "green" : "red"}>{quantity > 0 ? "在预算内" : "一份合约已超预算"}</b></div>
    </div>
  );
}

function AlertsView({ symbol }: { symbol: string }) {
  const [level, setLevel] = useState("");
  const [items, setItems] = useState<Array<{ id: string; symbol: string; level: string }>>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setItems(JSON.parse(localStorage.getItem("gammalens-alerts") ?? "[]")); } catch { setItems([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const add = () => {
    if (!level || !Number.isFinite(Number(level))) return;
    const next = [...items, { id: crypto.randomUUID(), symbol, level }];
    setItems(next);
    localStorage.setItem("gammalens-alerts", JSON.stringify(next));
    setLevel("");
  };
  const remove = (id: string) => {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    localStorage.setItem("gammalens-alerts", JSON.stringify(next));
  };
  return (
    <div className="local-tool">
      <div className="local-form"><span>LOCAL PRICE RULE</span><h3>浏览器本地预警</h3><div><input value={symbol} disabled /><input placeholder="价格阈值" value={level} onChange={(e) => setLevel(e.target.value)} /><button className="primary" onClick={add}>添加</button></div><p>规则只保存在这个浏览器。当前版本不会在页面关闭后后台监控。</p></div>
      <div className="local-list">{items.length ? items.map((item) => <article key={item.id}><strong>{item.symbol}</strong><span>触及 {usd(Number(item.level))}</span><button onClick={() => remove(item.id)}>删除</button></article>) : <UnavailableMetric reason="还没有本地规则。" />}</div>
    </div>
  );
}

function ReviewView({ symbol }: { symbol: string }) {
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<Array<{ id: string; at: string; symbol: string; note: string }>>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setSaved(JSON.parse(localStorage.getItem("gammalens-reviews") ?? "[]")); } catch { setSaved([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const save = () => {
    if (!note.trim()) return;
    const next = [{ id: crypto.randomUUID(), at: new Date().toISOString(), symbol, note: note.trim() }, ...saved].slice(0, 50);
    setSaved(next); localStorage.setItem("gammalens-reviews", JSON.stringify(next)); setNote("");
  };
  return (
    <div className="review-layout">
      <div className="note-card"><span>LOCAL RESEARCH NOTE</span><h3>{symbol} 研究快照</h3><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="写下前提、反证、失效条件和计划…" /><button className="primary" onClick={save}>保存到本地</button></div>
      <div className="review-list">{saved.length ? saved.map((item) => <article key={item.id}><span>{item.symbol} · {new Date(item.at).toLocaleString("zh-CN")}</span><p>{item.note}</p></article>) : <UnavailableMetric reason="尚无本地复盘记录。" />}</div>
    </div>
  );
}

function ResearchView({ module }: { module: QuantModule }) {
  return (
    <div className="research-layout">
      <div className="source-card blocked-source"><span>PRIMARY MARKET DATA</span><strong>等待授权数据源</strong><p>{module.dataNeeds.join(" · ")}</p></div>
      <div className="source-card"><span>OUTPUT CONTRACT</span><strong>不生成无来源结论</strong><p>{module.outputs.join(" · ")}</p></div>
      <div className="research-checklist"><h3>该模块上线真实输出前必须满足</h3>{module.dataNeeds.map((need) => <p key={need}><i />{need}</p>)}<p><i />逐条来源链接或供应商 request ID</p><p><i />数据时间与覆盖范围</p></div>
    </div>
  );
}

function MomentumView() {
  return (
    <div className="axis-grid">
      {["5 分钟趋势", "1 小时趋势", "日线趋势", "波动调整", "成交量确认", "结构背离"].map((item) => <article key={item}><span>{item}</span><strong>—</strong><small>需要历史价格序列</small></article>)}
      <p>单一实时快照不能推导动量。GammaLens 不用当前涨跌幅代替多周期趋势。</p>
    </div>
  );
}

function SpxPlaybook({ analytics }: { analytics: DerivedAnalytics | null }) {
  if (!analytics?.available) return <UnavailableMetric reason="缺少完整 SPX 期权链，条件剧本未生成。" />;
  return (
    <div className="playbook-grid">
      <article><span>ABOVE CALL WALL</span><strong>{usd(analytics.callWall)}</strong><p>只检查价格是否进入 Call Gamma 集中区；需结合流动性和事件。</p></article>
      <article><span>INSIDE RANGE</span><strong>{usd(analytics.putWall)} — {usd(analytics.callWall)}</strong><p>区间是结构描述，不保证均值回归。</p></article>
      <article><span>BELOW PUT WALL</span><strong>{usd(analytics.putWall)}</strong><p>Put Gamma 集中不等于支撑位；先定义失效条件。</p></article>
    </div>
  );
}

function WorkspaceContent({ module, path, data, analytics, symbol }: {
  module: QuantModule;
  path: string;
  data: MarketApiResponse | null;
  analytics: DerivedAnalytics | null;
  symbol: string;
}) {
  const ready = data?.status === "ready" ? data : null;
  const detailEgh = /^\/effective-gamma\//i.test(path);

  if (module.id === "ticker" && symbol === "SPX") return <SpxStructureTerminal data={data} />;
  if (module.id === "order-reference") return <OrderReferenceView />;
  if (module.id === "alerts") return <AlertsView symbol={symbol} />;
  if (module.id === "review-history") return <ReviewView symbol={symbol} />;
  if (module.id === "effective-gamma") return <EffectiveGammaView data={ready} analytics={analytics} detail={detailEgh} />;
  if (module.kind === "momentum") return <MomentumView />;
  if (module.kind === "research") return <ResearchView module={module} />;
  if (!ready) return <ResearchView module={module} />;

  if (module.id === "spot-time") return <QualityPanel data={ready} />;
  if (module.id === "expiry-wall") return <ExpiryWallView data={ready} />;
  if (module.kind === "iv") return <IvView data={ready} />;
  if (module.kind === "dex" && analytics) return <><MetricGrid data={ready} analytics={analytics} /><ExposureChart data={ready} analytics={analytics} mode="dex" /></>;
  if (module.kind === "chain") return <><QualityPanel data={ready} /><ChainTable data={ready} /></>;
  if (module.kind === "spx") return <SpxPlaybook analytics={analytics} />;
  if (module.kind === "terrain") {
    return <div className="terrain-layout"><article><span>TREND AXIS</span><strong>不可分类</strong><p>缺历史价格</p></article><article><span>VOLATILITY AXIS</span><strong>{pct(analytics?.atmIv ?? null, true)}</strong><p>近月 ATM IV</p></article><article><span>GAMMA AXIS</span><strong>{exposure(analytics?.netGex ?? null)}</strong><p>公开 OI 展示约定</p></article></div>;
  }
  if (analytics) {
    return <><MetricGrid data={ready} analytics={analytics} /><div className="split-panels"><ExposureChart data={ready} analytics={analytics} /><QualityPanel data={ready} /></div>{module.kind === "ticker" && <ChainTable data={ready} />}</>;
  }
  return <ResearchView module={module} />;
}

function ModuleWorkspace({ module, path, symbol, data, loading, refresh }: {
  module: QuantModule;
  path: string;
  symbol: string;
  data: MarketApiResponse | null;
  loading: boolean;
  refresh: () => void;
}) {
  const analytics = useMemo(() => data?.status === "ready" ? deriveAnalytics(data) : null, [data]);
  const needsMarket = !["order-reference", "alerts", "review-history"].includes(module.id);
  const isSpxTerminal = module.id === "ticker" && symbol === "SPX";
  const title = isSpxTerminal ? "SPX 结构终端" : module.name;
  const summary = isSpxTerminal
    ? "用单到期切片检查 SPX 现货、OI Proxy GEX / DEX、Gamma 集中位、ATM 跨式、IV 与数据血缘。"
    : module.summary;
  const outputs = isSpxTerminal
    ? ["单到期 GEX / DEX", "ATM 跨式 / IV", "逐字段数据血缘"]
    : module.outputs;
  return (
    <>
      <section className="workspace-hero">
        <div>
          <p className="breadcrumbs">GAMMALENS / {CATEGORY_LABELS[module.category].toUpperCase()} / {module.english.toUpperCase()}</p>
          <h1>{title}</h1>
          <p>{summary}</p>
          <div className="output-tags">{outputs.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
        <div className="symbol-block"><span>ACTIVE SYMBOL</span><strong>{symbol}</strong><small>{needsMarket ? "市场数据驱动" : "本地工具"}</small></div>
      </section>
      {needsMarket && <DataGate data={data} loading={loading} onRefresh={refresh} />}
      <section className="workspace-body">
        <WorkspaceContent module={module} path={path} data={data} analytics={analytics} symbol={symbol} />
      </section>
      <section className="disclosure-strip"><b>方法披露</b><p>本工具仅用于研究。OI GEX 使用 Call 正、Put 负的展示约定；它不是做市商真实账本，也不是方向预测。有效 Gamma 需要额外的订单流归因数据。</p></section>
    </>
  );
}

export function QuantTerminal({ initialPath }: { initialPath: string }) {
  const [path, setPath] = useState(initialPath.toLowerCase());
  const [symbol, setSymbol] = useState(symbolFromPath(initialPath) || (initialPath.includes("spx") ? "SPX" : "MU"));
  const [query, setQuery] = useState(symbol);
  const [data, setData] = useState<MarketApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const requestId = useRef(0);
  const activeController = useRef<AbortController | null>(null);

  const activeModule = findModule(path);
  const marketSymbol = activeModule?.category === "spx" || path.includes("/spx") ? "SPX" : symbol;

  const load = useCallback(async () => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const sequence = ++requestId.current;
    setLoading(true);
    setData(null);
    try {
        const profile = marketSymbol === "SPX" ? "&profile=spx-front-structure" : "";
        const response = await fetch(`/api/market?symbol=${encodeURIComponent(marketSymbol)}${profile}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const body = await response.json() as MarketApiResponse;
      if (sequence === requestId.current) setData(body);
    } catch {
      if (sequence === requestId.current) setData(null);
    } finally {
      if (sequence === requestId.current) setLoading(false);
    }
  }, [marketSymbol]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      activeController.current?.abort();
    };
  }, [load]);
  useEffect(() => {
    const onPop = () => {
      const next = window.location.pathname.toLowerCase();
      setPath(next);
      const nextSymbol = symbolFromPath(next);
      if (nextSymbol) { setSymbol(nextSymbol); setQuery(nextSymbol); }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (href: string) => {
    const resolved = href === "/ticker/MU" ? `/ticker/${symbol}` : href;
    window.history.pushState({}, "", resolved);
    setPath(resolved.toLowerCase());
    const nextSymbol = symbolFromPath(resolved);
    if (nextSymbol) { setSymbol(nextSymbol); setQuery(nextSymbol); }
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const search = (event: FormEvent) => {
    event.preventDefault();
    const next = normalizeSymbol(query);
    if (!next) return;
    setSymbol(next);
    navigate(`/ticker/${next}`);
  };

  return (
    <div className="terminal-shell">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <button className="brand" onClick={() => navigate("/")}><b>Γ</b><span>GammaLens<small>STRUCTURE LAB</small></span></button>
        <nav>
          <button className={path === "/" ? "active" : ""} onClick={() => navigate("/")}><span>⌂</span>模块总览</button>
          {categories.map((category) => (
            <div className="nav-group" key={category}>
              <p>{CATEGORY_LABELS[category]}</p>
              {MODULES.filter((item) => item.category === category).map((item) => {
                const active = activeModule?.id === item.id && path !== "/";
                return <button className={active ? "active" : ""} key={item.id} onClick={() => navigate(item.href)}><span>{item.id.slice(0, 2).toUpperCase()}</span>{item.name}</button>;
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot"><i className={data?.status === "ready" ? "live" : ""} /><span>{data?.status === "ready" ? `${data.source.provider} ${feedLabel(data.feedClass)}` : "DATA OFFLINE"}</span></div>
      </aside>

      <div className="terminal-main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <form onSubmit={search}><label>SYMBOL</label><input value={query} onChange={(e) => setQuery(normalizeSymbol(e.target.value))} aria-label="标的代码" /><button>分析 ↗</button></form>
          <div className="top-status"><span>{data?.status === "ready" ? feedLabel(data.feedClass) : "未连接"}</span><i className={data?.status === "ready" ? "live" : ""} /></div>
        </header>
        <main>
          {path === "/" || !activeModule
            ? <ModuleDirectory data={data} navigate={navigate} />
            : <ModuleWorkspace module={activeModule} path={path} symbol={marketSymbol} data={data} loading={loading} refresh={() => void load()} />}
        </main>
        <footer><span>GammaLens / Research infrastructure, not investment advice.</span><a href="https://massive.com/docs/rest/options/overview" target="_blank" rel="noreferrer">数据接口文档 ↗</a></footer>
      </div>
    </div>
  );
}
