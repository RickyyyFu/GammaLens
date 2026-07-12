# GammaLens

GammaLens 是一个开放访问、可审计的美股期权结构研究终端。它包含 22 个页面，覆盖单标的工作台、OI GEX / DEX、IV 期限结构、到期墙、SPX 工作区、有效 Gamma 方法说明、风险预算与本地复盘。

本项目借鉴同类量化终端的公开信息架构，但不复制第三方品牌、文案、页面代码、数据或私有算法。

## 数据原则

- 默认不生成任何合成价格、合成 OI、合成 Greeks 或伪实时戳。
- 未配置数据源时，`/api/market` 返回 `503 DATA_PROVIDER_NOT_CONFIGURED`，界面显示“不可计算”。
- `observedAt`、`fetchedAt`、报价时间和 OI 批次分开保存；未知时间保持 `null`。
- 链被截断或存在阻断级质量问题时，全局 Gamma 指标停止计算。
- OI GEX 使用 Call 正、Put 负的展示约定，不代表做市商真实账本。
- 真正的 Effective Hedging Gamma 需要带方向订单流、客户类型归因、归因覆盖率和对冲倾向；标准 OPRA 快照本身不足以计算。

## 页面

网站提供 22 个模块：

- 每日工作台：期权异动、SPX 日内剧本
- SPX 分析：策略构建器、市场结构图、IV、DEX、条件模型、动量、预警
- 量化分析：标的工作台、订单参考、GEX、动量、价格×时间、IV 雷达、市场地形、有效 Gamma、到期墙、历史数据
- 研究与记录：事件与新闻、复盘历史、研究助手

部分模块需要历史行情、新闻或订单流授权。数据未接入时页面仍可访问，但不会显示虚构结果。

## 本地运行

要求 Node.js 22.13+ 与 pnpm。

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm dev
```

如需真实期权快照，在 `.dev.vars` 中填写服务端密钥：

```text
MASSIVE_API_KEY=your_key_here
```

密钥只供服务端 Worker 使用，不会发送到浏览器。

```bash
pnpm test
pnpm run lint
```

## 实时数据与公开展示

Massive 的期权快照可返回 IV、Greeks、报价和上一交易日 OI；数据是否实时取决于订阅套餐。公开网站展示实时 OPRA 数据还需要与用途相符的商业/展示/再分发授权。不要把个人套餐密钥部署到公开再分发服务。

## 风险说明

GammaLens 是研究基础设施，不连接券商，不执行订单，也不构成投资建议。结构指标描述的是条件敏感度，不是价格方向、胜率或收益保证。

