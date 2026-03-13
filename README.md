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
| `set_mode` | Switch mode: **off** (default, silent) · **monitor** (analyze only) · **active** (full suppression). Start here. |
| `check_output` | Analyze a text output. Returns alert level, token count, suppression flag, and detected patterns. |
| `analyze_history` | Scan a messages array for near-duplicates and ignored log outputs. Returns suggested truncation and savings estimate. |
| `get_session_stats` | Cumulative session statistics: tokens analyzed, suppressed, saved, and alert counts. |
| `reset_session_stats` | Reset session statistics to zero. |
| `set_thresholds` | Override warning/error/alert token thresholds and suppression flags for the current session. |

---

## Example usage

### 1. Enable the plugin (off by default)

```json
{ "name": "set_mode", "arguments": { "mode": "active" } }
```
```json
{ "mode": "active" }
```

### 2. Check a suspicious output

```json
{ "name": "check_output", "arguments": { "text": "[INFO] server started\n[DEBUG] connection ok\n[TRACE] request received\n..." } }
```
```json
{
  "alertLevel": "warning",
  "tokens": 87,
  "outputType": "log",
  "shouldSuppress": true,
  "reason": "Output matches log/noise patterns and will be suppressed",
  "detectedPatterns": [
    { "pattern": "\\[INFO\\]", "matchCount": 5, "description": "Log pattern matched 5 times" },
    { "pattern": "\\[DEBUG\\]", "matchCount": 5, "description": "Log pattern matched 5 times" }
  ]
}
```

### 3. Scan conversation history for waste

```json
{ "name": "analyze_history", "arguments": { "messages": [ ...your messages array... ] } }
```
```json
{
  "totalMessages": 6,
  "totalTokens": 114,
  "repetitiveMessages": [
    { "index": 2, "role": "user", "tokens": 19, "reason": "Near-duplicate of message 0" },
    { "index": 4, "role": "user", "tokens": 19, "reason": "Near-duplicate of message 0" }
  ],
  "suggestedTruncation": 2,
  "estimatedTokenSavings": 38,
  "alertLevel": "alert"
}
```

### 4. Session summary

```json
{ "name": "get_session_stats", "arguments": {} }
```
```json
{
  "turns": 5,
  "totalTokensAnalyzed": 1416,
  "totalTokensSuppressed": 201,
  "warningsFired": 2,
  "errorsFired": 0,
  "alertsFired": 1,
  "tokensSaved": 201
}
```

---

## Proof test output

Run `python3 test_live.py` to verify the full mode/suppression/history flow locally:

```
============================================================
TOKEN-SAVER PROOF TEST
============================================================

[1] Default mode (off) — all analysis skipped
  [check_output] mode=off skipped=true
  [PASS] mode=off correctly skips analysis

[2] Switch to monitor mode
  [PASS] mode switched to monitor

[3] Short normal output → info
  [check_output] level=info tokens=3 suppress=False
    reason: Output is within normal bounds
  [PASS] info level, no suppression

[4] Large output (>1000 tokens) → warning or higher
  [check_output] level=warning tokens=1125 suppress=False
    reason: Output exceeds warning threshold (1125 tokens >= 1000)
  [PASS] warning level fired at 1125 tokens

[5] Log output in monitor mode → detected, not suppressed
  [check_output] level=info tokens=87 suppress=False
    patterns: 3 matched
  [PASS] patterns detected, suppression=false (monitor mode)

[6] Switch to active mode
  [PASS] mode switched to active

[7] Log output in active mode → suppressed
  [check_output] level=warning tokens=87 suppress=True
    reason: Output matches log/noise patterns and will be suppressed
  [PASS] suppressed 87 log tokens

[8] Repetitive history → alert
  totalMessages=6 totalTokens=114
  repetitive=5 savings=95 level=alert
  [PASS] 95 tokens saveable from repetitive history

[9] Session stats
  turns=5 analyzed=1416 suppressed=201 warnings=2 alerts=1
  [PASS] 201 tokens suppressed this session

============================================================
PROOF SUMMARY
============================================================
  Tokens suppressed this session : 201
  Turns analyzed                 : 5
  Warnings fired                 : 2
  Alerts fired                   : 1

  Overall: ALL CHECKS PASSED
============================================================
```

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
