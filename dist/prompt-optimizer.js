import { analyzeMessages, } from './cache-analyzer.js';
function withCacheControl(block) {
    return { ...block, cache_control: { type: 'ephemeral' } };
}
function addCacheControlToContent(content) {
    const cc = { type: 'ephemeral' };
    if (typeof content === 'string') {
        return [{ type: 'text', text: content, cache_control: cc }];
    }
    if (content.length === 0)
        return content;
    const copy = content.map(b => ({ ...b }));
    copy[copy.length - 1] = withCacheControl(copy[copy.length - 1]);
    return copy;
}
export function optimizeMessages(messages, system, tools, config) {
    const analysis = analyzeMessages(messages, system, tools, config);
    let budget = config.maxCacheBreakpoints;
    let breakpointsAdded = 0;
    let optimizedSystem = system;
    let optimizedTools = tools;
    const optimizedMessages = messages.map(m => ({
        ...m,
        content: typeof m.content === 'string' ? m.content : m.content.map(b => ({ ...b })),
    }));
    // 1. Cache system prompt
    if (system !== undefined && config.cacheSystemPrompt && budget > 0) {
        const text = typeof system === 'string' ? system : system.map(b => b.text).join('');
        if (text.length / 4 >= config.minTokensToCache) {
            if (typeof system === 'string') {
                optimizedSystem = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
            }
            else {
                const arr = system.map(b => ({ ...b }));
                if (arr.length > 0) {
                    arr[arr.length - 1] = { ...arr[arr.length - 1], cache_control: { type: 'ephemeral' } };
                }
                optimizedSystem = arr;
            }
            breakpointsAdded++;
            budget--;
        }
    }
    // 2. Cache tool definitions (breakpoint on last tool entry)
    if (tools !== undefined && tools.length > 0 && config.cacheToolDefinitions && budget > 0) {
        if (JSON.stringify(tools).length / 4 >= config.minTokensToCache) {
            const arr = tools.map(t => ({ ...t }));
            arr[arr.length - 1] = { ...arr[arr.length - 1], cache_control: { type: 'ephemeral' } };
            optimizedTools = arr;
            breakpointsAdded++;
            budget--;
        }
    }
    // 3. Cache large stable user message blocks (earliest to latest)
    for (let i = 0; i < messages.length && budget > 0; i++) {
        const msg = messages[i];
        if (msg.role !== 'user')
            continue;
        const text = typeof msg.content === 'string'
            ? msg.content
            : msg.content
                .filter(b => b.type === 'text')
                .map(b => b.text)
                .join('');
        if (text.length / 4 >= config.minTokensToCache) {
            optimizedMessages[i] = { ...msg, content: addCacheControlToContent(msg.content) };
            breakpointsAdded++;
            budget--;
        }
    }
    return { optimizedMessages, optimizedSystem, optimizedTools, analysis, breakpointsAdded };
}
//# sourceMappingURL=prompt-optimizer.js.map