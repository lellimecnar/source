import { existsSync } from 'node:fs';
import { generateMarkdownFromVitestJson } from '../dist/utils/reporter.js';

const jsonPath = new URL('../results.json', import.meta.url).pathname;
const mdPath = new URL('../RESULTS.md', import.meta.url).pathname;

if (!existsSync(jsonPath)) {
	throw new Error(
		'Missing results.json. Run: pnpm --filter @jsonpath/benchmarks bench:full',
	);
}

generateMarkdownFromVitestJson(jsonPath, mdPath);
console.log('Wrote RESULTS.md');
