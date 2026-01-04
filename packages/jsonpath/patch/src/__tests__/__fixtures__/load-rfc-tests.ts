import * as fs from 'node:fs';
import { createRequire } from 'node:module';

import type { RFC6902TestCase } from './rfc6902-types.js';

const require = createRequire(import.meta.url);

export type RFC6902SuiteFile = 'spec_tests.json' | 'tests.json';

function resolveSuiteFilePath(file: RFC6902SuiteFile): string | null {
	const candidates = [
		`json-patch-test-suite/${file}`,
		`json-patch-tests/${file}`,
	];

	for (const candidate of candidates) {
		try {
			return require.resolve(candidate);
		} catch {
			// keep trying
		}
	}

	return null;
}

export function loadRFC6902TestCases(
	file: RFC6902SuiteFile,
): RFC6902TestCase[] | null {
	const filePath = resolveSuiteFilePath(file);
	if (!filePath) {
		return null;
	}

	const raw = fs.readFileSync(filePath, 'utf8');
	const parsed = JSON.parse(raw) as unknown;

	if (!Array.isArray(parsed)) {
		throw new Error(`RFC6902 suite ${file} did not parse to an array`);
	}

	return parsed as RFC6902TestCase[];
}
