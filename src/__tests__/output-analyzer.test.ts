import { describe, it, expect } from 'vitest'
import { analyzeOutput, analyzeHistory, estimateTokens, DEFAULT_CONFIG } from '../output-analyzer.js'

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })
  it('estimates tokens by dividing chars by 4', () => {
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('a'.repeat(400))).toBe(100)
  })
})

describe('analyzeOutput', () => {
  it('returns info for short normal text', () => {
    const result = analyzeOutput('Hello world', DEFAULT_CONFIG)
    expect(result.alertLevel).toBe('info')
    expect(result.shouldSuppress).toBe(false)
  })

  it('returns warning when tokens exceed warning threshold', () => {
    const text = 'x'.repeat(DEFAULT_CONFIG.warningThresholdTokens * 4 + 4)
    const result = analyzeOutput(text, DEFAULT_CONFIG)
    expect(['warning', 'error', 'alert']).toContain(result.alertLevel)
  })

  it('returns alert when tokens exceed alert threshold', () => {
    const text = 'x'.repeat(DEFAULT_CONFIG.alertThresholdTokens * 4 + 4)
    const result = analyzeOutput(text, DEFAULT_CONFIG)
    expect(result.alertLevel).toBe('alert')
  })

  it('detects log patterns and sets shouldSuppress', () => {
    const logText = '[INFO] server started\n[DEBUG] connection established\n[TRACE] request received'
    const result = analyzeOutput(logText, { ...DEFAULT_CONFIG, suppressLogs: true })
    expect(result.shouldSuppress).toBe(true)
    expect(result.detectedPatterns.length).toBeGreaterThan(0)
  })

  it('does not suppress logs when suppressLogs is false', () => {
    const logText = '[INFO] line1\n[DEBUG] line2\n[TRACE] line3'
    const result = analyzeOutput(logText, { ...DEFAULT_CONFIG, suppressLogs: false })
    expect(result.shouldSuppress).toBe(false)
  })

  it('respects type hint', () => {
    const result = analyzeOutput('some text', DEFAULT_CONFIG, 'log')
    expect(result.outputType).toBe('log')
  })
})

describe('analyzeHistory', () => {
  it('returns info for short unique history', () => {
    const messages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there' },
    ]
    const result = analyzeHistory(messages, DEFAULT_CONFIG)
    expect(result.alertLevel).toBe('info')
    expect(result.repetitiveMessages).toHaveLength(0)
  })

  it('detects near-duplicate user messages', () => {
    const dupContent = 'This is a repeated message that is longer than fifty characters for detection'
    const messages = [
      { role: 'user' as const, content: dupContent },
      { role: 'assistant' as const, content: 'OK' },
      { role: 'user' as const, content: dupContent },
    ]
    const result = analyzeHistory(messages, DEFAULT_CONFIG)
    expect(result.repetitiveMessages.length).toBeGreaterThan(0)
    expect(result.estimatedTokenSavings).toBeGreaterThan(0)
  })

  it('respects maxTurns parameter', () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Message ${i}`,
    }))
    const result = analyzeHistory(messages, DEFAULT_CONFIG, 4)
    expect(result.totalMessages).toBe(4)
  })

  it('fires alert when repetitive messages exceed inactivity threshold', () => {
    const dupContent = 'x'.repeat(220) // >200 chars so key-match triggers
    const messages = Array.from({ length: 6 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: dupContent,
    }))
    const result = analyzeHistory(messages, { ...DEFAULT_CONFIG, inactivityTurnsBeforeAlert: 2 })
    expect(['warning', 'error', 'alert']).toContain(result.alertLevel)
  })
})
