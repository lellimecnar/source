/**
 * Generate a comprehensive benchmark report from Vitest JSON output.
 *
 * Usage: pnpm generate-report [--input <path>] [--output <path>]
 *
 * Reads benchmark results from Vitest's JSON output file and produces
 * a human-readable markdown report with performance metrics, comparisons,
 * and insights.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateMarkdownFromVitestJson } from '../src/utils/reporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse command-line arguments
const args = process.argv.slice(2);
let inputPath = path.join(__dirname, '../results.json');
let outputPath = path.join(__dirname, '../BENCHMARK_RESULTS.md');

for (let i = 0; i < args.length; i++) {
	if (args[i] === '--input' && i + 1 < args.length) {
		inputPath = path.resolve(args[i + 1]);
		i++;
	} else if (args[i] === '--output' && i + 1 < args.length) {
		outputPath = path.resolve(args[i + 1]);
		i++;
	}
}

// Validate input exists
if (!fs.existsSync(inputPath)) {
	console.error(`Error: Input file not found: ${inputPath}`);
	console.error(
		'Run benchmarks first: pnpm --filter @data-map/benchmarks bench:full',
	);
	process.exit(1);
}

try {
	console.log(`Reading benchmark results from: ${inputPath}`);
	generateMarkdownFromVitestJson(inputPath, outputPath);
	console.log(`✅ Benchmark report generated: ${outputPath}`);

	// Log file size and basic stats
	const stats = fs.statSync(outputPath);
	const sizeKb = (stats.size / 1024).toFixed(2);
	console.log(`   Size: ${sizeKb} KB`);
} catch (error) {
	console.error('Error generating report:', error);
	process.exit(1);
}
