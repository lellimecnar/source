import fs from 'node:fs';

import { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

import { parseConfig } from './config';

export function runJsonPathCli(configPath: string): unknown[] {
	const raw = fs.readFileSync(configPath, 'utf8');
	const parsed = parseConfig(JSON.parse(raw));

	const engine = createRfc9535Engine();
	const compiled = engine.compile(parsed.path);
	return engine.evaluateSync(compiled, parsed.json, {
		resultType: parsed.resultType,
	});
}
