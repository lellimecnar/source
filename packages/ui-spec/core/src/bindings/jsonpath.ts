import { JSONPath } from 'jsonpath-plus';

export type JSONPathEvalMode = 'safe' | 'native' | false;

export interface ReadPathOptions {
	evalMode?: JSONPathEvalMode;
}

export function readJsonPath(
	json: unknown,
	path: string,
	options?: ReadPathOptions,
): unknown {
	const results = JSONPath<unknown[]>({
		path,
		json: json as any,
		wrap: true,
		eval: options?.evalMode ?? 'safe',
	});

	if (!Array.isArray(results) || results.length === 0) return undefined;
	if (results.length === 1) return results[0];
	return results;
}
