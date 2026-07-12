export type ModuleCategory = "daily" | "spx" | "quant" | "research";

export interface QuantModule {
  id: string;
  href: string;
  name: string;
  english: string;
  category: ModuleCategory;
  summary: string;
  outputs: string[];
  dataNeeds: string[];
  kind:
    | "directory"
    | "ticker"
    | "gamma"
    | "dex"
    | "iv"
    | "momentum"
    | "terrain"
    | "chain"
    | "spx"
    | "research"
    | "journal";
}

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  daily: "每日工作台",
  spx: "SPX 分析",
  quant: "量化分析",
  research: "研究与记录",
};

export const MODULES: QuantModule[] = [
  {
    id: "option-data",
    href: "/option-data",
    name: "期权异动",
    english: "Options Flow",
    category: "daily",
    summary: "按成交、价差、到期日与行权价检查异常期权活动。",
    outputs: ["成交量 / OI", "Bid-Ask 质量", "近 ATM 合约"],
    dataNeeds: ["OPRA 报价", "期权成交", "上一交易日 OI"],
    kind: "chain",
  },
  {
    id: "spx-playbook",
    href: "/spx-playbook",
    name: "SPX 日内剧本",
    english: "SPX Playbook",
    category: "daily",
    summary: "把关键波动区间、Gamma 结构和事件风险组织成条件式剧本。",
    outputs: ["关键位置", "条件分支", "失效条件"],
    dataNeeds: ["SPX 现货", "0DTE 期权链", "经济日历"],
    kind: "spx",
  },
  {
    id: "spx-strategy",
    href: "/spx-strategy",
    name: "SPX 策略构建器",
    english: "SPX Strategy",
    category: "spx",
    summary: "按预期波动、风险预算和期限筛选结构，不生成买卖建议。",
    outputs: ["风险边界", "最大权利金", "到期情景"],
    dataNeeds: ["SPX 链", "实时 NBBO", "Greeks"],
    kind: "spx",
  },
  {
    id: "market-plot",
    href: "/market-plot",
    name: "市场结构图",
    english: "Market Plot",
    category: "spx",
    summary: "在一个价格轴上叠加 Spot、墙位、预期波动和 Gamma 区域。",
    outputs: ["价格阶梯", "关键墙位", "波动带"],
    dataNeeds: ["标的价格", "完整期权链"],
    kind: "gamma",
  },
  {
    id: "spx-iv",
    href: "/spx-iv",
    name: "SPX 隐含波动率",
    english: "SPX IV",
    category: "spx",
    summary: "比较到期日、偏度和近 ATM 隐含波动率。",
    outputs: ["ATM IV", "期限结构", "Put / Call 偏度"],
    dataNeeds: ["SPX 全链 IV", "稳定的时间戳"],
    kind: "iv",
  },
  {
    id: "spx-dex",
    href: "/spx-dex",
    name: "SPX Delta 暴露",
    english: "SPX DEX",
    category: "spx",
    summary: "按行权价聚合公开 OI 的 Delta 名义敞口。",
    outputs: ["净 OI DEX", "行权价分布", "到期日切片"],
    dataNeeds: ["SPX OI", "Delta", "标的价格"],
    kind: "dex",
  },
  {
    id: "kevin-model",
    href: "/kevin-model",
    name: "条件模型",
    english: "Conditional Model",
    category: "spx",
    summary: "用透明条件组合趋势、波动和结构信息；不复刻第三方私有模型。",
    outputs: ["输入完整度", "条件评分", "反证清单"],
    dataNeeds: ["价格序列", "波动率", "期权结构"],
    kind: "spx",
  },
  {
    id: "momentum-spx",
    href: "/momentum/spx",
    name: "SPX 动量",
    english: "SPX Momentum",
    category: "spx",
    summary: "在多个时间窗检查价格趋势与结构是否同向。",
    outputs: ["多周期动量", "结构确认", "背离"],
    dataNeeds: ["分钟 / 日线历史价格", "成交量"],
    kind: "momentum",
  },
  {
    id: "alerts",
    href: "/alerts",
    name: "预警中心",
    english: "Alerts",
    category: "spx",
    summary: "把价格、Gamma、IV 和数据质量条件组合为浏览器本地规则。",
    outputs: ["本地规则", "触发条件", "数据健康"],
    dataNeeds: ["持续行情", "浏览器通知权限"],
    kind: "journal",
  },
  {
    id: "ticker",
    href: "/ticker/MU",
    name: "标的工作台",
    english: "Ticker Workspace",
    category: "quant",
    summary: "从原始链、数据血缘到暴露结构逐层检查单一标的。",
    outputs: ["Spot / 时间戳", "GEX / DEX", "期权链"],
    dataNeeds: ["股票行情", "完整期权快照"],
    kind: "ticker",
  },
  {
    id: "order-reference",
    href: "/order-reference",
    name: "订单参考",
    english: "Order Reference",
    category: "quant",
    summary: "计算权利金预算、盈亏平衡与仓位上限，记录但不执行订单。",
    outputs: ["风险预算", "合约上限", "盈亏平衡"],
    dataNeeds: ["用户输入", "可选 NBBO"],
    kind: "journal",
  },
  {
    id: "gex-plot",
    href: "/gex-plot",
    name: "GEX 结构图",
    english: "GEX Plot",
    category: "quant",
    summary: "按 Call 正、Put 负的展示约定聚合公开 OI Gamma。",
    outputs: ["净 OI GEX", "Call / Put 墙", "行权价分布"],
    dataNeeds: ["Gamma", "OI", "Spot"],
    kind: "gamma",
  },
  {
    id: "momentum",
    href: "/momentum",
    name: "动量雷达",
    english: "Momentum Radar",
    category: "quant",
    summary: "跨标的比较多周期价格动量；缺历史数据时不生成评分。",
    outputs: ["趋势一致性", "波动调整动量", "背离"],
    dataNeeds: ["分钟与日线历史价格"],
    kind: "momentum",
  },
  {
    id: "spot-time",
    href: "/spot-time",
    name: "价格 × 时间",
    english: "Spot × Time",
    category: "quant",
    summary: "检查现价、期权快照和 OI 批次是否属于可比较的时间窗口。",
    outputs: ["时间偏差", "报价年龄", "批次一致性"],
    dataNeeds: ["逐字段时间戳"],
    kind: "ticker",
  },
  {
    id: "iv-radar",
    href: "/iv-radar",
    name: "IV 雷达",
    english: "IV Radar",
    category: "quant",
    summary: "比较 ATM IV、到期结构和偏度，不用缺失值编造排名。",
    outputs: ["ATM IV", "期限斜率", "偏度"],
    dataNeeds: ["跨标的完整 IV 曲面"],
    kind: "iv",
  },
  {
    id: "market-terrain",
    href: "/market-terrain",
    name: "市场地形",
    english: "Market Terrain",
    category: "quant",
    summary: "用趋势、波动与 Gamma 三轴描述环境，而非预测方向。",
    outputs: ["结构象限", "风险状态", "缺失因子"],
    dataNeeds: ["历史价格", "IV", "Gamma 结构"],
    kind: "terrain",
  },
  {
    id: "effective-gamma",
    href: "/effective-gamma",
    name: "有效 Gamma 雷达",
    english: "Effective Gamma",
    category: "quant",
    summary: "区分可观察 OI GEX 与需要流向归因的有效对冲 Gamma。",
    outputs: ["可计算性", "归因覆盖率", "情景敏感度"],
    dataNeeds: ["带方向订单流", "客户类型推断", "对冲倾向"],
    kind: "gamma",
  },
  {
    id: "expiry-wall",
    href: "/expiry-wall",
    name: "到期墙",
    english: "Expiry Wall",
    category: "quant",
    summary: "按到期日比较 Call / Put OI 与 Gamma 集中位置。",
    outputs: ["到期日切片", "Call 墙", "Put 墙"],
    dataNeeds: ["完整期权链", "OI", "Gamma"],
    kind: "gamma",
  },
  {
    id: "historical-data",
    href: "/historical-data",
    name: "历史数据",
    english: "Historical Data",
    category: "quant",
    summary: "查看快照历史与模型输入；当前实时快照不会冒充历史序列。",
    outputs: ["时间序列", "快照对比", "导出"],
    dataNeeds: ["历史数据授权", "持久化数据库"],
    kind: "research",
  },
  {
    id: "news",
    href: "/news",
    name: "事件与新闻",
    english: "Events & News",
    category: "research",
    summary: "把公司事件与数据发布日期放在结构分析旁边。",
    outputs: ["事件时间", "来源链接", "影响窗口"],
    dataNeeds: ["授权新闻源", "公司事件日历"],
    kind: "research",
  },
  {
    id: "review-history",
    href: "/review-history",
    name: "复盘历史",
    english: "Review History",
    category: "research",
    summary: "在浏览器本地保存研究快照与事后复盘，不上传账户信息。",
    outputs: ["研究记录", "失效条件", "事后结果"],
    dataNeeds: ["浏览器本地存储"],
    kind: "journal",
  },
  {
    id: "moebius-intelligence",
    href: "/moebius-intelligence",
    name: "研究助手",
    english: "Research Assistant",
    category: "research",
    summary: "基于可引用数据生成研究清单；不复制第三方品牌或私有模型。",
    outputs: ["证据摘要", "反证", "待验证项"],
    dataNeeds: ["结构化行情", "授权文本源"],
    kind: "research",
  },
];

export function findModule(pathname: string): QuantModule | null {
  const clean = pathname.toLowerCase().replace(/\/$/, "") || "/";
  if (clean.startsWith("/ticker/")) return MODULES.find((item) => item.id === "ticker") ?? null;
  if (clean.startsWith("/effective-gamma/")) {
    return MODULES.find((item) => item.id === "effective-gamma") ?? null;
  }
  if (clean.startsWith("/momentum/")) {
    return MODULES.find((item) => item.id === "momentum-spx") ?? null;
  }
  return MODULES.find((item) => item.href.toLowerCase() === clean) ?? null;
}

