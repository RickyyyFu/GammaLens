# U.S. Equity Screening · v2.1.0

[中文 README](./README.md)

This skill is for screening an explicit market, sector, theme, or stock universe for **research candidates**. It audits coverage first, then compares operating evidence, valuation, catalysts, technical context and Positioning/Crowding risk.

It does **not** produce the full single-company 0–13 section report. Hand complete company research to `single-stock-deep-research`.

## v2.1.0 highlights

- Adds Short squeeze and Long unwind / crowded-long analysis.
- Strictly separates Short Interest from daily Short Volume.
- Uses Fuel → Trigger → Feedback for squeeze analysis.
- Treats 13F as delayed ownership evidence and GEX as a model assumption.
- Allows UNKNOWN/LIMITED when borrow, SI, float or options data are unavailable.
- Crowding may change path risk and execution, but cannot independently rank a candidate above a stronger business/valuation thesis.

Copy the entire directory when installing; the references and assets are part of the skill contract.
