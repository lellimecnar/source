import type { JsonPathPlugin } from './types';

export function orderPluginsDeterministically(
	plugins: readonly JsonPathPlugin[],
): JsonPathPlugin[] {
	// Preserve explicit input order only when duplicates are not present;
	// otherwise, keep stable by plugin id.
	const seen = new Set<string>();
	const deduped: JsonPathPlugin[] = [];
	for (const p of plugins) {
		if (seen.has(p.meta.id)) continue;
		seen.add(p.meta.id);
		deduped.push(p);
	}

	return [...deduped].sort((a, b) => a.meta.id.localeCompare(b.meta.id));
}
