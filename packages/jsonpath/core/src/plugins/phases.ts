export const PluginPhases = {
	syntax: 'syntax', // Parse-time syntax/grammar registration and AST construction
	filter: 'filter', // Filter expression operators and functions
	runtime: 'runtime', // Runtime evaluation logic
	result: 'result', // Result shaping/mapping
} as const;

export type PluginPhase = (typeof PluginPhases)[keyof typeof PluginPhases];

// Deterministic execution order
export const PhaseOrder: readonly PluginPhase[] = [
	'syntax',
	'filter',
	'runtime',
	'result',
];
