import { readFileSync, writeFileSync } from 'node:fs';

import { toMarkdownTable, type BenchRow } from './comparisons.js';

// This expects Vitest JSON reporter output.
export function generateMarkdownFromVitestJson(
	jsonPath: string,
	mdPath: string,
) {
	const raw = readFileSync(jsonPath, 'utf8');
	const parsed = JSON.parse(raw);

	const rows: BenchRow[] = [];
	const suites = parsed?.testResults ?? [];
	for (const suite of suites) {
		for (const t of suite?.assertionResults ?? []) {
			// Bench JSON shape varies by Vitest version; keep best-effort parsing.
			rows.push({ name: t.fullName ?? t.title ?? 'unknown' });
		}
	}

	const md = [
		'# Benchmark Results (generated)',
		'',
		toMarkdownTable(rows),
		'',
	].join('\n');

	writeFileSync(mdPath, md);
}
