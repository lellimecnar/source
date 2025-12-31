import type { JsonPathEngine } from '@jsonpath/core';

import type { ConformanceCase } from './corpus';
import { documents } from './corpus';

export interface ConformanceRunOptions {
	resultType?: 'value' | 'path';
}

export function runConformanceCase(
	engine: JsonPathEngine,
	testCase: ConformanceCase,
	options?: ConformanceRunOptions,
): unknown[] {
	const doc = documents.find((d) => d.name === testCase.documentName);
	if (!doc) {
		throw new Error(
			`Unknown conformance document: ${testCase.documentName}. Available: ${documents
				.map((d) => d.name)
				.join(', ')}`,
		);
	}

	const compiled = engine.compile(testCase.query);

	// Map conformance options onto engine options.
	const engineOptions =
		options?.resultType === 'path'
			? { resultType: 'path' as const }
			: undefined;

	return engine.evaluateSync(compiled, doc.json, engineOptions);
}
