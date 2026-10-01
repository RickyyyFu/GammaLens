# China A-Share Equity Research Skill

[简体中文](./README.zh-CN.md)

A self-contained equity-research workflow adapted for mainland China A-shares.

It keeps the same core framework as the U.S. skill, but adds local accounting, disclosure, ownership, financing and trading-system checks.

## A-share-specific checks

- attributable net profit vs recurring attributable net profit
- earnings preview → express report → formal report
- analyst-estimate coverage quality
- unlocks, major-shareholder selling, share pledges, placements and convertibles
- T+1, price limits, suspensions, ST/risk-warning constraints
- turnover rate, free float and shareholder structure
- PB–ROE and industry-specific valuation for financials and mature SOEs
- policy transmission to orders, revenue, profit and cash flow

## Typical uses

> Screen A-shares for 12–24 month opportunities. Check recurring profit, earnings previews, estimate coverage, unlock/sell-down risk, turnover/free-float structure, valuation and policy-to-profit transmission.

## Install

Copy the whole directory to a supported skills path, for example:

~~~text
~/.agents/skills/cn-a-share-equity-research/
~~~

or:

~~~text
~/.claude/skills/cn-a-share-equity-research/
~~~

## Important boundary

Market rules can change. Before execution, verify current exchange rules for price limits, lot size, ST treatment, settlement, suspension and other trading constraints. The skill is a research workflow, not a brokerage or order-routing system.
