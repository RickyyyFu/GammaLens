# 持仓拥挤度、做空结构与强制平仓风险

## 1. 定位
本模块研究**仓位如何放大价格路径**，不是新的基本面估值模型。拥挤度可以改变波动、路径、事件风险和执行条件，但**不会因为Short Interest高就自动提高内在价值，也不会因为多头拥挤就自动降低DCF**。

必须同时回答两类问题：
- **Short squeeze / 轧空风险**：空头是否拥挤、回补是否困难、是否已有点火催化与价格确认。
- **Long unwind / 多杀多风险**：多头是否高度同质化、浮盈/杠杆/期权/趋势仓是否可能在负面或“不够好”的催化下被迫撤退。

允许状态：`low_crowding / short_crowded / long_crowded / two_sided_crowded / squeeze_fuel_only / squeeze_trigger_confirmed / squeeze_feedback_loop / unwind_risk_rising / unwind_underway / data_insufficient`。状态不是买卖评级。

## 2. 数据字段与时点
有数据才填写，没有就`UNKNOWN`或`LIMITED`，不得用模型记忆补数。

| 类别 | 字段 | 时点要求 / 解释 |
|---|---|---|
| Short Interest | shares short、SI % float、settlement date | SI是结算日库存，不是实时流量 |
| 回补难度 | Days to Cover、ADV窗口 | `DTC = shares short / average daily volume`，必须写成交量窗口 |
| 借券 | borrow fee/CTB、utilization、shares available | 写数据商、时点和可借股定义；不同数据商不可直接拼接 |
| Float | free float、锁定/限售/内部人股份 | float定义必须来源一致；总股本不等于可交易float |
| 所有权 | 13F/机构持股、ETF/被动持股、集中度 | 13F滞后且不含完整对冲，不代表实时净多头 |
| 期权 | OI by strike/expiry、volume、IV、skew、put/call | OI是上一结算统计；成交量不能自动视为开仓 |
| 供给事件 | 增发、ATM、锁定期/解禁、可转债、内部人买卖 | 记录公告、定价、生效/解禁日期和潜在新增股数 |
| 催化 | 财报、合同、监管、并购、产品节点 | 催化必须有可核验日期/阶段；传闻单列 |

### 强制区分：Short Interest vs Short Volume
- **Short Interest**：某个结算日仍未平仓的做空余额。
- **Daily Short-Sale Volume**：当日被标记为short sale的成交量，可能包含做市、对冲、日内平仓等。
- **绝不允许**把“当日short volume占比55%”写成“55%的float被做空”，也不能从short volume直接推算SI。

### 13F限制
13F有披露滞后，只覆盖规定证券与多头等披露项目，不能看到完整空头、掉期、期权对冲或当日变化。13F集中度只能作为拥挤代理，不得写成“机构现在都在买/卖”。

## 3. Short squeeze三阶段
### Stage 1 — Fuel（燃料）
可能出现：SI % float高、DTC高、CTB上升、utilization高、可借股减少、float偏紧。

**仅有Fuel不得称“正在轧空”。**合格表述：`具备轧空燃料，尚未触发`。

### Stage 2 — Trigger（点火）
至少需要可核验催化或价格确认，例如：
- 财报/指引/合同/监管/并购等正面新增事实；
- 突破并保持关键结构、相对强弱显著改善；
- 借券压力与价格上行同时恶化空头处境。

触发必须写具体证据和时点。高SI本身不是Trigger。

### Stage 3 — Feedback Loop（反馈）
`价格上涨 → 空头损失/风控压力 → 回补买盘 → 价格进一步上涨`。
若期权结构支持，dealer hedge可能放大路径，但只有在明确的仓位方向假设下才能写“可能”。

出现高成交量、Call交易或上涨并不能证明回补已经发生；没有实时借券/持仓数据时，写`possible feedback`而不是事实断言。

## 4. Long unwind / 多杀多
Long crowding关注的是**同向持仓与高预期的脆弱性**，不是“好公司不能跌”。典型链条：
`高预期/高浮盈/同质化多头 → 催化不够好或宏观冲击 → 价格跌破结构 → 趋势/风险预算/期权Delta反馈 → 被动卖出进一步放大`。

观察维度：
- 价格相对MA/ATR/历史分布是否过度延伸；
- 一致预期是否极度乐观，财报需要“远超预期”才能满足市场；
- 机构/ETF/主题基金持仓是否高度重叠（仅作滞后代理）；
- 短期限Call/OI是否集中，若上涨停滞，Delta/Vanna/Gamma变化是否可能放大回撤；
- 杠杆/融资/可转债/事件前仓位是否可能造成强制去风险；
- 增发、解禁、内部人出售等新增供给是否与多头拥挤叠加。

状态：`long_crowded`不等于马上卖；`unwind_risk_rising`需要负面/不足催化或价格结构恶化；`unwind_underway`需要价格/流动性/仓位证据共同支持。

## 5. Two-sided crowding
转型、事件、高空头且高期权活跃的股票可能同时存在强多头和强空头。此时标记`two_sided_crowded`，预期应是**波动与路径风险高**，而不是强行决定方向。

至少写：
- 多头在押什么；空头在押什么；
- 哪个催化可能迫使哪一边先撤退；
- 哪些里程碑会让拥挤结构缓和或反转。

## 6. 期权/GEX纪律
- GEX基于Gamma、OI、乘数及dealer净仓方向假设，**不是已观察到的dealer账本**。
- Call Wall、Put Wall、Gamma Flip不是必守价格。
- ask侧成交不证明新开多头Call；可能是平仓、价差腿、做市或对冲。
- 0DTE成交会使前一晚OI很快失真；成交量不能替代OI。
- 期权拥挤只进入路径/波动情景和执行条件；没有依据不赋客观概率。

## 7. 对估值与操作的影响
### 不自动改变内在价值
除非拥挤对应的信息本身改变基本面（例如融资条件、增发、信用收缩），否则SI/Call OI/13F不会直接进入DCF现金流。

### 可以改变
- 事件前后允许的仓位与持有期限；
- 需要的确认强度、止损/跳空预案、是否等待回踩；
- 期权IV/路径敏感性与情景宽度；
- 目标价附近的路径风险和可实现性；
- 财报“好但不够好”时的多杀多风险，或正面催化时的轧空放大。

## 8. Positioning Risk Card
每次完整使用本模块时输出：

| 字段 | 结论 | 数据时点/来源 | 置信度/缺口 |
|---|---|---|---|
| Short crowding | low/medium/high/unknown（描述性，不作买卖评分） | | |
| Long crowding | low/medium/high/unknown | | |
| Borrow stress | fee/utilization/available shares或unknown | | |
| Float / liquidity | float、ADV、锁定/解禁 | | |
| Institutional / passive crowding | 13F/ETF代理及披露滞后 | | |
| Options amplification | OI/IV/GEX假设或unknown | | |
| Catalyst proximity | 事件、日期、证据等级 | | |
| Squeeze stage | fuel/trigger/feedback/none/unknown | | |
| Long-unwind stage | normal/risk_rising/underway/unknown | | |
| Trigger | 什么出现才升级 | | |
| Invalidation | 什么出现撤销拥挤判断 | | |

## 9. 强制禁区
1. 高SI ≠ 必然轧空；低SI ≠ 没有上涨空间。
2. Short volume ≠ Short interest。
3. 13F ≠ 实时净仓位。
4. GEX ≠ dealer真实账本。
5. Call OI大 ≠ 一定存在正Gamma买盘。
6. 多杀多是风险路径，不得无证据声称某基金/机构正在被迫卖出。
7. 拥挤度不是基本面替代品，也不允许成为单独的候选排名依据。
