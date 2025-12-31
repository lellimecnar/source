import { JSONPath } from 'jsonpath-plus';

export { JSONPath };

export type JSONPathEvalMode = 'safe' | 'native' | false;

export function readJsonPath(
	json: unknown,
	pathExpr: string,
	evalMode: JSONPathEvalMode = 'safe',
): unknown {
	const results = JSONPath<unknown[]>({
		path: pathExpr,
		json: json as any,
		wrap: true,
		eval: evalMode,
	});
	if (!Array.isArray(results) || results.length === 0) return undefined;
	if (results.length === 1) return results[0];
	return results;
}

export function findJsonPathPointers(
	json: unknown,
	pathExpr: string,
	evalMode: JSONPathEvalMode = 'safe',
): string[] {
	const pointers = JSONPath<string[]>({
		path: pathExpr,
		json: json as any,
		wrap: true,
		resultType: 'pointer',
		eval: evalMode,
	});
	return Array.isArray(pointers) ? pointers : [];
}
