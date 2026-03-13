#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './output-analyzer.js';
import { AlertManager } from './alert-manager.js';
import { handleCheckOutput, handleGetSessionStats, handleResetSessionStats, handleAnalyzeHistory, handleSetThresholds, handleSetMode, handleUnknownTool, } from './handlers.js';
const args = process.argv.slice(2);
if (args.includes('--version')) {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
    process.stdout.write(`token-saver-mcp v${pkg.version}\n`);
    process.exit(0);
}
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
const config = loadConfig();
const manager = new AlertManager();
process.stderr.write(`[token-saver] Starting MCP server... (mode: ${config.mode})\n`);
const server = new Server({ name: 'token-saver-mcp', version: pkg.version }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'check_output',
            description: 'Analyze a text output from a Claude API response. Returns an alert level (info/warning/error/alert), token count, whether the output should be suppressed, and detected waste patterns. Use after every API response to catch token-heavy or ignored output early.',
            inputSchema: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: 'The text content to analyze.',
                    },
                    type: {
                        type: 'string',
                        enum: ['log', 'history', 'code', 'response', 'tool_result', 'unknown'],
                        description: 'Optional hint about the output type.',
                    },
                },
                required: ['text'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    alertLevel: { type: 'string', enum: ['info', 'warning', 'error', 'alert'] },
                    tokens: { type: 'number' },
                    outputType: { type: 'string' },
                    shouldSuppress: { type: 'boolean' },
                    reason: { type: 'string' },
                    detectedPatterns: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'get_session_stats',
            description: 'Return cumulative session statistics: total tokens analyzed, tokens suppressed, and counts of warnings/errors/alerts fired. Use to understand overall waste in the current session.',
            inputSchema: {
                type: 'object',
                properties: {},
            },
            outputSchema: {
                type: 'object',
                properties: {
                    turns: { type: 'number' },
                    totalTokensAnalyzed: { type: 'number' },
                    totalTokensSuppressed: { type: 'number' },
                    warningsFired: { type: 'number' },
                    errorsFired: { type: 'number' },
                    alertsFired: { type: 'number' },
                    tokensSaved: { type: 'number' },
                },
            },
        },
        {
            name: 'reset_session_stats',
            description: 'Reset all session statistics to zero.',
            inputSchema: {
                type: 'object',
                properties: {},
            },
            outputSchema: {
                type: 'object',
                properties: {
                    reset: { type: 'boolean' },
                },
            },
        },
        {
            name: 'analyze_history',
            description: 'Analyze a conversation messages array for repetitive or ignored content. Identifies near-duplicate messages and large log-pattern outputs the user likely skipped. Returns suggested truncation count and estimated token savings.',
            inputSchema: {
                type: 'object',
                properties: {
                    messages: {
                        type: 'array',
                        description: 'Conversation messages array ({ role, content } pairs).',
                        items: { type: 'object' },
                    },
                    maxTurns: {
                        type: 'number',
                        description: 'Optional: only analyze the last N messages.',
                    },
                },
                required: ['messages'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    totalMessages: { type: 'number' },
                    totalTokens: { type: 'number' },
                    repetitiveMessages: { type: 'array', items: { type: 'object' } },
                    suggestedTruncation: { type: 'number' },
                    estimatedTokenSavings: { type: 'number' },
                    alertLevel: { type: 'string' },
                },
            },
        },
        {
            name: 'set_mode',
            description: 'Switch the plugin mode. "off" (default) — plugin is silent, all analysis is skipped. "monitor" — analyze and report but never suppress. "active" — full analysis with suppression. Returns the applied mode.',
            inputSchema: {
                type: 'object',
                properties: {
                    mode: {
                        type: 'string',
                        enum: ['off', 'monitor', 'active'],
                        description: '"off" disables all analysis. "monitor" reports without suppressing. "active" enables full suppression.',
                    },
                },
                required: ['mode'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    mode: { type: 'string', enum: ['off', 'monitor', 'active'] },
                },
            },
        },
        {
            name: 'set_thresholds',
            description: 'Override alert thresholds for the current session. All values are in estimated tokens. Returns the applied configuration.',
            inputSchema: {
                type: 'object',
                properties: {
                    warning: { type: 'number', description: 'Token count that triggers a warning.' },
                    error: { type: 'number', description: 'Token count that triggers an error.' },
                    alert: { type: 'number', description: 'Token count that triggers an alert.' },
                    suppressLogs: { type: 'boolean', description: 'Whether to suppress log-pattern outputs.' },
                    suppressRepetitiveHistory: { type: 'boolean', description: 'Whether to flag repetitive history messages.' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    applied: { type: 'object' },
                },
            },
        },
    ],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArgs } = request.params;
    try {
        switch (name) {
            case 'check_output': return handleCheckOutput(toolArgs, config, manager);
            case 'get_session_stats': return handleGetSessionStats(manager);
            case 'reset_session_stats': return handleResetSessionStats(manager);
            case 'analyze_history': return handleAnalyzeHistory(toolArgs, config, manager);
            case 'set_mode': return handleSetMode(toolArgs, config);
            case 'set_thresholds': return handleSetThresholds(toolArgs, config);
            default: return handleUnknownTool(name);
        }
    }
    catch (err) {
        return {
            isError: true,
            content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        };
    }
});
const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write('[token-saver] MCP server ready\n');
//# sourceMappingURL=index.js.map