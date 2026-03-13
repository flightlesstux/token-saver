# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Version Source of Truth

**Always check the latest version from GitHub before referencing any version number.**

```bash
gh release list --limit 1
```

Never trust `package.json`, `marketplace.json`, `plugin.json`, or any hardcoded version string in the repo — always fetch the current release from GitHub and use that as the authoritative version.

## Project Overview

This is a Claude Code MCP plugin that monitors Claude API outputs and fires warnings/errors/alerts when token usage is wasteful. It analyzes outputs for noise patterns, estimates token counts, suppresses logs and repetitive history, and reports cumulative waste statistics.

**Core value proposition**: In agentic coding sessions, large log outputs, verbose tool results, and repetitive history entries are re-sent on every turn, burning tokens on content nobody reads. This plugin catches these early, fires alerts at configurable thresholds, and auto-suppresses noise to keep context lean.

## Engineering Mindset

All code in this repo follows [BEST_PRACTICES.md](BEST_PRACTICES.md). Read it before writing any code. Key rules that affect every file:
- stdout is the MCP wire — never `console.log()` in tool handlers, use `stderr`
- Every tool handler must catch all errors and return `{ isError: true, ... }` — never throw
- Every tool must define `outputSchema` — no schema, no merge
- The irony rule: a token-saver plugin that floods context has failed at its core mission — tool responses must be small and structured

## Cross-Platform Requirements

This plugin runs on **Linux, macOS, and Windows**. Every code path and every test must pass on all three. CI runs a 9-job matrix (3 OS × 3 Node versions).

### Rules — always follow these

| Topic | Wrong | Correct |
|---|---|---|
| Path construction | `dir + '/' + file` | `path.join(dir, file)` |
| Home directory | `~` or `process.env.HOME` | `os.homedir()` |
| Temp directory | `'/tmp'` | `os.tmpdir()` |
| Config path | hardcoded string | `path.join(os.homedir(), '.claude', 'settings.json')` |
| Line endings | `\r\n` | `\n` (`.gitattributes` enforces LF on all platforms) |
| Process signals | `SIGTERM` only | `SIGINT` + `SIGTERM` (`SIGTERM` is not available on Windows) |
| File permissions | `fs.chmod(...)` alone | guard with `if (process.platform !== 'win32')` |
| Shell commands | `sh -c ...` | avoid; use Node `fs`/`child_process` with `shell: true` only when necessary |

### Path utilities

All file path logic lives in `src/utils/paths.ts`. Never resolve paths inline — add a helper there and import it. This is the file the smoke-test job validates on each OS.

### Writing cross-platform tests

- Use `path.join` for any expected path strings in assertions
- For OS-specific behavior, use `if (process.platform === 'win32')` guards inside tests — do not skip tests entirely
- Fixture files use LF line endings; don't assert on `\r\n`

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **MCP framework**: `@modelcontextprotocol/sdk`
- **Build**: `tsc` → `dist/`
- **Test**: `vitest`
- **Package manager**: `npm`

## Commands

```bash
npm run build       # tsc compile → dist/
npm run dev         # tsx watch mode for development
npm run test        # vitest run
npm run test:watch  # vitest watch
npm run lint        # eslint src/
npm run typecheck   # tsc --noEmit
```

To run a single test file:
```bash
npx vitest run src/__tests__/output-analyzer.test.ts
```

To run the MCP server locally (for Claude Code integration):
```bash
node dist/index.js
```

## Architecture

```
src/
├── index.ts              # MCP server entry point — registers tools and starts server
├── output-analyzer.ts    # Estimates tokens, detects noise patterns, analyzes history
├── alert-manager.ts      # Accumulates alert events and session statistics
├── handlers.ts           # MCP tool handler functions
└── __tests__/
```

### Key Design Decisions

**Analysis strategy**: Every output passed to `check_output` is analyzed for:
1. Token count (heuristic: ~4 chars/token)
2. Output type (log, code, tool_result, response, unknown)
3. Log pattern matches (INFO, DEBUG, TRACE, timestamps, stack traces, ANSI codes)
4. Threshold comparison (warning / error / alert levels)

**Suppression**: An output is marked `shouldSuppress: true` when it matches log/noise patterns AND `suppressLogs` is enabled in config. Suppression is advisory — the plugin never blocks API calls.

**History analysis**: `analyze_history` detects near-duplicate messages (keyed on first 200 chars) and large log-pattern assistant outputs. Reports estimated token savings from suggested truncation.

**Session tracking**: `alert-manager.ts` accumulates every `record()` call and exposes cumulative stats via `get_session_stats`.

### MCP Tools Exposed

| Tool | Description |
|------|-------------|
| `check_output` | Analyze a text output for token waste and noise patterns |
| `get_session_stats` | Returns cumulative session waste statistics |
| `reset_session_stats` | Resets the session statistics |
| `analyze_history` | Scans a messages array for repetitive/ignored content |
| `set_thresholds` | Overrides alert thresholds for the current session |

### Configuration (`.token-saver.json` in project root)

```json
{
  "warningThresholdTokens": 1000,
  "errorThresholdTokens": 5000,
  "alertThresholdTokens": 10000,
  "suppressLogs": true,
  "suppressRepetitiveHistory": true,
  "logPatterns": ["\\[INFO\\]", "\\[DEBUG\\]"],
  "inactivityTurnsBeforeAlert": 3
}
```

## Adding to Claude Code

In `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "token-saver-mcp": {
      "command": "node",
      "args": ["/path/to/token-saver/dist/index.js"]
    }
  }
}
```
