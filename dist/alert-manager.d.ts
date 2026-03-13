export type AlertLevel = 'info' | 'warning' | 'error' | 'alert';
export interface AlertEvent {
    level: AlertLevel;
    tokens: number;
    suppressed: boolean;
    timestamp: number;
}
export interface SessionStats {
    turns: number;
    totalTokensAnalyzed: number;
    totalTokensSuppressed: number;
    warningsFired: number;
    errorsFired: number;
    alertsFired: number;
    tokensSaved: number;
}
export declare class AlertManager {
    private _events;
    record(level: AlertLevel, tokens: number, suppressed: boolean): void;
    getStats(): SessionStats;
    reset(): void;
}
//# sourceMappingURL=alert-manager.d.ts.map