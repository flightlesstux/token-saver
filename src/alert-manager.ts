export type AlertLevel = 'info' | 'warning' | 'error' | 'alert'

export interface AlertEvent {
  level: AlertLevel
  tokens: number
  suppressed: boolean
  timestamp: number
}

export interface SessionStats {
  turns: number
  totalTokensAnalyzed: number
  totalTokensSuppressed: number
  warningsFired: number
  errorsFired: number
  alertsFired: number
  tokensSaved: number
}

export class AlertManager {
  private _events: AlertEvent[] = []

  record(level: AlertLevel, tokens: number, suppressed: boolean): void {
    this._events.push({ level, tokens, suppressed, timestamp: Date.now() })
  }

  getStats(): SessionStats {
    const turns = this._events.length
    const totalTokensAnalyzed = this._events.reduce((s, e) => s + e.tokens, 0)
    const totalTokensSuppressed = this._events.filter(e => e.suppressed).reduce((s, e) => s + e.tokens, 0)
    const warningsFired = this._events.filter(e => e.level === 'warning').length
    const errorsFired = this._events.filter(e => e.level === 'error').length
    const alertsFired = this._events.filter(e => e.level === 'alert').length
    const tokensSaved = totalTokensSuppressed
    return { turns, totalTokensAnalyzed, totalTokensSuppressed, warningsFired, errorsFired, alertsFired, tokensSaved }
  }

  reset(): void {
    this._events = []
  }
}
