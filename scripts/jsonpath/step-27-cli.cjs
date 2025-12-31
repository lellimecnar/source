/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 27)

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'cli');

write(
	path.join(pkgDir, 'bin', 'jsonpath.js'),
	"#!/usr/bin/env node\nimport '../index.js';\n",
);

write(
	path.join(pkgDir, 'src', 'config.ts'),
	`export type JsonPathCliConfig = {\n\tpath: string;\n\tjson: unknown;\n\tresultType?: 'value' | 'node' | 'path' | 'pointer' | 'parent';\n};\n\nexport function parseConfig(input: unknown): JsonPathCliConfig {\n\tif (!input || typeof input !== 'object') throw new Error('Config must be an object.');\n\tconst obj = input as any;\n\tif (typeof obj.path !== 'string') throw new Error('Config.path must be a string.');\n\treturn {\n\t\tpath: obj.path,\n\t\tjson: obj.json,\n\t\tresultType: obj.resultType,\n\t};\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'run.ts'),
	`import fs from 'node:fs';\n\nimport { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';\n\nimport { parseConfig } from './config';\n\nexport function runJsonPathCli(configPath: string): unknown[] {\n\tconst raw = fs.readFileSync(configPath, 'utf8');\n\tconst parsed = parseConfig(JSON.parse(raw));\n\n\tconst engine = createRfc9535Engine();\n\tconst compiled = engine.compile(parsed.path);\n\treturn engine.evaluateSync(compiled, parsed.json, { resultType: parsed.resultType });\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`import process from 'node:process';\n\nimport { runJsonPathCli } from './run';\n\nfunction main(): void {\n\tconst configPath = process.argv[2];\n\tif (!configPath) {\n\t\tprocess.stderr.write('Usage: jsonpath <config.json>\\n');\n\t\tprocess.exit(2);\n\t}\n\tconst results = runJsonPathCli(configPath);\n\tprocess.stdout.write(JSON.stringify(results, null, 2) + '\\n');\n}\n\nmain();\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { parseConfig } from './config';\n\ndescribe('@jsonpath/cli', () => {\n\tit('parses a minimal JSON config', () => {\n\t\tconst cfg = parseConfig({ path: '$.a', json: { a: 1 } });\n\t\texpect(cfg.path).toBe('$.a');\n\t\texpect(cfg.json).toEqual({ a: 1 });\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/cli skeleton');
