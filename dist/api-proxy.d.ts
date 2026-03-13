import Anthropic from '@anthropic-ai/sdk';
import { TokenTracker } from './token-tracker.js';
import { type PluginConfig, type MessageParam, type SystemPrompt, type ToolDef } from './cache-analyzer.js';
export interface ProxyCreateParams {
    model: string;
    max_tokens: number;
    messages: MessageParam[];
    system?: SystemPrompt;
    tools?: ToolDef[];
    [key: string]: unknown;
}
export declare class AnthropicProxy {
    private readonly client;
    private readonly tracker;
    private readonly config;
    constructor(apiKey: string, tracker: TokenTracker, config?: PluginConfig);
    createMessage(params: ProxyCreateParams): Promise<Anthropic.Messages.Message>;
}
export declare function createProxy(apiKey: string, tracker: TokenTracker, config?: PluginConfig): AnthropicProxy;
//# sourceMappingURL=api-proxy.d.ts.map