import Anthropic from '@anthropic-ai/sdk';
import { optimizeMessages } from './prompt-optimizer.js';
import { loadConfig } from './cache-analyzer.js';
export class AnthropicProxy {
    client;
    tracker;
    config;
    constructor(apiKey, tracker, config) {
        this.client = new Anthropic({ apiKey });
        this.tracker = tracker;
        this.config = config ?? loadConfig();
    }
    async createMessage(params) {
        const { model, max_tokens, messages, system, tools, ...rest } = params;
        const result = optimizeMessages(messages, system, tools, this.config);
        const response = await this.client.messages.create({
            model,
            max_tokens,
            messages: result.optimizedMessages,
            ...(result.optimizedSystem !== undefined
                ? { system: result.optimizedSystem }
                : {}),
            ...(result.optimizedTools !== undefined
                ? { tools: result.optimizedTools }
                : {}),
            ...rest,
        });
        if (response.usage) {
            this.tracker.record(response.usage);
        }
        return response;
    }
}
export function createProxy(apiKey, tracker, config) {
    return new AnthropicProxy(apiKey, tracker, config);
}
//# sourceMappingURL=api-proxy.js.map