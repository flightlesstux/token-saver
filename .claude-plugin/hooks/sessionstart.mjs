#!/usr/bin/env node
/**
 * SessionStart hook for token-saver plugin.
 * Outputs a status reminder so Claude knows token-saver is active this session.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const settingsPath = join(homedir(), '.claude', 'settings.json');

let enabled = false;
try {
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  const mcpServers =
    settings?.mcpServers ?? settings?.['mcpServers'] ?? {};
  enabled = Object.keys(mcpServers).some((k) =>
    k.includes('token-saver')
  );
} catch {
  // settings unreadable — assume enabled since hook is running
  enabled = true;
}

if (enabled) {
  process.stdout.write(
    [
      'token-saver is active (mode: off by default — call set_mode to enable).',
      'Tools: check_output · analyze_history · get_session_stats · set_mode · set_thresholds',
    ].join('\n') + '\n'
  );
}
