export interface PluginConfig {
    minTokensToCache: number;
    cacheToolDefinitions: boolean;
    cacheSystemPrompt: boolean;
    maxCacheBreakpoints: number;
}
export declare const DEFAULT_CONFIG: PluginConfig;
export declare function loadConfig(projectRoot?: string): PluginConfig;
export declare function estimateTokens(text: string): number;
export interface ContentBlock {
    type: string;
    text?: string;
    content?: string | Array<{
        type: string;
        text?: string;
    }>;
    [key: string]: unknown;
}
export interface MessageParam {
    role: 'user' | 'assistant';
    content: string | ContentBlock[];
}
export type TextBlockParam = {
    type: 'text';
    text: string;
    cache_control?: {
        type: 'ephemeral';
    };
};
export type SystemPrompt = string | TextBlockParam[];
export interface ToolDef {
    name: string;
    cache_control?: {
        type: 'ephemeral';
    };
    [key: string]: unknown;
}
export interface CacheSegment {
    kind: 'system' | 'tools' | 'document' | 'volatile';
    estimatedTokens: number;
    cacheable: boolean;
    messageIndex?: number;
}
export interface AnalysisResult {
    segments: CacheSegment[];
    totalEstimatedTokens: number;
    cacheableTokens: number;
    recommendedBreakpoints: number;
}
export declare function analyzeMessages(messages: MessageParam[], system: SystemPrompt | undefined, tools: ToolDef[] | undefined, config: PluginConfig): AnalysisResult;
//# sourceMappingURL=cache-analyzer.d.ts.map