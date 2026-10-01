---
name: single-stock-deep-research
description: "当用户给定一个公司/股票代码或明确小清单时，逐家完整研究主要矛盾、五年财务、护城河、估值、状态跃迁/战略资产、催化、Positioning/Crowding/Squeeze、技术与条件式操作。默认不扫描市场、不做买入排名。"
compatibility: "中文Markdown；真实财报、行情、Short Interest、借券和期权依赖宿主已授权来源。无券商连接、自动交易或后台服务。"
metadata:
  version: "3.3.0"
  shared_rules_version: "1.1.0"
  language: "zh-CN"
  updated: "2026-10-02"
---

# 单标的深度研究 v3.3.0

## 默认任务
只给代码即执行完整研究；明确小清单则按输入顺序逐家独立报告，不排名。同行只用于比较。

## 企业类型路由
先判定`mature_compounder / high_growth_profitable / cyclical / early_commercialization / transition_strategic_asset / mixed`。若存在大额Growth CapEx、战略融资/投资、资产利用率跃迁、重组或DCF与真实交易锚严重冲突，加载`references/04b-transition-strategic-asset.md`，单一路径DCF不得作为唯一中心估值。

## 完整研究必读
`01-data-integrity` → `02-mao-research` → `03-financials-moat` → `04-valuation` →（适用时`04b-transition`）→ `05-events` → `06-positioning-crowding` → `07-technical` → `10-industry`。
期权/真实持仓明确请求时再读`08-risk-options`。

## Positioning强制交付
完整报告必须在催化之后、技术之前加入拥挤度维度：Short crowding、Long crowding、Borrow stress、Float/liquidity、13F/ETF代理、Options amplification、供给事件、Catalyst proximity、Squeeze/Unwind stage、Trigger与Invalidation。缺数据写UNKNOWN/LIMITED。

## 关键禁区
- Short Interest与daily short volume绝不混用；高SI不等于正在轧空。
- 13F不代表实时净敞口；GEX不代表dealer真实账本；Call OI不证明新开看多。
- 拥挤度只改变路径风险、波动、事件管理与执行条件，不自动改DCF/长期利润率。
- Transition公司的真实融资价/内部人买入/战略投资是交易锚，不是硬底；DCF冲突时必须Model Conflict Review。
- 期权1−Delta不是亏损概率；提前退出按价格×时间×IV，不套到期内在价值。

## 输出结构
使用`assets/report-template.md`的0—13节及7A/8A扩展；第一屏和末尾给当前价/时点、预测日、三情景、主要矛盾、Transition状态（如有）、Crowding状态、技术状态、行动条件和最强反证。
