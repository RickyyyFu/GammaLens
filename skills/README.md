# Equity Research Skills

English | [简体中文](./README.zh-CN.md)

This directory contains two self-contained Agent Skills for repeatable equity research and stock screening:

- **us-equity-research** — U.S. equities
- **cn-a-share-equity-research** — China A-shares

They share the same research core but use different market adapters. The goal is not to output a permanent stock list. The goal is to turn changing evidence into a disciplined workflow:

**data integrity → key contradiction → industry profit pool → company economics → earnings path → valuation → catalysts → technical/execution state → portfolio risk → falsification and review**

## Repository layout

- skills/us-equity-research/SKILL.md — U.S. market skill
- skills/cn-a-share-equity-research/SKILL.md — China A-share skill
- skills/CHANGELOG.md — version history

Each skill is intentionally self-contained so it can be copied into a local skills directory without depending on sibling files.

## What the two skills share

Both skills enforce the same core principles:

1. Separate disclosed facts, management guidance, consensus estimates, model assumptions, inference, and unknowns.
2. Identify the 1–3 variables that matter most to per-share value over the next 6–24 months.
3. Distinguish a good industry, a good company, a good price, and a good entry point.
4. Use Forward P/E, PEG, cash-flow valuation, and reverse valuation with the correct denominator and period.
5. Normalize cyclicals instead of treating peak earnings as permanent.
6. Treat research candidates, buyable candidates, and core holdings as different states.
7. Keep technical execution, portfolio sizing, and options risk separate from fundamental valuation.
8. Record invalidation conditions so the thesis can be tested instead of defended indefinitely.

## Market-specific adapters

### U.S. equities

The U.S. skill adds rules for:

- SEC/IR source hierarchy
- GAAP vs non-GAAP reconciliation
- fiscal-year vs calendar-year EPS
- buyback authorization vs executed repurchases
- 13F/Form 4 and disclosure-lag interpretation
- options, GEX, and pre-market/after-hours execution boundaries

### China A-shares

The A-share skill adds rules for:

- attributable net profit vs recurring attributable net profit
- earnings previews, earnings express reports, and formal reports
- analyst coverage quality for forward earnings estimates
- lock-up expirations, insider/major-shareholder selling, pledges, placements, convertibles, and refinancing
- T+1, price limits, suspensions, ST/risk-warning securities, and execution failure
- turnover rate, free float, shareholder structure, and share-count changes
- PB–ROE and sector-specific valuation for banks, insurers, brokers, and SOEs
- policy → orders → revenue → profit transmission rather than policy-label investing

## Installation

For Codex-style local skills, copy one directory into a supported skills folder, for example:

~~~text
~/.agents/skills/us-equity-research/SKILL.md
~/.agents/skills/cn-a-share-equity-research/SKILL.md
~~~

For Claude Code, a common layout is:

~~~text
~/.claude/skills/us-equity-research/SKILL.md
~/.claude/skills/cn-a-share-equity-research/SKILL.md
~~~

Host paths and invocation syntax can change. Verify against the current host documentation.

## Suggested prompts

U.S. screen:

> Use us-equity-research to screen the current U.S. market across sectors. Use one data cutoff, separate research candidates from buyable candidates, and explain what would invalidate each thesis.

A-share screen:

> Use cn-a-share-equity-research to screen A-shares. Check recurring profit, earnings previews, analyst estimate coverage, unlock/sell-down risk, turnover/free-float structure, valuation, and policy-to-profit transmission.

## Versioning and maintenance

- Use semantic versioning for each skill.
- Behavior changes require a version bump and CHANGELOG entry.
- Prefer one methodology change per pull request.
- When a shared research rule changes, explicitly review whether both market skills should change.
- Do not silently change screening thresholds after seeing outcomes.
- Do not delete failed historical predictions when evaluating the method.
- Before a release, re-check links, examples, accounting definitions, and market-rule assumptions.

## Boundaries

These skills are research workflows, not brokerage integrations, automated trading systems, or return guarantees. They do not create real-time data access, broker permissions, personal suitability, or tax/legal advice. A calculation can be correct while the input assumptions are wrong; both must be audited separately.
