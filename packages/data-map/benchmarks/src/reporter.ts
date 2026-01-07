import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export function generateReport(resultsPath: string, outPath: string): void {
	if (!existsSync(resultsPath)) {
		throw new Error(
			`Missing ${resultsPath}. Run: pnpm --filter @data-map/benchmarks bench:full`,
		);
	}

	const raw = readFileSync(resultsPath, 'utf-8');
	const parsed: any = JSON.parse(raw);

	// Generate a basic markdown report
	let md = `# @data-map/benchmarks Report

Generated: ${new Date().toISOString()}

## Benchmark Results

| Benchmark | Status |
|-----------|--------|
`;

	// Extract test info from parsed results (Vitest format varies)
	const testResults = parsed?.testResults ?? [];
	for (const suite of testResults) {
		const suiteName = suite.name?.split('/')?.pop() ?? 'unknown';
		const assertions = suite.assertionResults ?? [];
		for (const assertion of assertions) {
			const name = assertion.title ?? 'unnamed';
			const status = assertion.status === 'passed' ? '✓ Passed' : '✗ Failed';
			md += `| ${suiteName}: ${name} | ${status} |\n`;
		}
	}

	md += `\n## Summary\n\n`;
	md += `- Total test suites: ${parsed?.numTestSuites ?? 0}\n`;
	md += `- Tests: ${parsed?.numTests ?? 0}\n`;
	md += `- Time: ${parsed?.testResults?.[0]?.perfStats?.start ?? 'N/A'}\n`;

	writeFileSync(outPath, md);
}
