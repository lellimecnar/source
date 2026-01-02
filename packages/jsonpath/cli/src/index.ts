import process from 'node:process';

import { runJsonPathCli } from './run';

function main(): void {
	const configPath = process.argv[2];
	if (!configPath) {
		process.stderr.write('Usage: jsonpath <config.json>\n');
		process.exit(2);
	}
	const results = runJsonPathCli(configPath);
	process.stdout.write(JSON.stringify(results, null, 2) + '\n');
}

main();
