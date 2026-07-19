export const PROVIDER_REGISTRY_SCHEMA_VERSION = "1.0";

export type ProviderRuntimeState =
  | "ready"
  | "access-blocked"
  | "contract-required"
  | "adapter-pending"
  | "reference-only"
  | "display-only";

export type ProviderAdapterState = "implemented" | "planned" | "not-applicable";

export interface ProviderStatus {
  id: string;
  name: string;
  role: string;
  runtimeState: ProviderRuntimeState;
  statusLabel: string;
  configured: boolean;
  adapterState: ProviderAdapterState;
  officialAccess: string;
  freshness: string;
  allowedUse: string;
  note: string;
  docsUrl: string;
}

export interface ProviderRegistryResponse {
  schemaVersion: typeof PROVIDER_REGISTRY_SCHEMA_VERSION;
  generatedAt: string;
  policy: {
    htmlScraping: false;
    portalAveraging: false;
    crossCheck: "same-timestamp-only";
    rawChainDefault: "disabled";
  };
  access: {
    feedMode: "disabled" | "delayed" | "realtime";
    publicDisplay: boolean;
    derivedAnalytics: boolean;
    rawRedistribution: boolean;
  };
  providers: ProviderStatus[];
}

export interface ProviderRuntimeFlags {
  feedMode?: "disabled" | "delayed" | "realtime";
  publicDisplay?: boolean;
  derivedAnalytics?: boolean;
  rawRedistribution?: boolean;
  massiveCredentials?: boolean;
  nasdaqCredentials?: boolean;
  cboeGateway?: boolean;
  occDailyOi?: boolean;
  bloombergGateway?: boolean;
}

export const PROVIDER_CATALOG: readonly ProviderStatus[] = [
  {
    id: "massive",
    name: "Massive",
    role: "CURRENT ADAPTER",
    runtimeState: "access-blocked",
    statusLabel: "待密钥与公网授权",
    configured: false,
    adapterState: "implemented",
    officialAccess: "服务器端 Options Snapshot API",
    freshness: "由套餐与 OPRA 权限决定",
    allowedUse: "Spot、NBBO、Greeks、OI；逐字段保留时间戳",
    note: "代码适配器已实现；只有展示权、衍生计算权和原始链再分发权全部确认后才会输出。",
    docsUrl: "https://massive.com/docs/rest/options/snapshots/option-chain-snapshot",
  },
  {
    id: "nasdaq-smart-options",
    name: "Nasdaq Smart Options",
    role: "LICENSED OPTION FEED",
    runtimeState: "contract-required",
    statusLabel: "可接 · 待合同",
    configured: false,
    adapterState: "planned",
    officialAccess: "Nasdaq Data Link OAuth / Smart Options",
    freshness: "实时或延迟，取决于签约数据集",
    allowedUse: "OPRA 期权报价与成交；具体字段以 entitlement 为准",
    note: "不抓 Nasdaq.com。拿到正式 base URL、OAuth 凭据和外部展示/计算权后接入。",
    docsUrl: "https://docs.data.nasdaq.com/docs/api-for-real-time-or-delayed-data-1",
  },
  {
    id: "cboe-cgif",
    name: "Cboe CGIF",
    role: "PRIMARY SPX INDEX",
    runtimeState: "contract-required",
    statusLabel: "首选 Spot · 待合同",
    configured: false,
    adapterState: "planned",
    officialAccess: "Cboe Global Indices Feed / licensed gateway",
    freshness: "交易所指数时点",
    allowedUse: "SPX 指数主观测与结算元数据",
    note: "SPX Spot 应优先来自指数所有者的授权 feed，而不是门户网页或门户自算价格。",
    docsUrl: "https://www.cboe.com/us/indices/accessing-index-data/",
  },
  {
    id: "occ-daily-oi",
    name: "OCC Daily Open Interest",
    role: "OFFICIAL OI BATCH",
    runtimeState: "adapter-pending",
    statusLabel: "计划接入",
    configured: false,
    adapterState: "planned",
    officialAccess: "OCC Daily Open Interest batch",
    freshness: "上一交易日批次",
    allowedUse: "OI 批次日期校验；不冒充盘中实时持仓",
    note: "OI 与盘中报价属于不同时间截面，页面会分别标注 observed-at/batch date。",
    docsUrl: "https://www.theocc.com/market-data/market-data-reports/other-market-data-info/batch-processing/daily-open-interest",
  },
  {
    id: "bloomberg-enterprise",
    name: "Bloomberg B-PIPE / SAPI",
    role: "ENTERPRISE GATEWAY",
    runtimeState: "contract-required",
    statusLabel: "企业合同后可接",
    configured: false,
    adapterState: "planned",
    officialAccess: "B-PIPE、Server API 或 Data License",
    freshness: "实时、延迟或参考数据，按 entitlement",
    allowedUse: "机构主源或同时间点交叉验证",
    note: "不抓 Bloomberg.com；公网展示与非展示计算必须由单独合同明确覆盖。",
    docsUrl: "https://professional.bloomberg.com/products/data/enterprise-catalog/real-time-data-feed/",
  },
  {
    id: "yahoo-finance",
    name: "Yahoo Finance",
    role: "REFERENCE ONLY",
    runtimeState: "reference-only",
    statusLabel: "不作为计算源",
    configured: false,
    adapterState: "not-applicable",
    officialAccess: "人工外部核对",
    freshness: "Cboe 指数通常延迟 15 分钟",
    allowedUse: "只做用户可见的参考链接",
    note: "没有适合本站的受支持公开 Finance 行情 API；不调用未公开接口，也不抓 HTML。",
    docsUrl: "https://help.yahoo.com/kb/finance/article-exchanges-data-delays-sln2310.html",
  },
  {
    id: "optioncharts",
    name: "OptionCharts",
    role: "REFERENCE ONLY",
    runtimeState: "reference-only",
    statusLabel: "无 API · 不抓取",
    configured: false,
    adapterState: "not-applicable",
    officialAccess: "人工查看或用户手动 CSV",
    freshness: "Free/Premium 延迟；Ultimate 实时",
    allowedUse: "视觉交叉检查，不进入 Gamma 计算",
    note: "官方 FAQ 明确当前没有 API；付费订阅页面数据和网页内容不会被本站自动提取。",
    docsUrl: "https://optioncharts.io/docs/faq",
  },
  {
    id: "tradingview",
    name: "TradingView",
    role: "DISPLAY UI ONLY",
    runtimeState: "display-only",
    statusLabel: "图表界面，不是数据源",
    configured: false,
    adapterState: "not-applicable",
    officialAccess: "官方 Widget / Advanced Charts（自带 datafeed）",
    freshness: "由 Widget 或自有 datafeed 决定",
    allowedUse: "独立展示或人工参考",
    note: "TradingView 图表库本身不含行情；其展示数据不读取到后台计算 GEX/EHG。",
    docsUrl: "https://www.tradingview.com/charting-library-docs/latest/connecting_data/datafeed-api/",
  },
] as const;

function updateProvider(
  providers: ProviderStatus[],
  id: string,
  update: Partial<ProviderStatus>,
) {
  const provider = providers.find((item) => item.id === id);
  if (provider) Object.assign(provider, update);
}

export function createProviderRegistry(
  flags: ProviderRuntimeFlags = {},
): ProviderRegistryResponse {
  const feedMode = flags.feedMode ?? "disabled";
  const publicDisplay = flags.publicDisplay === true;
  const derivedAnalytics = flags.derivedAnalytics === true;
  const rawRedistribution = flags.rawRedistribution === true;
  const fullPublicAccess =
    feedMode !== "disabled" && publicDisplay && derivedAnalytics && rawRedistribution;
  const providers = PROVIDER_CATALOG.map((item) => ({ ...item }));

  if (flags.massiveCredentials && fullPublicAccess) {
    updateProvider(providers, "massive", {
      runtimeState: "ready",
      statusLabel: `${feedMode === "realtime" ? "实时" : "延迟"}授权已启用`,
      configured: true,
    });
  }
  if (flags.nasdaqCredentials) {
    updateProvider(providers, "nasdaq-smart-options", {
      runtimeState: "adapter-pending",
      statusLabel: fullPublicAccess ? "凭据就绪 · 适配待完成" : "凭据存在 · 权限未确认",
      configured: true,
    });
  }
  if (flags.cboeGateway) {
    updateProvider(providers, "cboe-cgif", {
      runtimeState: "adapter-pending",
      statusLabel: publicDisplay ? "网关就绪 · 适配待完成" : "网关存在 · 展示权未确认",
      configured: true,
    });
  }
  if (flags.occDailyOi) {
    updateProvider(providers, "occ-daily-oi", {
      runtimeState: "adapter-pending",
      statusLabel: "批次源已启用 · 适配待完成",
      configured: true,
    });
  }
  if (flags.bloombergGateway) {
    updateProvider(providers, "bloomberg-enterprise", {
      runtimeState: "adapter-pending",
      statusLabel: fullPublicAccess ? "网关就绪 · 适配待完成" : "网关存在 · 权限未确认",
      configured: true,
    });
  }

  return {
    schemaVersion: PROVIDER_REGISTRY_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    policy: {
      htmlScraping: false,
      portalAveraging: false,
      crossCheck: "same-timestamp-only",
      rawChainDefault: "disabled",
    },
    access: {
      feedMode,
      publicDisplay,
      derivedAnalytics,
      rawRedistribution,
    },
    providers,
  };
}
