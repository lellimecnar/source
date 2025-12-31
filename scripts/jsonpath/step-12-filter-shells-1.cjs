/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 12)

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

const plugins = [
	{
		dir: 'plugin-filter-literals',
		id: '@jsonpath/plugin-filter-literals',
		capabilities: ['filter:rfc9535:literals'],
	},
	{
		dir: 'plugin-filter-comparison',
		id: '@jsonpath/plugin-filter-comparison',
		capabilities: ['filter:rfc9535:comparison'],
	},
	{
		dir: 'plugin-filter-boolean',
		id: '@jsonpath/plugin-filter-boolean',
		capabilities: ['filter:rfc9535:boolean'],
	},
];

for (const p of plugins) {
	const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', p.dir);

	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: ${JSON.stringify(p.id)},\n\t\tcapabilities: ${JSON.stringify(p.capabilities)},\n\t},\n};\n`,
	);

	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { plugin } from './index';\n\ndescribe(${JSON.stringify(p.id)}, () => {\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe(${JSON.stringify(p.id)});\n\t});\n});\n`,
	);
}

console.log('Wrote RFC 9535 filter plugin shells (part 1)');
