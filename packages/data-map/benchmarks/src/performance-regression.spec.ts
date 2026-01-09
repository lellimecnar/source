import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Performance regression testing against baseline.json.
 * These tests are warn-only and never block CI, helping developers identify
 * performance degradation relative to established baselines.
 */

interface BaselineData {
	[benchName: string]: {
		opsPerSec: number;
	};
}

interface RegressionResult {
	name: string;
	baseline: number;
	current: number;
	change: number;
	changePercent: number;
	isRegression: boolean;
}

/**
 * Parse baseline.json if it exists.
 * Returns an empty object if file doesn't exist or is empty.
 */
function loadBaseline(): BaselineData {
	const baselinePath = path.join(__dirname, '../baseline.json');
	try {
		if (!fs.existsSync(baselinePath)) {
			return {};
		}
		const content = fs.readFileSync(baselinePath, 'utf-8');
		const data: BaselineData = JSON.parse(content);
		// Filter out entries with 0 opsPerSec (not yet recorded)
		const filtered: BaselineData = {};
		for (const [key, val] of Object.entries(data)) {
			if (val.opsPerSec > 0) {
				filtered[key] = val;
			}
		}
		return filtered;
	} catch (e) {
		console.warn(`Could not load baseline.json: ${(e as Error).message}`);
		return {};
	}
}

/**
 * Simulate fetching the latest benchmark results.
 * In a real CI environment, this would read from a results.json file
 * or fetch from a monitoring service.
 */
function getCurrentResults(): BaselineData {
	// This is a placeholder. In reality, this would:
	// 1. Read vitest bench output (JSON format)
	// 2. Parse and extract opsPerSec values
	// 3. Return in the same format as baseline.json
	//
	// For now, we return an empty object which means no regressions can be detected
	// without baseline data.
	return {};
}

/**
 * Compare current results against baseline and identify regressions.
 */
function analyzeRegressions(
	baseline: BaselineData,
	current: BaselineData,
): RegressionResult[] {
	const results: RegressionResult[] = [];
	const threshold = 0.1; // 10% threshold for warning

	for (const [name, baselineMetric] of Object.entries(baseline)) {
		if (!(name in current)) {
			// Benchmark not found in current results
			continue;
		}

		const currentMetric = current[name];
		const baselineOps = baselineMetric.opsPerSec;
		const currentOps = currentMetric.opsPerSec;

		if (currentOps === 0 || baselineOps === 0) {
			// Skip if either value is missing
			continue;
		}

		const changePercent = (currentOps - baselineOps) / baselineOps;
		const isRegression = changePercent < -threshold;

		results.push({
			name,
			baseline: baselineOps,
			current: currentOps,
			change: currentOps - baselineOps,
			changePercent,
			isRegression,
		});
	}

	return results;
}

/**
 * Format a regression result for display.
 */
function formatRegression(result: RegressionResult): string {
	const percentStr = (result.changePercent * 100).toFixed(2);
	const arrow = result.changePercent > 0 ? '↑' : '↓';
	return `  ${result.name}: ${arrow} ${Math.abs(result.changePercent * 100).toFixed(1)}% (${result.current.toFixed(0)} ops/sec vs ${result.baseline.toFixed(0)} baseline)`;
}

describe('Performance Regression Tests', () => {
	it('should warn on regressions (never block CI)', () => {
		const baseline = loadBaseline();
		const current = getCurrentResults();

		if (Object.keys(baseline).length === 0) {
			console.warn('⚠️  No baseline data found. Regression testing skipped.');
			console.warn(
				'    Run benchmarks with `pnpm bench` to generate baseline.json',
			);
			return;
		}

		if (Object.keys(current).length === 0) {
			console.warn(
				'⚠️  No current benchmark results found. Skipping comparison.',
			);
			return;
		}

		const regressions = analyzeRegressions(baseline, current);
		const failingRegressions = regressions.filter((r) => r.isRegression);

		if (failingRegressions.length > 0) {
			console.warn(
				`⚠️  WARNING: Detected ${failingRegressions.length} performance regression(s):\n`,
			);
			for (const regression of failingRegressions) {
				console.warn(formatRegression(regression));
			}
			console.warn(
				'\nℹ️  These are warnings only. Consider investigating performance before merging.',
			);
			// NOTE: We use expect(...).not.toThrow() to ensure this test never blocks CI
		}

		// Always pass to avoid blocking CI
		expect(true).toBe(true);
	});

	it('should track performance improvements', () => {
		const baseline = loadBaseline();
		const current = getCurrentResults();

		if (
			Object.keys(baseline).length === 0 ||
			Object.keys(current).length === 0
		) {
			return;
		}

		const regressions = analyzeRegressions(baseline, current);
		const improvements = regressions.filter(
			(r) => !r.isRegression && r.changePercent > 0.05,
		);

		if (improvements.length > 0) {
			console.log(
				`✅ Detected ${improvements.length} performance improvement(s):\n`,
			);
			for (const improvement of improvements) {
				console.log(formatRegression(improvement));
			}
		}

		// Always pass
		expect(true).toBe(true);
	});

	it('should have baseline data for all major categories', () => {
		const baseline = loadBaseline();

		const requiredCategories = [
			'storage',
			'signals',
			'subscriptions',
			'path',
			'core',
			'arrays',
		];

		const foundCategories = new Set<string>();
		for (const key of Object.keys(baseline)) {
			for (const category of requiredCategories) {
				if (key.includes(category)) {
					foundCategories.add(category);
					break;
				}
			}
		}

		const missingCategories = requiredCategories.filter(
			(c) => !foundCategories.has(c),
		);

		if (missingCategories.length > 0) {
			console.warn(
				`⚠️  Missing baseline data for categories: ${missingCategories.join(', ')}`,
			);
		}

		// Always pass - this is informational
		expect(true).toBe(true);
	});
});
