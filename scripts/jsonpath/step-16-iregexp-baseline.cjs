/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 16)

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
const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', 'plugin-iregexp');

write(
	path.join(pkgDir, 'src', 'iregexp.ts'),
	`export function matches(pattern: string, value: string): boolean {\n\ttry {\n\t\treturn new RegExp(pattern).test(value);\n\t} catch {\n\t\treturn false;\n\t}\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport { matches } from './iregexp';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: '@jsonpath/plugin-iregexp',\n\t\tcapabilities: ['regex:rfc9485:iregexp'],\n\t},\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { matches, plugin } from './index';\n\ndescribe('@jsonpath/plugin-iregexp', () => {\n\tit('matches via RegExp', () => {\n\t\texpect(matches('^a', 'abc')).toBe(true);\n\t\texpect(matches('^a', 'xbc')).toBe(false);\n\t});\n\n\tit('returns false on invalid patterns', () => {\n\t\texpect(matches('(', 'abc')).toBe(false);\n\t});\n\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe('@jsonpath/plugin-iregexp');\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/plugin-iregexp baseline');
