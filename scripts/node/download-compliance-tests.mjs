import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const targetDir = join(
	process.cwd(),
	'node_modules',
	'jsonpath-compliance-test-suite',
);
const repoUrl =
	'https://github.com/jsonpath-standard/jsonpath-compliance-test-suite.git';

if (existsSync(targetDir)) {
	console.log('Compliance test suite already exists. Skipping download.');
	process.exit(0);
}

console.log(`Downloading compliance test suite from ${repoUrl}...`);

try {
	execSync(`git clone --depth 1 ${repoUrl} ${targetDir}`, { stdio: 'inherit' });
	// Remove .git directory to keep it clean
	rmSync(join(targetDir, '.git'), { recursive: true, force: true });
	console.log('Compliance test suite downloaded successfully.');
} catch (error) {
	console.error('Failed to download compliance test suite:', error.message);
	process.exit(1);
}
