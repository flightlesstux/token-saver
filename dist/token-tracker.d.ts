export interface TurnUsage {
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
    inputTokens: number;
    outputTokens: number;
    timestamp: number;
}
export interface CacheStats {
    turns: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    /** Tokens saved vs. no caching (cache_read costs 0.1× vs 1× normal) */
    estimatedSavings: number;
    /** cache_read / (cache_creation + cache_read), 0 if no cache activity */
    hitRate: number;
}
export declare class TokenTracker {
    private _turns;
    record(usage: {
        cache_creation_input_tokens?: number | null;
        cache_read_input_tokens?: number | null;
        input_tokens?: number | null;
        output_tokens?: number | null;
    }): void;
    getStats(): CacheStats;
    reset(): void;
}
//# sourceMappingURL=token-tracker.d.ts.map