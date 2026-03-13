#!/usr/bin/env python3
"""
Live proof test for token-saver MCP plugin.

Demonstrates token waste detection by sending outputs of varying sizes
and types to the check_output and analyze_history tools via MCP stdio.

Requires: pip install anthropic mcp
          ANTHROPIC_API_KEY set in environment (only needed for live API calls)

Usage:
  python3 test_live.py
"""

import json
import sys
import subprocess
import os

# ── Helpers ────────────────────────────────────────────────────────────────────

def call_tool(proc, tool_name: str, arguments: dict) -> dict:
    """Send a JSON-RPC tool call over MCP stdio and return the parsed result."""
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments},
    }
    proc.stdin.write(json.dumps(request) + "\n")
    proc.stdin.flush()
    line = proc.stdout.readline()
    response = json.loads(line)
    content = response.get("result", {}).get("content", [{}])
    return json.loads(content[0].get("text", "{}"))


def print_result(label: str, result: dict):
    level = result.get("alertLevel", result.get("mode", "?"))
    tokens = result.get("tokens", "—")
    suppress = result.get("shouldSuppress", "—")
    skipped = result.get("skipped", False)
    if skipped:
        print(f"  [{label}] mode=off skipped=true")
    else:
        print(f"  [{label}] level={level} tokens={tokens} suppress={suppress}")
        if result.get("detectedPatterns"):
            print(f"    patterns: {len(result['detectedPatterns'])} matched")
        if result.get("reason"):
            print(f"    reason: {result['reason']}")


# ── Start MCP server ───────────────────────────────────────────────────────────

dist_path = os.path.join(os.path.dirname(__file__), "dist", "index.js")
proc = subprocess.Popen(
    ["node", dist_path],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.DEVNULL,
    text=True,
    bufsize=1,
)

# Send MCP initialize handshake
init = {
    "jsonrpc": "2.0",
    "id": 0,
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "test_live", "version": "1.0.0"},
    },
}
proc.stdin.write(json.dumps(init) + "\n")
proc.stdin.flush()
proc.stdout.readline()  # consume initialize response

initialized = {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}}
proc.stdin.write(json.dumps(initialized) + "\n")
proc.stdin.flush()

# ── Test cases ─────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("TOKEN-SAVER PROOF TEST")
print("=" * 60)

# 1. Default mode is off — should skip
print("\n[1] Default mode (off) — all analysis skipped")
r = call_tool(proc, "check_output", {"text": "Hello world"})
print_result("check_output", r)
assert r.get("skipped") is True, f"Expected skipped=true, got {r}"
print("  [PASS] mode=off correctly skips analysis")

# 2. Switch to monitor mode
print("\n[2] Switch to monitor mode")
r = call_tool(proc, "set_mode", {"mode": "monitor"})
assert r.get("mode") == "monitor", f"Expected mode=monitor, got {r}"
print("  [PASS] mode switched to monitor")

# 3. Normal output — info level
print("\n[3] Short normal output → info")
r = call_tool(proc, "check_output", {"text": "Hello world"})
print_result("check_output", r)
assert r["alertLevel"] == "info", f"Expected info, got {r['alertLevel']}"
assert r["shouldSuppress"] is False, "monitor mode should never suppress"
print("  [PASS] info level, no suppression")

# 4. Large output — warning level (>1000 tokens = >4000 chars)
print("\n[4] Large output (>1000 tokens) → warning or higher")
large_text = "word " * 900  # ~900 tokens
r = call_tool(proc, "check_output", {"text": large_text})
print_result("check_output", r)
assert r["alertLevel"] in ("warning", "error", "alert"), f"Expected warning+, got {r['alertLevel']}"
print(f"  [PASS] {r['alertLevel']} level fired at {r['tokens']} tokens")

# 5. Log output — detected but NOT suppressed in monitor mode
print("\n[5] Log output in monitor mode → detected, not suppressed")
log_text = "[INFO] server started\n[DEBUG] connection ok\n[TRACE] request received\n" * 5
r = call_tool(proc, "check_output", {"text": log_text, "type": "log"})
print_result("check_output", r)
assert r["shouldSuppress"] is False, "monitor mode must not suppress"
assert len(r.get("detectedPatterns", [])) > 0, "log patterns should be detected"
print("  [PASS] patterns detected, suppression=false (monitor mode)")

# 6. Switch to active mode
print("\n[6] Switch to active mode")
r = call_tool(proc, "set_mode", {"mode": "active"})
assert r.get("mode") == "active", f"Expected active, got {r}"
print("  [PASS] mode switched to active")

# 7. Log output in active mode — should suppress
print("\n[7] Log output in active mode → suppressed")
r = call_tool(proc, "check_output", {"text": log_text, "type": "log"})
print_result("check_output", r)
assert r["shouldSuppress"] is True, f"active mode should suppress logs, got {r}"
print(f"  [PASS] suppressed {r['tokens']} log tokens")

# 8. Repetitive history analysis
print("\n[8] Repetitive history → alert")
dup = "This is a repeated user message that is definitely longer than fifty chars."
messages = []
for i in range(6):
    messages.append({"role": "user" if i % 2 == 0 else "assistant", "content": dup})
r = call_tool(proc, "analyze_history", {"messages": messages})
print(f"  totalMessages={r['totalMessages']} totalTokens={r['totalTokens']}")
print(f"  repetitive={len(r['repetitiveMessages'])} savings={r['estimatedTokenSavings']} level={r['alertLevel']}")
assert r["estimatedTokenSavings"] > 0, "should detect token savings from duplicates"
print(f"  [PASS] {r['estimatedTokenSavings']} tokens saveable from repetitive history")

# 9. Session stats
print("\n[9] Session stats")
r = call_tool(proc, "get_session_stats", {})
print(f"  turns={r['turns']} analyzed={r['totalTokensAnalyzed']} suppressed={r['totalTokensSuppressed']}")
print(f"  warnings={r['warningsFired']} errors={r['errorsFired']} alerts={r['alertsFired']}")
assert r["turns"] > 0, "should have recorded turns"
assert r["totalTokensSuppressed"] > 0, "should have suppressed some tokens"
tokens_saved = r["totalTokensSuppressed"]
print(f"  [PASS] {tokens_saved} tokens suppressed this session")

# ── Summary ────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("PROOF SUMMARY")
print("=" * 60)
print(f"  Tokens suppressed this session : {tokens_saved}")
print(f"  Turns analyzed                 : {r['turns']}")
print(f"  Warnings fired                 : {r['warningsFired']}")
print(f"  Alerts fired                   : {r['alertsFired']}")
print(f"\n  Overall: ALL CHECKS PASSED")
print("=" * 60)

proc.stdin.close()
proc.wait()
sys.exit(0)
