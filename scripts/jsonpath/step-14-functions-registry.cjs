/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 14)

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const repoRoot = process.cwd();
const pkgDir = path.join(
	repoRoot,
	'packages',
	'jsonpath',
	'plugin-functions-core',
);

write(
	path.join(pkgDir, 'src', 'registry.ts'),
	`export type JsonPathFunction = (...args: unknown[]) => unknown;\n\nexport class FunctionRegistry {\n\tprivate readonly fns: Map<string, JsonPathFunction> = new Map();\n\n\tpublic register(name: string, fn: JsonPathFunction): void {\n\t\tthis.fns.set(name, fn);\n\t}\n\n\tpublic get(name: string): JsonPathFunction | undefined {\n\t\treturn this.fns.get(name);\n\t}\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport { FunctionRegistry } from './registry';\nexport type { JsonPathFunction } from './registry';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: '@jsonpath/plugin-functions-core',\n\t\tcapabilities: ['functions:rfc9535:core'],\n\t},\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { FunctionRegistry, plugin } from './index';\n\ndescribe('@jsonpath/plugin-functions-core', () => {\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe('@jsonpath/plugin-functions-core');\n\t\texpect(plugin.meta.capabilities).toEqual(['functions:rfc9535:core']);\n\t});\n\n\tit('registers and resolves functions', () => {\n\t\tconst r = new FunctionRegistry();\n\t\tr.register('len', (x) => String(x).length);\n\t\texpect(r.get('len')?.('abc')).toBe(3);\n\t});\n});\n`,
);

console.log('Wrote FunctionRegistry + plugin shell');
