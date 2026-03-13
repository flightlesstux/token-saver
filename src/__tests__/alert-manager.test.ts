import { describe, it, expect, beforeEach } from 'vitest'
import { AlertManager } from '../alert-manager.js'

describe('AlertManager', () => {
  let manager: AlertManager

  beforeEach(() => {
    manager = new AlertManager()
  })

  it('starts with zero stats', () => {
    const stats = manager.getStats()
    expect(stats.turns).toBe(0)
    expect(stats.totalTokensAnalyzed).toBe(0)
    expect(stats.tokensSaved).toBe(0)
  })

  it('records events and accumulates stats', () => {
    manager.record('info', 100, false)
    manager.record('warning', 2000, false)
    manager.record('error', 6000, true)
    const stats = manager.getStats()
    expect(stats.turns).toBe(3)
    expect(stats.totalTokensAnalyzed).toBe(8100)
    expect(stats.warningsFired).toBe(1)
    expect(stats.errorsFired).toBe(1)
    expect(stats.alertsFired).toBe(0)
    expect(stats.totalTokensSuppressed).toBe(6000)
    expect(stats.tokensSaved).toBe(6000)
  })

  it('resets state', () => {
    manager.record('alert', 500, true)
    manager.reset()
    const stats = manager.getStats()
    expect(stats.turns).toBe(0)
    expect(stats.alertsFired).toBe(0)
  })
})
