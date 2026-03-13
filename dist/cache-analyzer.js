import { readFileSync, existsSync } from 'fs';
import path from 'path';
export const DEFAULT_CONFIG = {
    minTokensToCache: 1024,
    cacheToolDefinitions: true,
    cacheSystemPrompt: true,
    maxCacheBreakpoints: 4,
};
export function loadConfig(projectRoot = process.cwd()) {
    const configFile = path.join(projectRoot, '.prompt-cache.json');
    if (!existsSync(configFile))
        return { ...DEFAULT_CONFIG };
    try {
        const raw = JSON.parse(readFileSync(configFile, 'utf8'));
        return { ...DEFAULT_CONFIG, ...raw };
    }
    catch {
        process.stderr.write('[prompt-caching] Failed to parse .prompt-cache.json, using defaults\n');
        return { ...DEFAULT_CONFIG };
    }
}
// Rough heuristic: ~4 chars per token (English text / code average)
export function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
function extractText(content) {
    if (typeof content === 'string')
        return content;
    return content
        .map(block => {
        if (block.type === 'text' && typeof block.text === 'string')
            return block.text;
        if (block.type === 'tool_result') {
            if (typeof block.content === 'string')
                return block.content;
            if (Array.isArray(block.content)) {
                return block.content
                    .filter(b => b.type === 'text' && typeof b.text === 'string')
                    .map(b => b.text ?? '')
                    .join('');
            }
        }
        return '';
    })
        .join('');
}
export function analyzeMessages(messages, system, tools, config) {
    const segments = [];
    if (system !== undefined && config.cacheSystemPrompt) {
        const text = typeof system === 'string' ? system : system.map(b => b.text).join('');
        const tokens = estimateTokens(text);
        segments.push({ kind: 'system', estimatedTokens: tokens, cacheable: tokens >= config.minTokensToCache });
    }
    if (tools !== undefined && tools.length > 0 && config.cacheToolDefinitions) {
        const tokens = estimateTokens(JSON.stringify(tools));
        segments.push({ kind: 'tools', estimatedTokens: tokens, cacheable: tokens >= config.minTokensToCache });
    }
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const tokens = estimateTokens(extractText(msg.content));
        const isStable = msg.role === 'user' && tokens >= config.minTokensToCache;
        segments.push({
            kind: isStable ? 'document' : 'volatile',
            estimatedTokens: tokens,
            cacheable: isStable,
            messageIndex: i,
        });
    }
    const totalEstimatedTokens = segments.reduce((s, seg) => s + seg.estimatedTokens, 0);
    const cacheableTokens = segments.filter(s => s.cacheable).reduce((s, seg) => s + seg.estimatedTokens, 0);
    const recommendedBreakpoints = Math.min(segments.filter(s => s.cacheable).length, config.maxCacheBreakpoints);
    return { segments, totalEstimatedTokens, cacheableTokens, recommendedBreakpoints };
}
//# sourceMappingURL=cache-analyzer.js.map