import type { JsonPathPlugin } from './types';

export function orderPluginsDeterministically(
	plugins: readonly JsonPathPlugin[],
): JsonPathPlugin[] {
	// Canonical deterministic ordering used for plugin resolution tie-breaking.
	// NOTE: Duplicate plugin ids are validated by the resolver.
	return [...plugins].sort((a, b) => a.meta.id.localeCompare(b.meta.id));
}
