# Privacy Policy

**token-saver** is an open-source MCP plugin. This document explains what data is processed and what is not collected.

## What this plugin does

- Reads text outputs passed to its MCP tools for token estimation and pattern analysis
- Accumulates alert and suppression statistics in memory for the current session

## What this plugin does NOT do

- Does not transmit any data to external servers
- Does not store any data to disk (session statistics live in memory only and are lost on restart)
- Does not log, track, or analyze your prompts, code, or conversations beyond what is needed for in-session alerting
- Does not include analytics, telemetry, or crash reporting of any kind

## Third-party services

This plugin itself has no third-party integrations. When you use it as part of an AI workflow:

- Your messages are sent to the **Anthropic API** — see [Anthropic's Privacy Policy](https://www.anthropic.com/privacy)
- Your AI client (Claude Code, Cursor, etc.) may have its own privacy policy

## Data residency

No data leaves the machine running this plugin. All processing is local and in-memory.

## Contact

For questions, open an issue at [github.com/flightlesstux/token-saver](https://github.com/flightlesstux/token-saver/issues).
