import { createCompleteEngine } from '@jsonpath/complete';
import fs from 'node:fs';

import { parseConfig } from './config';

export function runJsonPathCli(configPath: string): unknown[] {
	const raw = fs.readFileSync(configPath, 'utf8');
	const parsed = parseConfig(JSON.parse(raw));

	const engine = createCompleteEngine();
	const compiled = engine.compile(parsed.path);
	return engine.evaluateSync(compiled, parsed.json, {
		resultType: parsed.resultType as any,
	});
}
