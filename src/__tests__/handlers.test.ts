import { describe, it, expect } from 'vitest'
import { handleCheckOutput, handleGetSessionStats, handleResetSessionStats, handleAnalyzeHistory, handleSetThresholds, handleSetMode, handleUnknownTool } from '../handlers.js'
import { AlertManager } from '../alert-manager.js'
import { DEFAULT_CONFIG } from '../output-analyzer.js'

function parseResult(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text)
}

// Active config for tests that need real analysis
const ACTIVE_CONFIG = { ...DEFAULT_CONFIG, mode: 'active' as const }

describe('handleCheckOutput', () => {
  it('skips analysis when mode is off', () => {
    const manager = new AlertManager()
    const result = handleCheckOutput({ text: 'Hello world' }, { ...DEFAULT_CONFIG, mode: 'off' }, manager)
    const data = parseResult(result)
    expect(data.mode).toBe('off')
    expect(data.skipped).toBe(true)
    expect(manager.getStats().turns).toBe(0)
  })

  it('returns error when text is missing in active mode', () => {
    const manager = new AlertManager()
    const result = handleCheckOutput({}, ACTIVE_CONFIG, manager)
    expect(result.isError).toBe(true)
  })

  it('returns analysis for valid text in active mode', () => {
    const manager = new AlertManager()
    const result = handleCheckOutput({ text: 'Hello world' }, ACTIVE_CONFIG, manager)
    const data = parseResult(result)
    expect(data.alertLevel).toBe('info')
    expect(typeof data.tokens).toBe('number')
    expect(typeof data.shouldSuppress).toBe('boolean')
  })

  it('records to manager in active mode', () => {
    const manager = new AlertManager()
    handleCheckOutput({ text: 'Hello' }, ACTIVE_CONFIG, manager)
    expect(manager.getStats().turns).toBe(1)
  })

  it('does not suppress in monitor mode', () => {
    const manager = new AlertManager()
    const logText = '[INFO] line1\n[DEBUG] line2\n[TRACE] line3'
    const result = handleCheckOutput({ text: logText }, { ...DEFAULT_CONFIG, mode: 'monitor' }, manager)
    const data = parseResult(result)
    expect(data.shouldSuppress).toBe(false)
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
  it('skips when mode is off', () => {
    const manager = new AlertManager()
    const result = handleAnalyzeHistory({ messages: [] }, { ...DEFAULT_CONFIG, mode: 'off' }, manager)
    const data = parseResult(result)
    expect(data.mode).toBe('off')
    expect(data.skipped).toBe(true)
  })

  it('returns error when messages missing in active mode', () => {
    const manager = new AlertManager()
    const result = handleAnalyzeHistory({}, ACTIVE_CONFIG, manager)
    expect(result.isError).toBe(true)
  })

  it('returns history analysis in active mode', () => {
    const manager = new AlertManager()
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ]
    const result = handleAnalyzeHistory({ messages }, ACTIVE_CONFIG, manager)
    const data = parseResult(result)
    expect(typeof data.totalMessages).toBe('number')
    expect(Array.isArray(data.repetitiveMessages)).toBe(true)
  })
})

describe('handleSetMode', () => {
  it('switches to monitor mode', () => {
    const config = { ...DEFAULT_CONFIG }
    const result = handleSetMode({ mode: 'monitor' }, config)
    const data = parseResult(result)
    expect(data.mode).toBe('monitor')
    expect(config.mode).toBe('monitor')
  })

  it('switches to active mode', () => {
    const config = { ...DEFAULT_CONFIG }
    const result = handleSetMode({ mode: 'active' }, config)
    const data = parseResult(result)
    expect(data.mode).toBe('active')
  })

  it('switches back to off', () => {
    const config = { ...DEFAULT_CONFIG, mode: 'active' as const }
    const result = handleSetMode({ mode: 'off' }, config)
    const data = parseResult(result)
    expect(data.mode).toBe('off')
  })

  it('returns error for invalid mode', () => {
    const result = handleSetMode({ mode: 'turbo' }, { ...DEFAULT_CONFIG })
    expect(result.isError).toBe(true)
  })

  it('returns error when mode is missing', () => {
    const result = handleSetMode({}, { ...DEFAULT_CONFIG })
    expect(result.isError).toBe(true)
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
