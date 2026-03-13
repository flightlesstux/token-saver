# token-saver

> MCP plugin that alerts you when Claude API token usage is wasteful. Fires warnings, errors, and alerts on large outputs, verbose logs, and repetitive history. Auto-suppresses noise to keep your context lean.

[![CI](https://github.com/flightlesstux/token-saver/actions/workflows/ci.yml/badge.svg)](https://github.com/flightlesstux/token-saver/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/token-saver-mcp)](https://www.npmjs.com/package/token-saver-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org)

---

## Overview

In agentic coding sessions, Claude API responses often contain massive log outputs, repeated tool results, or near-duplicate history entries — all of which are re-sent on every turn, burning tokens. token-saver monitors every output and tells you when something is wasteful, so you can suppress it before it poisons your context window.

**Core value proposition**: Most token waste in long Claude sessions comes from outputs nobody actually reads — stack traces, verbose logs, repeated file contents. token-saver catches these early and tells you exactly why and how much you're wasting.

---

## How it works

```
Your Claude API output
        │
        ▼
  check_output          ← estimates tokens, detects log/noise patterns
        │
        ▼
  alert level           ← info / warning / error / alert
        │
        ▼
  shouldSuppress        ← true if output matches suppression criteria
        │
        ▼
  get_session_stats     ← cumulative waste report for the session
```

---

## Installation

### npm (global)

```bash
npm install -g token-saver-mcp
```

### Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "token-saver-mcp": {
      "command": "token-saver-mcp"
    }
  }
}
```

### Other MCP clients (Cursor, Windsurf, Zed, Continue.dev)

```json
{
  "mcpServers": {
    "token-saver-mcp": {
      "command": "token-saver-mcp"
    }
  }
}
```

---

## Tools

| Tool | Description |
|------|-------------|
| `check_output` | Analyze a text output. Returns alert level, token count, suppression flag, and detected patterns. |
| `get_session_stats` | Cumulative session statistics: tokens analyzed, suppressed, saved, and alert counts. |
| `reset_session_stats` | Reset session statistics to zero. |
| `analyze_history` | Scan a messages array for near-duplicates and ignored log outputs. Returns suggested truncation and savings estimate. |
| `set_thresholds` | Override warning/error/alert token thresholds and suppression flags for the current session. |

---

## Alert levels

| Level | Trigger |
|-------|---------|
| `info` | Output is within normal bounds (<1000 tokens, no noise patterns) |
| `warning` | Output exceeds 1000 tokens OR matches log/noise patterns |
| `error` | Output exceeds 5000 tokens |
| `alert` | Output exceeds 10000 tokens OR repetitive ignored messages exceed inactivity threshold |

---

## Configuration

Optional `.token-saver.json` in your project root:

```json
{
  "warningThresholdTokens": 1000,
  "errorThresholdTokens": 5000,
  "alertThresholdTokens": 10000,
  "suppressLogs": true,
  "suppressRepetitiveHistory": true,
  "logPatterns": [
    "\\[INFO\\]", "\\[DEBUG\\]", "\\[TRACE\\]"
  ],
  "inactivityTurnsBeforeAlert": 3
}
```

All fields are optional — defaults work well for most projects.

---

## Requirements

- Node.js >= 24
- Any MCP-compatible AI client

---

## Contributing

Contributions are welcome — new detection heuristics, better suppression logic, benchmark improvements, and docs.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR. All commits must follow [Conventional Commits](https://www.conventionalcommits.org). The CI pipeline enforces typechecking, linting, testing, and coverage on every PR.

---

## License

[MIT](LICENSE) — [flightlesstux.github.io/token-saver](https://flightlesstux.github.io/token-saver/)
