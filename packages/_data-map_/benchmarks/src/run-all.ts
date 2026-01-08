import { execSync } from 'node:child_process';

import { generateReport } from './reporter.js';

const RESULTS = 'results.json';
const REPORT = 'REPORT.md';

execSync('vitest bench --reporter=json --outputFile=results.json', {
	stdio: 'inherit',
});

generateReport(RESULTS, REPORT);
console.log(`Wrote ${REPORT}`);
