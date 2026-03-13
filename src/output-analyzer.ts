import { readFileSync, existsSync } from 'fs'
import path from 'path'

export type AlertLevel = 'info' | 'warning' | 'error' | 'alert'
export type OutputType = 'log' | 'history' | 'code' | 'response' | 'tool_result' | 'unknown'

export interface TokenSaverConfig {
  warningThresholdTokens: number
  errorThresholdTokens: number
  alertThresholdTokens: number
  suppressLogs: boolean
  suppressRepetitiveHistory: boolean
  logPatterns: string[]
  inactivityTurnsBeforeAlert: number
}

export const DEFAULT_CONFIG: TokenSaverConfig = {
  warningThresholdTokens: 1000,
  errorThresholdTokens: 5000,
  alertThresholdTokens: 10000,
  suppressLogs: true,
  suppressRepetitiveHistory: true,
  logPatterns: [
    '\\[INFO\\]', '\\[DEBUG\\]', '\\[TRACE\\]', '\\[WARN\\]',
    '^\\d{4}-\\d{2}-\\d{2}T', '^\\d{4}/\\d{2}/\\d{2}',
    'at Object\\.', 'at Function\\.', 'at Module\\.', 'at async ',
    '\\[\\d+m', 'stdout|stderr',
  ],
  inactivityTurnsBeforeAlert: 3,
}

export function loadConfig(projectRoot: string = process.cwd()): TokenSaverConfig {
  const configFile = path.join(projectRoot, '.token-saver.json')
  if (!existsSync(configFile)) return { ...DEFAULT_CONFIG }
  try {
    const raw = JSON.parse(readFileSync(configFile, 'utf8')) as Partial<TokenSaverConfig>
    return { ...DEFAULT_CONFIG, ...raw }
  } catch {
    process.stderr.write('[token-saver] Failed to parse .token-saver.json, using defaults\n')
    return { ...DEFAULT_CONFIG }
  }
}

// Rough heuristic: ~4 chars per token (English/code average)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export interface DetectedPattern {
  pattern: string
  matchCount: number
  description: string
}

export interface OutputAnalysis {
  alertLevel: AlertLevel
  tokens: number
  outputType: OutputType
  shouldSuppress: boolean
  reason: string
  detectedPatterns: DetectedPattern[]
}

function detectOutputType(text: string, hint?: string): OutputType {
  if (hint && ['log', 'history', 'code', 'response', 'tool_result'].includes(hint)) {
    return hint as OutputType
  }
  const trimmed = text.trimStart()
  if (/^\[?(INFO|DEBUG|TRACE|WARN|ERROR|FATAL)\]?/im.test(trimmed)) return 'log'
  if (/^\d{4}[-/]\d{2}[-/]\d{2}[T ]\d{2}:\d{2}/.test(trimmed)) return 'log'
  if (/^(def |class |function |import |from |#include|package )/.test(trimmed)) return 'code'
  if (/^(\{|\[)/.test(trimmed) && trimmed.length > 100) return 'tool_result'
  return 'unknown'
}

function checkLogPatterns(text: string, patterns: string[]): DetectedPattern[] {
  const found: DetectedPattern[] = []
  for (const pat of patterns) {
    try {
      const re = new RegExp(pat, 'gm')
      const matches = text.match(re)
      if (matches && matches.length > 0) {
        found.push({ pattern: pat, matchCount: matches.length, description: `Log pattern matched ${matches.length} times` })
      }
    } catch {
      // invalid regex pattern — skip
    }
  }
  return found
}

export function analyzeOutput(
  text: string,
  config: TokenSaverConfig,
  typeHint?: string
): OutputAnalysis {
  const tokens = estimateTokens(text)
  const outputType = detectOutputType(text, typeHint)
  const detectedPatterns = checkLogPatterns(text, config.logPatterns)

  const isLog = outputType === 'log' || detectedPatterns.length >= 2
  const shouldSuppress = (isLog && config.suppressLogs)

  let alertLevel: AlertLevel = 'info'
  let reason = ''

  if (tokens >= config.alertThresholdTokens) {
    alertLevel = 'alert'
    reason = `Output exceeds alert threshold (${tokens} tokens >= ${config.alertThresholdTokens})`
  } else if (tokens >= config.errorThresholdTokens) {
    alertLevel = 'error'
    reason = `Output exceeds error threshold (${tokens} tokens >= ${config.errorThresholdTokens})`
  } else if (tokens >= config.warningThresholdTokens) {
    alertLevel = 'warning'
    reason = `Output exceeds warning threshold (${tokens} tokens >= ${config.warningThresholdTokens})`
  } else if (shouldSuppress) {
    alertLevel = 'warning'
    reason = 'Output matches log/noise patterns and will be suppressed'
  } else {
    reason = 'Output is within normal bounds'
  }

  if (shouldSuppress && alertLevel === 'info') {
    reason = 'Suppressed: matches log patterns'
  }

  return { alertLevel, tokens, outputType, shouldSuppress, reason, detectedPatterns }
}

export interface MessageParam {
  role: 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; [key: string]: unknown }>
}

export interface HistoryAnalysis {
  totalMessages: number
  totalTokens: number
  repetitiveMessages: Array<{ index: number; role: string; tokens: number; reason: string }>
  suggestedTruncation: number
  estimatedTokenSavings: number
  alertLevel: AlertLevel
}

function extractText(content: string | Array<{ type: string; text?: string; [key: string]: unknown }>): string {
  if (typeof content === 'string') return content
  return content
    .filter(b => b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text ?? '')
    .join('')
}

export function analyzeHistory(
  messages: MessageParam[],
  config: TokenSaverConfig,
  maxTurns?: number
): HistoryAnalysis {
  const limit = maxTurns ?? messages.length
  const subset = messages.slice(-limit)

  const repetitiveMessages: HistoryAnalysis['repetitiveMessages'] = []
  const seenTexts = new Map<string, number>()
  let totalTokens = 0

  for (let i = 0; i < subset.length; i++) {
    const text = extractText(subset[i].content)
    const tokens = estimateTokens(text)
    totalTokens += tokens

    // Key on first 200 chars to detect near-duplicates
    const key = text.slice(0, 200).trim()
    const prevIdx = seenTexts.get(key)
    if (key.length > 50 && prevIdx !== undefined) {
      repetitiveMessages.push({ index: i, role: subset[i].role, tokens, reason: `Near-duplicate of message ${prevIdx}` })
    } else {
      seenTexts.set(key, i)
    }

    // Flag large log-like assistant messages
    const detectedPatterns = checkLogPatterns(text, config.logPatterns)
    if (subset[i].role === 'assistant' && detectedPatterns.length >= 2 && tokens > 500) {
      repetitiveMessages.push({ index: i, role: 'assistant', tokens, reason: 'Large log-pattern output likely ignored' })
    }
  }

  const estimatedTokenSavings = repetitiveMessages.reduce((s, m) => s + m.tokens, 0)
  const suggestedTruncation = repetitiveMessages.length

  let alertLevel: AlertLevel = 'info'
  if (repetitiveMessages.length >= config.inactivityTurnsBeforeAlert) alertLevel = 'alert'
  else if (totalTokens >= config.errorThresholdTokens) alertLevel = 'error'
  else if (totalTokens >= config.warningThresholdTokens) alertLevel = 'warning'

  return {
    totalMessages: subset.length,
    totalTokens,
    repetitiveMessages,
    suggestedTruncation,
    estimatedTokenSavings,
    alertLevel,
  }
}
