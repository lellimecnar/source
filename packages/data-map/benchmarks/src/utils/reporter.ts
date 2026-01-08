import { readFileSync, writeFileSync } from 'node:fs';

import { compareAgainstBaseline, type Baseline } from './compare.js';
import { toMarkdownTable, type BenchRow } from './comparisons.js';

function asNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value)
		? value
		: undefined;
}

function pickBenchStats(assertion: any): {
	hz?: number;
	mean?: number;
	rme?: number;
} {
	// Vitest bench JSON has varied across versions; this is best-effort.
	const candidates = [
		assertion?.benchmark,
		assertion?.bench,
		assertion?.result,
		assertion?.results,
		assertion?.meta,
		assertion?.stats,
		assertion?.benchmarkResult,
		assertion?.benchmark?.stats,
		assertion?.benchmark?.result,
		assertion?.benchmark?.results,
	];

	for (const c of candidates) {
		if (!c || typeof c !== 'object') continue;
		const hz = asNumber(c.hz) ?? asNumber(c.ops) ?? asNumber(c.opsPerSec);
		const mean = asNumber(c.mean) ?? asNumber(c.avg) ?? asNumber(c.time);
		const rme = asNumber(c.rme) ?? asNumber(c.relativeMarginOfError);

		if (
			typeof hz !== 'undefined' ||
			typeof mean !== 'undefined' ||
			typeof rme !== 'undefined'
		) {
			return { hz, mean, rme };
		}
	}

	return {};
}

function extractRowsFromVitestJson(parsed: any): BenchRow[] {
	const rows: BenchRow[] = [];
	const suites = parsed?.testResults ?? [];

	for (const suite of suites) {
		for (const t of suite?.assertionResults ?? []) {
			const name = t.title ?? t.fullName ?? 'unknown';
			const stats = pickBenchStats(t);
			rows.push({ name, ...stats });
		}
	}

	return rows;
}

function loadBaseline(): Baseline | null {
	try {
		const baselinePath = new URL('../../baseline.json', import.meta.url)
			.pathname;
		const raw = readFileSync(baselinePath, 'utf8');
		return JSON.parse(raw) as Baseline;
	} catch {
		return null;
	}
}

// This expects Vitest JSON reporter output.
export function generateMarkdownFromVitestJson(
	jsonPath: string,
	mdPath: string,
) {
	const raw = readFileSync(jsonPath, 'utf8');
	const parsed = JSON.parse(raw);
	const rows = extractRowsFromVitestJson(parsed);

	const baseline = loadBaseline();
	const currentOpsPerSec: Record<string, number> = {};
	for (const r of rows) {
		if (typeof r.hz === 'number') currentOpsPerSec[r.name] = r.hz;
	}

	const comparisons = baseline
		? compareAgainstBaseline({
				baseline,
				currentOpsPerSec,
				regressionThresholdPct: 10,
			})
		: [];

	const regressions = comparisons.filter((c) => c.isRegression);

	const md = [
		'# Benchmark Results (generated)',
		'',
		toMarkdownTable(rows),
		'',
		baseline
			? `Baseline comparisons: ${String(comparisons.length)} (regressions: ${String(regressions.length)})`
			: 'Baseline comparisons: skipped (baseline.json not found or unreadable)',
		'',
		regressions.length
			? [
					'## Regressions (>10% slower than baseline)',
					'',
					...regressions.map(
						(r) =>
							`- ${r.key}: ${r.currentOpsPerSec.toFixed(2)} ops/s vs ${r.baselineOpsPerSec.toFixed(2)} ops/s (${r.deltaPct.toFixed(2)}%)`,
					),
					'',
				].join('\n')
			: '',
	]
		.filter(Boolean)
		.join('\n');

	writeFileSync(mdPath, md);
}
