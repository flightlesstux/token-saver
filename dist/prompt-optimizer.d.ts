import { type PluginConfig, type AnalysisResult, type MessageParam, type SystemPrompt, type ToolDef } from './cache-analyzer.js';
export interface OptimizeResult {
    optimizedMessages: MessageParam[];
    optimizedSystem: SystemPrompt | undefined;
    optimizedTools: ToolDef[] | undefined;
    analysis: AnalysisResult;
    breakpointsAdded: number;
}
export declare function optimizeMessages(messages: MessageParam[], system: SystemPrompt | undefined, tools: ToolDef[] | undefined, config: PluginConfig): OptimizeResult;
//# sourceMappingURL=prompt-optimizer.d.ts.map