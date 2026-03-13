export class AlertManager {
    _events = [];
    record(level, tokens, suppressed) {
        this._events.push({ level, tokens, suppressed, timestamp: Date.now() });
    }
    getStats() {
        const turns = this._events.length;
        const totalTokensAnalyzed = this._events.reduce((s, e) => s + e.tokens, 0);
        const totalTokensSuppressed = this._events.filter(e => e.suppressed).reduce((s, e) => s + e.tokens, 0);
        const warningsFired = this._events.filter(e => e.level === 'warning').length;
        const errorsFired = this._events.filter(e => e.level === 'error').length;
        const alertsFired = this._events.filter(e => e.level === 'alert').length;
        const tokensSaved = totalTokensSuppressed;
        return { turns, totalTokensAnalyzed, totalTokensSuppressed, warningsFired, errorsFired, alertsFired, tokensSaved };
    }
    reset() {
        this._events = [];
    }
}
//# sourceMappingURL=alert-manager.js.map