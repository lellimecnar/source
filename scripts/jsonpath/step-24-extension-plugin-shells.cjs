/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 24)

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
		dir: 'plugin-parent-selector',
		id: '@jsonpath/plugin-parent-selector',
		capabilities: ['extension:parent-selector'],
	},
	{
		dir: 'plugin-property-name-selector',
		id: '@jsonpath/plugin-property-name-selector',
		capabilities: ['extension:property-name-selector'],
	},
	{
		dir: 'plugin-type-selectors',
		id: '@jsonpath/plugin-type-selectors',
		capabilities: ['extension:type-selectors'],
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

console.log('Wrote optional extension plugin shells');
