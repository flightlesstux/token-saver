import { type TokenSaverConfig } from './output-analyzer.js';
import { AlertManager } from './alert-manager.js';
type ToolResult = {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
};
export declare function handleCheckOutput(args: Record<string, unknown> | undefined, config: TokenSaverConfig, manager: AlertManager): ToolResult;
export declare function handleGetSessionStats(manager: AlertManager): ToolResult;
export declare function handleResetSessionStats(manager: AlertManager): ToolResult;
export declare function handleAnalyzeHistory(args: Record<string, unknown> | undefined, config: TokenSaverConfig, manager: AlertManager): ToolResult;
export declare function handleSetThresholds(args: Record<string, unknown> | undefined, config: TokenSaverConfig): ToolResult;
export declare function handleSetMode(args: Record<string, unknown> | undefined, config: TokenSaverConfig): ToolResult;
export declare function handleUnknownTool(name: string): ToolResult;
export {};
//# sourceMappingURL=handlers.d.ts.map