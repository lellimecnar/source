import { generateReport } from './reporter.js';

const RESULTS = 'results.json';
const REPORT = 'REPORT.md';

generateReport(RESULTS, REPORT);
console.log(`Wrote ${REPORT}`);
