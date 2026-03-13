# Contributing to token-saver

Thank you for your interest in contributing. This plugin aims to be the definitive open-source solution for catching and suppressing wasteful Claude API token usage in coding workflows. Every contribution matters.

---

## Table of Contents

- [Before You Start](#before-you-start)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Architecture Guide](#architecture-guide)

---

## Engineering Mindset

Read [BEST_PRACTICES.md](BEST_PRACTICES.md) before writing any code. It defines the non-negotiable rules for tool design, server behavior, responses, security, and cross-platform support. PRs that violate these rules will be rejected regardless of functionality.

## Before You Start

- **Check existing issues** before opening a new one — your idea or bug may already be tracked.
- **Open an issue first** for any non-trivial change. Discuss the approach before writing code, especially for new detection heuristics or suppression strategies.
- **Small PRs win.** A focused 200-line PR gets reviewed in hours. A sprawling 2000-line PR sits for weeks.

---

## How to Contribute

### Reporting Bugs

Use the **Bug Report** issue template. Include:
- Your Claude Code version and OS
- Which tool triggered the issue (`check_output`, `analyze_history`, etc.)
- A minimal reproduction: the text or messages array that caused wrong behavior
- Expected vs actual alert level or suppression flag

### Requesting Features

Use the **Feature Request** template. Describe:
- The coding workflow you're targeting
- Why current detection heuristics don't cover it
- Rough idea of where in the architecture it fits (see `src/output-analyzer.ts`)

### Good First Issues

Issues tagged [`good first issue`](../../issues?q=label%3A%22good+first+issue%22) are scoped, well-defined, and won't require deep architecture knowledge. Start here.

Issues tagged [`help wanted`](../../issues?q=label%3A%22help+wanted%22) are higher impact but need community expertise.

---

## Development Setup

```bash
git clone https://github.com/<your-fork>/token-saver.git
cd token-saver
make install
make dev          # watch mode — rebuilds on save
```

Before every commit, run the full verification suite:
```bash
make verify       # typecheck + lint + test in sequence — must all pass
```

All other available commands:
```bash
make              # show all commands with descriptions
make build        # compile TypeScript → dist/
make test-watch   # vitest watch mode
make docker-build # build local Docker image
```

---

## Commit Convention

We use **Conventional Commits**. Every commit message must follow this format:

```
<type>(<scope>): <short description>

[optional body]

[optional footer: BREAKING CHANGE or closes #issue]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or new detection heuristic |
| `fix` | Bug fix |
| `perf` | Performance improvement to analysis or suppression logic |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore` | Build process, dependency updates, tooling |

### Examples

```
feat(analyzer): add ANSI escape code detection to log patterns
fix(history): near-duplicate detection misses content-array messages
perf(analyzer): short-circuit pattern matching for outputs under 100 chars
docs(readme): add token savings examples for common log formats
chore(deps): upgrade @modelcontextprotocol/sdk to latest
```

**Breaking changes** must include `BREAKING CHANGE:` in the commit footer and will trigger a major version bump.

---

## Pull Request Process

1. **Branch naming**: `feat/short-description`, `fix/issue-number-description`, `docs/what-changed`
2. **Base branch**: always target `main`
3. **Fill the PR template** completely — PRs with empty sections will be returned
4. **One concern per PR** — don't mix features, fixes, and refactors
5. **Tests required**: new behavior needs new tests; bug fixes need a regression test

### Review SLA

- Maintainers aim to review within **48 hours** on weekdays
- Two approvals required for changes to `src/output-analyzer.ts` or `src/alert-manager.ts` (core logic)
- One approval sufficient for docs, tests, and non-core changes

### What Gets Rejected

- PRs without tests for new code paths
- PRs that add dependencies without discussion in an issue first
- Commits that don't follow the convention (CI will block them)

---

## Architecture Guide

Before contributing to core files, understand the data flow:

```
Text output / messages array
      ↓
output-analyzer.ts   → estimates tokens, detects output type, matches log patterns
      ↓
alert-manager.ts     → records alert event, accumulates session stats
      ↓
handlers.ts          → formats MCP tool response
      ↓
index.ts             → routes MCP tool call to handler
```

**The single most important invariant**: suppression is advisory only. `shouldSuppress: true` is a signal to the caller — the plugin never intercepts or modifies any API call. Handlers must never block, delay, or alter the data flow.

New detection patterns belong in `output-analyzer.ts` in the `logPatterns` default array or `detectOutputType`. New alert thresholds are config-driven — no hardcoded magic numbers in logic.

---

## Questions?

Open a [Discussion](../../discussions) — not an issue — for questions, ideas, or architecture conversations. Issues are for bugs and confirmed feature requests only.
