---
name: us-equity-screening
description: "当用户要求在明确市场/行业/主题/股票池中寻找研究候选时使用。先审计覆盖，再按经营、估值、催化和Positioning/Crowding风险筛选；输出候选与排除原因，不做完整单标的深研，不因高Short Interest单独排名。"
compatibility: "中文Markdown；真实行情、Short Interest、借券、期权与财务依赖宿主已授权来源。无券商连接、自动交易或后台服务。"
metadata:
  version: "2.1.0"
  shared_rules_version: "1.1.0"
  language: "zh-CN"
  updated: "2026-10-02"
---

# 美股选股与机会筛选 v2.1.0

研究方法与条件模型，非个性化投资建议。完整单公司研究交给`single-stock-deep-research`；本包不自动运行另一包。

## 必读
完整筛选至少读取：`references/01-data-integrity.md`、`02-opportunity-screening.md`、`04-valuation.md`、`05-events.md`、`06-positioning-crowding.md`、`07-technical-overlay.md`、`10-industry.md`及配置/候选卡。

## 核心纪律
- 先审计数据覆盖，不把网页线索伪装成全市场扫描。
- 公司质量、估值和催化优先；**拥挤度是路径风险覆盖层，不是买入排名器。**
- 高SI只是Fuel，必须有Trigger/价格确认才称活动性轧空；short volume绝不当SI。
- 多头拥挤也必须检查：高预期、ETF/13F代理、期权/趋势反馈、增发/解禁等可能造成多杀多。
- 13F滞后且不含完整对冲；GEX是模型，不是dealer账本；缺数据写unknown。
- 输出候选通常3—8个，可更少或为空；只在可比输入上做研究优先级，不把上涨概率伪装成分数。

## 输出
每个候选使用`assets/candidate-card.md`并附`assets/positioning-risk-card.md`；明确数据日期、coverage、squeeze/unwind触发与失效、主预测日期（如输入足够）和深研交接行。
