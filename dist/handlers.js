import { analyzeOutput, analyzeHistory } from './output-analyzer.js';
function ok(data) {
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}
function err(message) {
    return { isError: true, content: [{ type: 'text', text: message }] };
}
export function handleCheckOutput(args, config, manager) {
    if (config.mode === 'off')
        return ok({ mode: 'off', skipped: true });
    if (!args || typeof args['text'] !== 'string') {
        return err('Missing required field: text (string)');
    }
    const text = args['text'];
    const typeHint = typeof args['type'] === 'string' ? args['type'] : undefined;
    const analysis = analyzeOutput(text, config, typeHint);
    manager.record(analysis.alertLevel, analysis.tokens, analysis.shouldSuppress);
    return ok(analysis);
}
export function handleGetSessionStats(manager) {
    return ok(manager.getStats());
}
export function handleResetSessionStats(manager) {
    manager.reset();
    return ok({ reset: true });
}
export function handleAnalyzeHistory(args, config, manager) {
    if (config.mode === 'off')
        return ok({ mode: 'off', skipped: true });
    if (!args || !Array.isArray(args['messages'])) {
        return err('Missing required field: messages (array)');
    }
    const messages = args['messages'];
    const maxTurns = typeof args['maxTurns'] === 'number' ? args['maxTurns'] : undefined;
    const analysis = analyzeHistory(messages, config, maxTurns);
    manager.record(analysis.alertLevel, analysis.totalTokens, analysis.estimatedTokenSavings > 0);
    return ok(analysis);
}
export function handleSetThresholds(args, config) {
    if (!args)
        return err('No thresholds provided');
    if (typeof args['warning'] === 'number')
        config.warningThresholdTokens = args['warning'];
    if (typeof args['error'] === 'number')
        config.errorThresholdTokens = args['error'];
    if (typeof args['alert'] === 'number')
        config.alertThresholdTokens = args['alert'];
    if (typeof args['suppressLogs'] === 'boolean')
        config.suppressLogs = args['suppressLogs'];
    if (typeof args['suppressRepetitiveHistory'] === 'boolean')
        config.suppressRepetitiveHistory = args['suppressRepetitiveHistory'];
    return ok({
        applied: {
            warningThresholdTokens: config.warningThresholdTokens,
            errorThresholdTokens: config.errorThresholdTokens,
            alertThresholdTokens: config.alertThresholdTokens,
            suppressLogs: config.suppressLogs,
            suppressRepetitiveHistory: config.suppressRepetitiveHistory,
        },
    });
}
export function handleSetMode(args, config) {
    if (!args || typeof args['mode'] !== 'string') {
        return err('Missing required field: mode ("off" | "monitor" | "active")');
    }
    const mode = args['mode'];
    if (!['off', 'monitor', 'active'].includes(mode)) {
        return err(`Invalid mode "${mode}". Must be one of: off, monitor, active`);
    }
    config.mode = mode;
    return ok({ mode: config.mode });
}
export function handleUnknownTool(name) {
    return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
}
//# sourceMappingURL=handlers.js.map