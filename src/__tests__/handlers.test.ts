import { describe, it, expect, beforeEach } from 'vitest'
import { handleCheckOutput, handleGetSessionStats, handleResetSessionStats, handleAnalyzeHistory, handleSetThresholds, handleUnknownTool } from '../handlers.js'
import { AlertManager } from '../alert-manager.js'
import { DEFAULT_CONFIG } from '../output-analyzer.js'

function parseResult(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text)
}

describe('handleCheckOutput', () => {
  it('returns error when text is missing', () => {
    const manager = new AlertManager()
    const result = handleCheckOutput({}, DEFAULT_CONFIG, manager)
    expect(result.isError).toBe(true)
  })

  it('returns analysis for valid text', () => {
    const manager = new AlertManager()
    const result = handleCheckOutput({ text: 'Hello world' }, DEFAULT_CONFIG, manager)
    const data = parseResult(result)
    expect(data.alertLevel).toBe('info')
    expect(typeof data.tokens).toBe('number')
    expect(typeof data.shouldSuppress).toBe('boolean')
  })

  it('records to manager', () => {
    const manager = new AlertManager()
    handleCheckOutput({ text: 'Hello' }, DEFAULT_CONFIG, manager)
    expect(manager.getStats().turns).toBe(1)
  })
})

describe('handleGetSessionStats', () => {
  it('returns stats object', () => {
    const manager = new AlertManager()
    const result = handleGetSessionStats(manager)
    const data = parseResult(result)
    expect(typeof data.turns).toBe('number')
    expect(typeof data.tokensSaved).toBe('number')
  })
})

describe('handleResetSessionStats', () => {
  it('resets stats and returns reset flag', () => {
    const manager = new AlertManager()
    manager.record('alert', 999, true)
    const result = handleResetSessionStats(manager)
    const data = parseResult(result)
    expect(data.reset).toBe(true)
    expect(manager.getStats().turns).toBe(0)
  })
})

describe('handleAnalyzeHistory', () => {
  it('returns error when messages missing', () => {
    const manager = new AlertManager()
    const result = handleAnalyzeHistory({}, DEFAULT_CONFIG, manager)
    expect(result.isError).toBe(true)
  })

  it('returns history analysis', () => {
    const manager = new AlertManager()
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ]
    const result = handleAnalyzeHistory({ messages }, DEFAULT_CONFIG, manager)
    const data = parseResult(result)
    expect(typeof data.totalMessages).toBe('number')
    expect(Array.isArray(data.repetitiveMessages)).toBe(true)
  })
})

describe('handleSetThresholds', () => {
  it('applies warning threshold', () => {
    const config = { ...DEFAULT_CONFIG }
    const result = handleSetThresholds({ warning: 500 }, config)
    const data = parseResult(result)
    expect(data.applied.warningThresholdTokens).toBe(500)
    expect(config.warningThresholdTokens).toBe(500)
  })

  it('returns error when no args', () => {
    const result = handleSetThresholds(undefined, { ...DEFAULT_CONFIG })
    expect(result.isError).toBe(true)
  })
})

describe('handleUnknownTool', () => {
  it('returns error', () => {
    const result = handleUnknownTool('nonexistent_tool')
    expect(result.isError).toBe(true)
  })
})
