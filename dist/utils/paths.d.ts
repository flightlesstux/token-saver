/**
 * Returns the Claude Code settings file path, cross-platform.
 * Windows: C:\Users\<user>\.claude\settings.json
 * Unix:    ~/.claude/settings.json
 */
export declare function getConfigPath(): string;
/**
 * Returns the project-level plugin config path (.token-saver.json).
 * Resolves relative to cwd, rejects paths that escape the project root.
 */
export declare function resolveProjectPath(inputPath: string): string;
//# sourceMappingURL=paths.d.ts.map