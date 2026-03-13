import { analyzeOutput, analyzeHistory, type TokenSaverConfig, type MessageParam, type PluginMode } from './output-analyzer.js'
import { AlertManager } from './alert-manager.js'

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

function err(message: string): ToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] }
}

export function handleCheckOutput(
  args: Record<string, unknown> | undefined,
  config: TokenSaverConfig,
  manager: AlertManager
): ToolResult {
  if (config.mode === 'off') return ok({ mode: 'off', skipped: true })
  if (!args || typeof args['text'] !== 'string') {
    return err('Missing required field: text (string)')
  }
  const text = args['text'] as string
  const typeHint = typeof args['type'] === 'string' ? args['type'] : undefined
  const analysis = analyzeOutput(text, config, typeHint)
  manager.record(analysis.alertLevel, analysis.tokens, analysis.shouldSuppress)
  return ok(analysis)
}

export function handleGetSessionStats(manager: AlertManager): ToolResult {
  return ok(manager.getStats())
}

export function handleResetSessionStats(manager: AlertManager): ToolResult {
  manager.reset()
  return ok({ reset: true })
}

export function handleAnalyzeHistory(
  args: Record<string, unknown> | undefined,
  config: TokenSaverConfig,
  manager: AlertManager
): ToolResult {
  if (config.mode === 'off') return ok({ mode: 'off', skipped: true })
  if (!args || !Array.isArray(args['messages'])) {
    return err('Missing required field: messages (array)')
  }
  const messages = args['messages'] as MessageParam[]
  const maxTurns = typeof args['maxTurns'] === 'number' ? args['maxTurns'] : undefined
  const analysis = analyzeHistory(messages, config, maxTurns)
  manager.record(analysis.alertLevel, analysis.totalTokens, analysis.estimatedTokenSavings > 0)
  return ok(analysis)
}

export function handleSetThresholds(
  args: Record<string, unknown> | undefined,
  config: TokenSaverConfig
): ToolResult {
  if (!args) return err('No thresholds provided')
  if (typeof args['warning'] === 'number') config.warningThresholdTokens = args['warning'] as number
  if (typeof args['error'] === 'number') config.errorThresholdTokens = args['error'] as number
  if (typeof args['alert'] === 'number') config.alertThresholdTokens = args['alert'] as number
  if (typeof args['suppressLogs'] === 'boolean') config.suppressLogs = args['suppressLogs'] as boolean
  if (typeof args['suppressRepetitiveHistory'] === 'boolean') config.suppressRepetitiveHistory = args['suppressRepetitiveHistory'] as boolean
  return ok({
    applied: {
      warningThresholdTokens: config.warningThresholdTokens,
      errorThresholdTokens: config.errorThresholdTokens,
      alertThresholdTokens: config.alertThresholdTokens,
      suppressLogs: config.suppressLogs,
      suppressRepetitiveHistory: config.suppressRepetitiveHistory,
    },
  })
}

export function handleSetMode(
  args: Record<string, unknown> | undefined,
  config: TokenSaverConfig
): ToolResult {
  if (!args || typeof args['mode'] !== 'string') {
    return err('Missing required field: mode ("off" | "monitor" | "active")')
  }
  const mode = args['mode'] as string
  if (!['off', 'monitor', 'active'].includes(mode)) {
    return err(`Invalid mode "${mode}". Must be one of: off, monitor, active`)
  }
  config.mode = mode as PluginMode
  return ok({ mode: config.mode })
}

export function handleUnknownTool(name: string): ToolResult {
  return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] }
}
