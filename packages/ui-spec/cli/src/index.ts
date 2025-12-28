#!/usr/bin/env node
import { parseArgs } from 'node:util';

import { generateTypesCommand } from './commands/generateTypes';
import { validateCommand } from './commands/validate';

async function main() {
	const { positionals, values } = parseArgs({
		allowPositionals: true,
		options: {
			out: { type: 'string', short: 'o' },
		},
	});

	const [cmd, file] = positionals;
	if (!cmd || !file) {
		process.stderr.write(
			'Usage: uispec <validate|generate-types> <file> [-o out.ts]\n',
		);
		process.exit(1);
	}

	if (cmd === 'validate') {
		const result = await validateCommand(file);
		if (!result.ok) {
			process.stderr.write(`${result.error}\n`);
			process.exit(1);
		}
		process.stdout.write('OK\n');
		return;
	}

	if (cmd === 'generate-types') {
		const out = values.out;
		if (!out) {
			process.stderr.write('Missing -o <out>\n');
			process.exit(1);
		}
		await generateTypesCommand(file, out);
		process.stdout.write('OK\n');
		return;
	}

	process.stderr.write(`Unknown command: ${cmd}\n`);
	process.exit(1);
}

void main();
