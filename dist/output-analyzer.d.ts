export type AlertLevel = 'info' | 'warning' | 'error' | 'alert';
export type OutputType = 'log' | 'history' | 'code' | 'response' | 'tool_result' | 'unknown';
export type PluginMode = 'off' | 'monitor' | 'active';
export interface TokenSaverConfig {
    mode: PluginMode;
    warningThresholdTokens: number;
    errorThresholdTokens: number;
    alertThresholdTokens: number;
    suppressLogs: boolean;
    suppressRepetitiveHistory: boolean;
    logPatterns: string[];
    inactivityTurnsBeforeAlert: number;
}
export declare const DEFAULT_CONFIG: TokenSaverConfig;
export declare function loadConfig(projectRoot?: string): TokenSaverConfig;
export declare function estimateTokens(text: string): number;
export interface DetectedPattern {
    pattern: string;
    matchCount: number;
    description: string;
}
export interface OutputAnalysis {
    alertLevel: AlertLevel;
    tokens: number;
    outputType: OutputType;
    shouldSuppress: boolean;
    reason: string;
    detectedPatterns: DetectedPattern[];
}
export declare function analyzeOutput(text: string, config: TokenSaverConfig, typeHint?: string): OutputAnalysis;
export interface MessageParam {
    role: 'user' | 'assistant';
    content: string | Array<{
        type: string;
        text?: string;
        [key: string]: unknown;
    }>;
}
export interface HistoryAnalysis {
    totalMessages: number;
    totalTokens: number;
    repetitiveMessages: Array<{
        index: number;
        role: string;
        tokens: number;
        reason: string;
    }>;
    suggestedTruncation: number;
    estimatedTokenSavings: number;
    alertLevel: AlertLevel;
}
export declare function analyzeHistory(messages: MessageParam[], config: TokenSaverConfig, maxTurns?: number): HistoryAnalysis;
//# sourceMappingURL=output-analyzer.d.ts.map