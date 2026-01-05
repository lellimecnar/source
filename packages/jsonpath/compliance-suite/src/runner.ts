import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
	const ctsPath = join(
		process.cwd(),
		'../../../node_modules/jsonpath-compliance-test-suite/cts.json',
	);
	return JSON.parse(readFileSync(ctsPath, 'utf-8')) as ComplianceTestSuite;
}

export function matchesOneOf(
	actual: unknown,
	expectedList: unknown[],
): boolean {
	const a = JSON.stringify(actual);
	return expectedList.some((e) => JSON.stringify(e) === a);
}
