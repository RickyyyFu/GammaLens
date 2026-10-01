# 验证说明 · us-equity-screening v2.1.0

构建日期：2026-10-02。

## 已执行
- Python unittest合同测试：见`tests/test_contracts.py`，验证Short Interest/Short Volume区分、13F滞后、GEX假设、Fuel≠Trigger、two-sided crowding、long-unwind、缺失数据降级，以及产品职责边界。
- `scripts/validate_bundle.py`检查必需文件、版本、内部关键字和ZIP前目录结构。
- SHA256清单用于构建一致性。

## 未验证
- 未在用户设备/Codex/Claude等宿主安装并做模型行为验收。
- 未连接实时Short Interest、证券借贷、期权、券商或账户。
- 未证明任何拥挤度信号、技术指标或估值模型具有超额收益。
- GEX/借券/13F等来源若不可用，正式研究必须降级为UNKNOWN/LIMITED。
