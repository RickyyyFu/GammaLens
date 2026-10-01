# 股票研究 Skills

[English](./README.md) | 简体中文

这里正式维护两套版本化 Skill：

- **us-equity-screening v2.1.0**：美股选股与机会筛选。
- **single-stock-deep-research v3.3.0**：单标的完整深度研究。

两套 Skill 共用数据核验、估值、风险与复盘纪律，但职责明确分开：**选股 Skill 负责找候选与研究优先级；深研 Skill 不扫描市场、不做买入排名，而是把给定公司研究到底。**

## 当前版本

| Skill | 版本 | 核心职责 |
|---|---:|---|
| us-equity-screening | 2.1.0 | 覆盖审计、候选发现、估值/催化筛选、Positioning/Crowding覆盖层 |
| single-stock-deep-research | 3.3.0 | 完整公司研究、估值、状态跃迁/战略资产、拥挤度、技术与条件式操作 |

## 最新升级

两个 Skill 都加入了 **Positioning / Crowding / Squeeze**：

- Short Interest 与 daily short-sale volume 严格分开。
- 高SI只是 **Fuel**，不是“正在轧空”的证据。
- Short squeeze 使用 **Fuel → Trigger → Feedback**。
- 同时检查 Long crowding、Long unwind / 多杀多、Two-sided crowding。
- 13F只作为滞后代理，不能当实时净仓位。
- GEX是模型，不是dealer真实账本。
- 缺borrow/SI/OI数据时必须标 UNKNOWN/LIMITED，不能编数字。

深研 v3.3.0 还包含状态跃迁/战略资产分支：SOTP、Growth/Maintenance CapEx、利用率、Normalized Earnings、State Tree、Real Option、Transaction Anchors、Model Conflict Review 与 Milestone Tracker。

## 目录

```text
skills/
  us-equity-screening/
    SKILL.md
    README.md
    README.en.md
    references/
    assets/
    scripts/
    tests/
  single-stock-deep-research/
    SKILL.md
    README.md
    README.en.md
    references/
    assets/
    scripts/
    tests/
  CHANGELOG.md
  README.md
  README.zh-CN.md
```

## 安装

必须复制**整个 Skill 目录**，不要只复制 SKILL.md。

例如：

```text
~/.agents/skills/us-equity-screening/
~/.agents/skills/single-stock-deep-research/
```

或部分宿主使用：

```text
~/.claude/skills/us-equity-screening/
~/.claude/skills/single-stock-deep-research/
```

宿主路径和调用方式可能更新，以当前宿主文档为准。

## GitHub维护规则

- 使用语义化版本号。
- 方法行为改变必须升版本并写CHANGELOG。
- 共用规则变化时同时复核两个Skill。
- 不允许看完结果后偷偷改阈值再宣称规则有效。
- 复盘必须保留失败预测，不能只保留成功案例。
- 测试通过只证明文件/方法契约满足，不证明策略有超额收益。

## 边界

这两套 Skill 是研究方法，不是券商连接、自动交易系统或收益保证。真实行情、财报、Short Interest、借券、期权和账户状态依赖宿主已有授权数据源。
