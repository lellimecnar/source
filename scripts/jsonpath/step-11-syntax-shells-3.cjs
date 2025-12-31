/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 11)

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
		dir: 'plugin-syntax-descendant',
		id: '@jsonpath/plugin-syntax-descendant',
		capabilities: ['syntax:rfc9535:descendant'],
	},
	{
		dir: 'plugin-syntax-filter',
		id: '@jsonpath/plugin-syntax-filter',
		capabilities: ['syntax:rfc9535:filter'],
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
		`import { describe, expect, it } from 'vitest';\n\nimport { plugin } from './index';\n\ndescribe(${JSON.stringify(p.id)}, () => {\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe(${JSON.stringify(p.id)});\n\t\texpect(plugin.meta.capabilities).toEqual(${JSON.stringify(p.capabilities)});\n\t});\n});\n`,
	);
}

console.log('Wrote RFC 9535 syntax plugin shells (part 3)');
