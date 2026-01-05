import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface CtsTestCase {
	name: string;
	selector: string;
	document?: any;
	result?: any[];
	results?: any[][];
	invalid_selector?: boolean;
}

export interface ComplianceTestSuite {
	tests: CtsTestCase[];
}

export function loadCts(): ComplianceTestSuite {
	// Try to find cts.json relative to this file (in monorepo)
	// src/runner.ts -> compliance-suite -> jsonpath -> packages -> root -> node_modules
	const ctsPath = join(
		__dirname,
		'../../../../node_modules/jsonpath-compliance-test-suite/cts.json',
	);
	try {
		return JSON.parse(readFileSync(ctsPath, 'utf-8')) as ComplianceTestSuite;
	} catch (e) {
		// Fallback to process.cwd() for other environments
		const fallbackPath = join(
			process.cwd(),
			'node_modules/jsonpath-compliance-test-suite/cts.json',
		);
		return JSON.parse(
			readFileSync(fallbackPath, 'utf-8'),
		) as ComplianceTestSuite;
	}
}

export function matchesOneOf(
	actual: unknown,
	expectedList: unknown[],
): boolean {
	const a = JSON.stringify(actual);
	return expectedList.some((e) => JSON.stringify(e) === a);
}
