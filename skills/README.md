# Equity Research Skills

English | [简体中文](./README.zh-CN.md)

This directory maintains two versioned research skills:

- **us-equity-screening v2.1.0** — market / sector / theme / explicit-universe opportunity screening.
- **single-stock-deep-research v3.3.0** — full single-name research for a company, ticker, or a small explicit list.

They share the same evidence discipline but have different responsibilities. The screening skill finds and prioritizes research candidates; the deep-research skill does not scan the market or rank stocks, and instead produces a complete company thesis.

## Current versions

| Skill | Version | Primary job |
|---|---:|---|
| us-equity-screening | 2.1.0 | Candidate discovery, coverage audit, valuation/catalyst screen, positioning & crowding overlay |
| single-stock-deep-research | 3.3.0 | Full company research, valuation, transition/strategic-asset branch, positioning/crowding, technical & conditional execution |

## What changed in the latest release

Both skills now include a **Positioning / Crowding / Squeeze** layer:
- Short Interest is strictly separated from daily short-sale volume.
- High short interest is treated as **Fuel**, not proof that a squeeze is active.
- Squeeze analysis uses **Fuel → Trigger → Feedback**.
- Long crowding, long-unwind (“多杀多”), and two-sided crowding are explicitly evaluated.
- 13F is treated as a delayed proxy, not a real-time net-position ledger.
- GEX is a model, not an observed dealer book.
- Missing borrow/SI/OI inputs must remain UNKNOWN/LIMITED.

The deep-research skill also includes the transition/strategic-asset branch for companies such as large-capex restructurings and state-transition stories: SOTP, Growth vs Maintenance CapEx, utilization, normalized earnings, state tree, real options, transaction anchors, model-conflict review, and milestone tracking.

## Layout

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

## Installation

Copy the **whole skill directory**, not only SKILL.md.

Example:

```text
~/.agents/skills/us-equity-screening/
~/.agents/skills/single-stock-deep-research/
```

or for hosts that use a Claude-style folder:

```text
~/.claude/skills/us-equity-screening/
~/.claude/skills/single-stock-deep-research/
```

Host paths and invocation behavior can change; verify against the current host documentation.

## Maintenance rules

- Use semantic versioning.
- Any behavior-changing methodology update requires a version bump and CHANGELOG entry.
- Shared-rule changes should be reviewed in both skills.
- Do not silently optimize thresholds after seeing outcomes.
- Preserve failed historical forecasts when reviewing the method.
- Tests validate file/method contracts; they do **not** prove market alpha or future returns.

## Boundaries

These are research workflows, not brokerage connectors, automatic trading systems, or return guarantees. Real prices, filings, Short Interest, borrow data, options data and account state depend on the host’s authorized data sources.
