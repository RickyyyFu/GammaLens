# U.S. Equity Research Skill

[简体中文](./README.zh-CN.md)

A self-contained research workflow for U.S. equities. It supports market screening, single-name deep dives, earnings/news verification, valuation, technical execution, portfolio risk and options analysis.

## Core idea

Do not confuse:

- a good industry
- a good company
- a good price
- a good entry point

The skill forces the analysis to move from evidence to a falsifiable thesis instead of from a ticker to a recommendation.

## Typical uses

- Cross-sector U.S. stock screening
- Forward P/E and PEG checks with fiscal-year labels
- Normalized valuation for memory, lithium, energy and other cyclicals
- Earnings previews and post-earnings updates
- 20/40-day trend execution as a separate strategy module
- Portfolio concentration review
- Options scenario/EV analysis when valid market inputs are supplied

## Install

Copy this directory to a supported local skills path, for example:

~~~text
~/.agents/skills/us-equity-research/
~~~

or:

~~~text
~/.claude/skills/us-equity-research/
~~~

Then invoke it with natural language, for example:

> Screen the current U.S. market across sectors. Use one data cutoff, separate research candidates from buyable candidates, and state what would invalidate each thesis.

## Important boundaries

The skill does not create market-data access, brokerage permissions, or automated trading. It does not treat PEG as an independent vote from P/E and earnings growth, does not use 1−Delta as loss probability, and does not assume a stop price is guaranteed execution.
