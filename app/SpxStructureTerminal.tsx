"use client";

import { useEffect, useState } from "react";
import type { MarketApiResponse, MarketReadyResponse } from "@/lib/market";
import {
  PROVIDER_CATALOG,
  type ProviderRegistryResponse,
  type ProviderStatus,
} from "@/lib/providers";
import {
  buildSpxStructure,
  spxExpirations,
  type SpxStructureSnapshot,
} from "@/lib/spx";

const compact = new Intl.NumberFormat("zh-CN", {
  notation: "compact",
  maximumFractionDigits: 2,
});

const precise = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function usd(value: number | null) {
  return value === null || !Number.isFinite(value) ? "—" : `$${precise.format(value)}`;
}

function exposure(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}$${compact.format(Math.abs(value))}`;
}

function percent(value: number | null) {
  return value === null || !Number.isFinite(value) ? "—" : `${(value * 100).toFixed(2)}%`;
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

function EmptySpxTerminal({ data }: { data: MarketApiResponse | null }) {
  const reason = data?.status === "unconfigured"
    ? "服务器尚未配置获准公开输出的行情源，或展示、衍生计算与原始链再分发权尚未全部确认。"
    : data?.status === "error"
      ? data.error.message
      : "正在等待可验证的 SPX 数据快照。";
  return (
    <div className="spx-terminal">
      <div className="spx-terminal-intro">
        <div>
          <span>SPX STRUCTURE TERMINAL · AUDIT FIRST</span>
          <h2>模块已就绪，数据不合格时不出数字。</h2>
          <p>{reason} 页面不会使用演示价格、缓存截图或推算值填空。</p>
        </div>
        <b className="spx-state blocked">DATA BLOCKED</b>
      </div>
      <div className="spx-blueprint-grid">
        {[
          ["SPX SPOT", "独立指数观测时间与 feed class"],
          ["OI PROXY GEX", "单到期、声明范围、缺失即停算"],
          ["OI DELTA NOTIONAL", "Delta 缺失绝不按 0 处理"],
          ["ATM STRADDLE", "同到期、同行权价、60 秒内配对"],
          ["IV / 25Δ SKEW", "仅使用供应商返回值，不固定回填"],
          ["ZERO / EHG", "缺曲线或持仓归因时明确不可计算"],
        ].map(([label, note]) => (
          <article key={label}><span>{label}</span><strong>—</strong><p>{note}</p></article>
        ))}
      </div>
      <DataSourceContract ready={null} />
    </div>
  );
}

function DataSourceContract({ ready }: { ready: MarketReadyResponse | null }) {
  const [registry, setRegistry] = useState<ProviderRegistryResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/providers", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<ProviderRegistryResponse> : null)
      .then((payload) => {
        if (payload) setRegistry(payload);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const providers = (registry?.providers ?? PROVIDER_CATALOG).map((provider) => {
    if (provider.id !== "massive" || !ready) return provider;
    return {
      ...provider,
      runtimeState: "ready",
      statusLabel: `${ready.feedClass.toUpperCase()} SNAPSHOT`,
      configured: true,
    } satisfies ProviderStatus;
  });
  const access = registry?.access;

  return (
    <div className="spx-source-contract">
      <div className="panel-head">
        <div><span>LICENSED DATA SOURCE REGISTRY</span><h3>数据源能力、时效与授权边界</h3></div>
        <small>{registry ? `REGISTRY ${registry.schemaVersion}` : "正在核对运行状态"}</small>
      </div>
      <div className="spx-provider-policy">
        <div>
          <b>不抓网页 · 不平均门户价格</b>
          <p>一张主快照只使用一个主报价源；辅助源只有在观测时间可比时用于交叉验证。主源失败时整张快照切换，不按字段拼接。</p>
        </div>
        <span className={access?.feedMode && access.feedMode !== "disabled" ? "ready" : "blocked"}>
          {access?.feedMode && access.feedMode !== "disabled"
            ? `${access.feedMode.toUpperCase()} · RIGHTS CHECKED`
            : "PUBLIC FEED DISABLED"}
        </span>
      </div>
      <div className="spx-source-grid">
        {providers.map((provider) => (
          <article key={provider.id}>
            <div className="spx-provider-card-head">
              <span>{provider.role}</span>
              <b className={provider.runtimeState}>{provider.statusLabel}</b>
            </div>
            <strong>{provider.name}</strong>
            <p>{provider.note}</p>
            <dl>
              <div><dt>官方入口</dt><dd>{provider.officialAccess}</dd></div>
              <div><dt>时效</dt><dd>{provider.freshness}</dd></div>
              <div><dt>本站用途</dt><dd>{provider.allowedUse}</dd></div>
            </dl>
            <a href={provider.docsUrl} target="_blank" rel="noreferrer">官方说明 ↗</a>
          </article>
        ))}
      </div>
      <p className="spx-source-footnote">
        无外部展示权、衍生计算权或原始链再分发权时，市场 API 默认返回 DATA BLOCKED；服务器凭据不会进入浏览器响应。
      </p>
    </div>
  );
}

function ExposurePanel({
  ready,
  snapshot,
  mode,
}: {
  ready: MarketReadyResponse;
  snapshot: SpxStructureSnapshot;
  mode: "gex" | "dex";
}) {
  const available = mode === "gex" ? snapshot.gexStatus === "ready" : snapshot.dexStatus === "ready";
  const reason = mode === "gex" ? snapshot.gexReason : snapshot.dexReason;
  if (!available) {
    return (
      <div className="spx-exposure-panel unavailable">
        <div className="panel-head"><div><span>{mode.toUpperCase()} BY STRIKE</span><h3>未计算</h3></div></div>
        <strong>—</strong><p>{reason}</p>
      </div>
    );
  }
  const rows = [...snapshot.rows]
    .sort((left, right) => Math.abs(left.strike - ready.spot) - Math.abs(right.strike - ready.spot))
    .slice(0, 25)
    .sort((left, right) => left.strike - right.strike);
  const values = rows.map((row) => mode === "gex" ? row.netGex : row.netDex);
  const max = Math.max(1, ...values.map(Math.abs));
  return (
    <div className="spx-exposure-panel">
      <div className="panel-head">
        <div><span>{mode === "gex" ? "OI PROXY GEX / 1%" : "OI LONG-HOLDER DELTA NOTIONAL"}</span><h3>{mode.toUpperCase()} · {snapshot.expiration}</h3></div>
        <small>{rows.length} strikes near spot</small>
      </div>
      <div className="spx-bars">
        {rows.map((row) => {
          const value = mode === "gex" ? row.netGex : row.netDex;
          const width = `${Math.max(1, Math.abs(value) / max * 49)}%`;
          return (
            <div className={Math.abs(row.strike - ready.spot) <= ready.spot * .002 ? "at-spot" : ""} key={row.strike}>
              <span>{precise.format(row.strike)}</span>
              <i className="negative">{value < 0 && <b style={{ width }} />}</i>
              <i className="positive">{value >= 0 && <b style={{ width }} />}</i>
              <small>{exposure(value)}</small>
            </div>
          );
        })}
      </div>
      <p className="chart-footnote">Call 正、Put 负仅为 OI proxy 展示约定；不是做市商真实持仓。</p>
    </div>
  );
}

function PriceStructure({ ready, snapshot }: { ready: MarketReadyResponse; snapshot: SpxStructureSnapshot }) {
  const levels = [
    { label: "EM LOW", value: snapshot.expectedMoveLower, tone: "range" },
    { label: "PUT WALL", value: snapshot.putWall, tone: "put" },
    { label: "SPOT", value: ready.spot, tone: "spot" },
    { label: "CALL WALL", value: snapshot.callWall, tone: "call" },
    { label: "EM HIGH", value: snapshot.expectedMoveUpper, tone: "range" },
  ].filter((item): item is { label: string; value: number; tone: string } => item.value !== null);
  const values = levels.map((item) => item.value);
  const rawMin = values.length ? Math.min(...values) : ready.spot * .99;
  const rawMax = values.length ? Math.max(...values) : ready.spot * 1.01;
  const padding = Math.max(ready.spot * .003, (rawMax - rawMin) * .12);
  const min = rawMin - padding;
  const max = rawMax + padding;
  return (
    <div className="spx-price-panel">
      <div className="panel-head">
        <div><span>PRICE STRUCTURE</span><h3>同一到期日价格轴</h3></div>
        <small>{snapshot.expiration} · no mixed expiry</small>
      </div>
      <div className="spx-price-axis">
        <i className="axis-line" />
        {levels.map((item) => (
          <div className={`axis-marker ${item.tone}`} key={item.label} style={{ left: `${((item.value - min) / (max - min)) * 100}%` }}>
            <b />
            <span>{item.label}</span>
            <strong>{precise.format(item.value)}</strong>
          </div>
        ))}
      </div>
      <p className="chart-footnote">墙位是该到期日、声明 strike 范围内的 Gamma 集中点；ATM 跨式是权利金尺度，不是目标价或保证区间。</p>
    </div>
  );
}

function RegimePanel({ ready, snapshot }: { ready: MarketReadyResponse; snapshot: SpxStructureSnapshot }) {
  const gross = snapshot.gexStatus === "ready"
    ? snapshot.rows.reduce((sum, row) => sum + Math.abs(row.netGex), 0)
    : 0;
  const balance = gross > 0 && snapshot.netGex !== null ? snapshot.netGex / gross : null;
  const state = balance === null
    ? "INDETERMINATE"
    : balance >= .05
      ? "CONDITIONAL DAMPING"
      : balance <= -.05
        ? "CONDITIONAL AMPLIFICATION"
        : "BALANCED";
  const wallContext = snapshot.putWall !== null && snapshot.callWall !== null
    ? ready.spot < snapshot.putWall
      ? "Spot 位于 Put Gamma 集中位下方"
      : ready.spot > snapshot.callWall
        ? "Spot 位于 Call Gamma 集中位上方"
        : "Spot 位于两侧 Gamma 集中位之间"
    : "墙位数据不完整";
  return (
    <div className="spx-regime-panel">
      <div className="panel-head"><div><span>CONDITIONAL REGIME</span><h3>结构条件，不给方向概率</h3></div><small>OI proxy convention</small></div>
      <div className="spx-regime-main"><span>GAMMA STATE</span><strong>{state}</strong><small>Gamma balance {percent(balance)}</small></div>
      <div className="spx-regime-rows">
        <p><b>价格位置</b><span>{wallContext}</span></p>
        <p><b>Zero Gamma</b><span>{snapshot.zeroGammaReason}</span></p>
        <p><b>有效 Gamma</b><span>缺少带方向订单流和参与者归因，状态固定为不可计算。</span></p>
      </div>
    </div>
  );
}

function ExpiryMatrix({
  ready,
  selected,
  onSelect,
}: {
  ready: MarketReadyResponse;
  selected: string;
  onSelect: (expiration: string) => void;
}) {
  const rows = spxExpirations(ready).slice(0, 10).map((expiration) => buildSpxStructure(ready, expiration));
  return (
    <div className="spx-expiry-panel">
      <div className="panel-head"><div><span>EXPIRY MATRIX</span><h3>每个到期日独立计算</h3></div><small>点击切换主视图</small></div>
      <div className="table-scroll">
        <table>
          <thead><tr><th>到期日</th><th>合约</th><th>Net GEX / 1%</th><th>Put wall</th><th>Call wall</th><th>ATM IV</th><th>ATM straddle</th><th>报价时间</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr className={row.expiration === selected ? "selected" : ""} key={row.expiration} onClick={() => row.expiration && onSelect(row.expiration)}>
                <td><button>{row.expiration}</button></td>
                <td>{row.contracts}</td>
                <td>{exposure(row.netGex)}</td>
                <td>{usd(row.putWall)}</td>
                <td>{usd(row.callWall)}</td>
                <td>{percent(row.atmIv)}</td>
                <td>{usd(row.expectedMove)}</td>
                <td>{asEt(row.quoteObservedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LineagePanel({ ready, snapshot }: { ready: MarketReadyResponse; snapshot: SpxStructureSnapshot }) {
  const scope = ready.chain.requestedScope;
  return (
    <div className="spx-lineage-panel">
      <div className="panel-head"><div><span>SNAPSHOT LINEAGE</span><h3>数据时点与声明范围</h3></div><small>{ready.requestId.slice(0, 12)}</small></div>
      <div className="spx-lineage-grid">
        <article><span>SPX SPOT</span><strong>{usd(ready.spot)}</strong><p>{ready.underlying.source}<br />{asEt(ready.underlying.observedAt)}</p></article>
        <article><span>OPTION QUOTES</span><strong>{ready.observations.options.feedClass}</strong><p>所选到期最新<br />{asEt(snapshot.quoteObservedAt)}</p></article>
        <article><span>OPEN INTEREST</span><strong>PREVIOUS EOD</strong><p>精确批次日期未知<br />不与盘中报价伪装同步</p></article>
        <article><span>DECLARED SCOPE</span><strong>{scope.profile}</strong><p>{scope.expirationFrom} → {scope.expirationTo}<br />{precise.format(scope.strikeFrom)} → {precise.format(scope.strikeTo)}</p></article>
      </div>
      <dl className="spx-lineage-list">
        <div><dt>抓取时间</dt><dd>{asEt(ready.fetchedAt)}</dd></div>
        <div><dt>报价窗口</dt><dd>{asEt(ready.chain.quoteWindow.oldestObservedAt)} → {asEt(ready.chain.quoteWindow.newestObservedAt)}</dd></div>
        <div><dt>完整性</dt><dd>{ready.chain.complete ? "声明范围分页完成" : "链被截断"}</dd></div>
        <div><dt>覆盖</dt><dd>{ready.chain.coverage.contracts} contracts · Greeks {ready.chain.coverage.greeksCoveragePercent.toFixed(1)}% · NBBO {ready.chain.coverage.quoteCoveragePercent.toFixed(1)}%</dd></div>
      </dl>
      {ready.warnings.length > 0 && <div className="warning-list">{ready.warnings.map((warning) => <p className={warning.severity} key={warning.code}><b>{warning.code}</b>{warning.message}</p>)}</div>}
    </div>
  );
}

function RawSpxChain({ ready, expiration }: { ready: MarketReadyResponse; expiration: string }) {
  const contracts = ready.contracts
    .filter((contract) => contract.expiration === expiration)
    .sort((left, right) => Math.abs(left.strike - ready.spot) - Math.abs(right.strike - ready.spot))
    .slice(0, 30);
  return (
    <div className="spx-chain-panel">
      <div className="panel-head"><div><span>RAW INPUT</span><h3>{expiration} · 近 ATM 合约</h3></div><small>{contracts.length} / {ready.contracts.filter((item) => item.expiration === expiration).length}</small></div>
      <div className="table-scroll"><table>
        <thead><tr><th>合约</th><th>类型</th><th>Strike</th><th>Bid</th><th>Ask</th><th>IV</th><th>Delta</th><th>Gamma</th><th>OI</th><th>Quote</th></tr></thead>
        <tbody>{contracts.map((contract) => <tr key={contract.ticker}>
          <td>{contract.ticker}</td><td className={contract.type === "call" ? "green" : "red"}>{contract.type.toUpperCase()}</td><td>{precise.format(contract.strike)}</td>
          <td>{contract.bid?.toFixed(2) ?? "—"}</td><td>{contract.ask?.toFixed(2) ?? "—"}</td><td>{percent(contract.impliedVolatility)}</td>
          <td>{contract.delta?.toFixed(4) ?? "—"}</td><td>{contract.gamma?.toFixed(6) ?? "—"}</td><td>{contract.openInterest === null ? "—" : compact.format(contract.openInterest)}</td><td>{asEt(contract.quoteObservedAt)}</td>
        </tr>)}</tbody>
      </table></div>
    </div>
  );
}

export function SpxStructureTerminal({ data }: { data: MarketApiResponse | null }) {
  const [selectedExpiration, setSelectedExpiration] = useState("");
  if (!data || data.status !== "ready") return <EmptySpxTerminal data={data} />;

  const expirations = spxExpirations(data);
  const effectiveExpiration = expirations.includes(selectedExpiration)
    ? selectedExpiration
    : expirations[0] ?? "";
  const snapshot = buildSpxStructure(data, effectiveExpiration);
  const metrics = [
    ["SPX SPOT", usd(data.spot), asEt(data.underlying.observedAt), true],
    ["OI PROXY GEX / 1%", exposure(snapshot.netGex), `${snapshot.gexContracts}/${snapshot.contracts} contracts`, snapshot.gexStatus === "ready"],
    ["OI DELTA NOTIONAL", exposure(snapshot.netDex), `${snapshot.dexContracts}/${snapshot.contracts} contracts`, snapshot.dexStatus === "ready"],
    ["PUT / CALL WALL", `${usd(snapshot.putWall)} / ${usd(snapshot.callWall)}`, snapshot.expiration ?? "—", snapshot.gexStatus === "ready"],
    ["ATM STRADDLE", usd(snapshot.expectedMove), `K ${snapshot.atmStrike ?? "—"} · premium scale`, snapshot.expectedMove !== null],
    ["ATM IV", percent(snapshot.atmIv), `paired call / put · ${snapshot.expiration ?? "—"}`, snapshot.atmIv !== null],
    ["25Δ PUT-CALL SKEW", percent(snapshot.skew25Delta), "nearest observed 25Δ contracts", snapshot.skew25Delta !== null],
    ["ZERO GAMMA", "NOT COMPUTED", "missing rates / dividends / settlement metadata", false],
  ] as const;

  return (
    <div className="spx-terminal">
      <div className="spx-terminal-intro">
        <div><span>SPX FRONT STRUCTURE · SINGLE EXPIRY</span><h2>一个快照、一种期限、逐指标门控。</h2><p>当前主视图不会混合到期日。跨式、墙位、GEX 与 DEX 都显示自己的可计算条件。</p></div>
        <b className={`spx-state ${data.hasBlockingWarnings ? "degraded" : "ready"}`}>{data.hasBlockingWarnings ? "ANALYTICS BLOCKED" : `${data.feedClass.toUpperCase()} SNAPSHOT`}</b>
      </div>

      <div className="spx-expiry-tabs" aria-label="选择到期日">
        {expirations.slice(0, 12).map((expiration) => <button className={expiration === effectiveExpiration ? "active" : ""} onClick={() => setSelectedExpiration(expiration)} key={expiration}>{expiration}</button>)}
      </div>

      <div className="spx-metric-grid">
        {metrics.map(([label, value, note, available]) => <article className={available ? "" : "blocked"} key={label}><span>{label}</span><strong>{available ? value : label === "ZERO GAMMA" ? value : "—"}</strong><small>{available ? note : label === "ZERO GAMMA" ? snapshot.zeroGammaReason : label.includes("GEX") || label.includes("WALL") ? snapshot.gexReason : label.includes("DELTA") ? snapshot.dexReason : snapshot.expectedMoveReason ?? note}</small></article>)}
      </div>

      <div className="spx-two-column">
        <PriceStructure ready={data} snapshot={snapshot} />
        <RegimePanel ready={data} snapshot={snapshot} />
      </div>
      <div className="spx-two-column equal">
        <ExposurePanel ready={data} snapshot={snapshot} mode="gex" />
        <ExposurePanel ready={data} snapshot={snapshot} mode="dex" />
      </div>
      <ExpiryMatrix ready={data} selected={effectiveExpiration} onSelect={setSelectedExpiration} />
      <LineagePanel ready={data} snapshot={snapshot} />
      <DataSourceContract ready={data} />
      {effectiveExpiration && <RawSpxChain ready={data} expiration={effectiveExpiration} />}
    </div>
  );
}
