# 状态跃迁、战略资产与转型估值（Transition / Strategic Asset Valuation）

## 1. 何时触发
若公司出现以下一项或多项，完整深研必须评估是否切换到`transition`分支，而不是默认单一路径DCF：
- 当前EPS/FCF明显低于历史或预期成熟状态；
- Growth CapEx异常高、关键资产仍在建设；
- 重大重组、分拆、并购、业务模式重构；
- 战略投资、大额股权融资、政府/合作方资本共同承担项目；
- 新业务尚未贡献稳定利润却可能改变集团经济结构；
- 当前DCF与市价、战略投资价、增发价、内部人现金买入价等真实交易锚严重冲突。

公司可同时是成熟业务+transition业务；不要因触发transition就抹掉原有现金牛。

## 2. 先分类再估值
企业类型至少标识：`mature_compounder / high_growth_profitable / cyclical / early_commercialization / transition_strategic_asset / mixed`。混合型公司可以对分部使用不同估值模型。

## 3. Transition公司强制六层分析
1. **Current Operations / Base Business**：现有成熟业务的正常化盈利或现金价值。
2. **SOTP**：产品、制造、云、封装、项目、非经营资产等分别估值；内部交易先抵销。
3. **Normalized Earnings Power**：进入合理利用率/成熟结构后的收入、利润率、税、利息、股数桥接；不得凭空填“未来EPS”。
4. **Growth vs Maintenance CapEx**：拆分建设性投入与维持性投入；不能把当前建设高峰永久外推，也不能假设全部Growth CapEx都会消失。
5. **State Tree**：失败/部分成功/战略成功分别建财务和资本路径；没有可校准概率时只写权重方向和里程碑，不强行30/50/20。
6. **Transaction Anchors + Reverse Valuation**：解释真实资本交易与当前市价分别在押什么。

## 4. 利用率/产能经济
制造、数据中心、能源、网络等固定成本高的业务，需要尽可能建立：
`capacity × utilization × unit price − variable cost − fixed cost − depreciation ≈ operating profit`。
可用指标按行业选择：wafer starts、yield、fab utilization、MW delivered/energized、rack/GPU utilization、产能良率、客户mix等。数据缺失就标limited，不用收入CAGR替代全部产能经济。

## 5. Real Option / 战略资产
已经建设但尚未充分利用的资产，可能具有“未来需求出现时可承接”的实物期权价值。处理规则：
- 不能因当前FCF低就自动把战略资产价值设为0；
- 也不能因TAM大就把成功价值100%计入；
- 价值来自可验证的资产、许可、客户认证、扩展权和成功状态现金流；
- 与State Tree结合，避免和SOTP/DCF重复计值。

## 6. Transaction Anchor证据层级
交易锚是证据，不是硬底。记录交易日、规模、主体、是否现金购买、锁定/控制权、信息优势、是否附战略义务。

建议层级（不是数学权重）：
1. 二级市场价格/普通目标价：背景；
2. 13F等滞后持仓：弱到中；
3. 内部人公开市场现金买入：较强利益一致性证据；
4. 战略投资/定向增发：较强资本验证，但可能有战略附加价值；
5. 大规模公开股权融资成功定价：重要市场承接锚；
6. 并购/控制权报价：包含控制权溢价与协同，不直接等同少数股公允价。

## 7. Model Conflict Review（强制）
当DCF/单一路径估值与市价或高质量交易锚差异巨大（例如约50%以上，或研究者认为足以改变结论）时，必须暂停“高估/低估”断言并复核：
- 现金/债务/少数权益/可转债/受限资产桥接是否漏项或双扣；
- Growth CapEx是否被永久化，Maintenance CapEx是否被低估；
- 是否漏掉SOTP或战略资产；
- 转型是否可能造成利润/利用率非线性跃迁；
- 融资是否改变项目成功概率/时间，而不只是增加现金；
- 市场是否在交易更远的Normalized Earnings而非FY1；
- 真实交易是否含控制权/战略权利，不能直接当普通股底线。

冲突复核后允许保留多个模型，**不取简单平均**；输出差异来自哪条经济假设。

## 8. Milestone Tracker与主要矛盾迁移
转型研究必须按阶段更新：`技术验证 → 客户验证 → 量产/上线 → 利用率 → 单位经济 → 资本回报`。某阶段解决后，主要矛盾必须迁移到下一阶段，不能永远重复旧牛/熊论点。

| 里程碑 | 状态（未验证/初步/商业/规模） | 原始证据 | 对哪个State有利 | 对模型变量影响 | 下一验证 |
|---|---|---|---|---|---|

## 9. 与拥挤度模块的关系
转型公司经常出现two-sided crowding。交易锚、SOTP和State Tree属于价值证据；SI/借券/期权拥挤属于路径风险。二者不可混用。里程碑可作为squeeze/unwind的Trigger，但不能因为出现轧空就上调长期成熟利润率。
