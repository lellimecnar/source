/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 15)

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

const resultPlugins = [
	{
		dir: 'jsonpath-plugin-result-value',
		id: '@jsonpath/plugin-result-value',
		capabilities: ['result:value'],
	},
	{
		dir: 'jsonpath-plugin-result-node',
		id: '@jsonpath/plugin-result-node',
		capabilities: ['result:node'],
	},
	{
		dir: 'jsonpath-plugin-result-path',
		id: '@jsonpath/plugin-result-path',
		capabilities: ['result:path'],
	},
	{
		dir: 'jsonpath-plugin-result-pointer',
		id: '@jsonpath/plugin-result-pointer',
		capabilities: ['result:pointer'],
	},
	{
		dir: 'jsonpath-plugin-result-parent',
		id: '@jsonpath/plugin-result-parent',
		capabilities: ['result:parent'],
	},
];

for (const p of resultPlugins) {
	const pkgDir = path.join(repoRoot, 'packages', p.dir);
	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: ${JSON.stringify(p.id)},\n\t\tcapabilities: ${JSON.stringify(p.capabilities)},\n\t},\n};\n`,
	);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { plugin } from './index';\n\ndescribe(${JSON.stringify(p.id)}, () => {\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe(${JSON.stringify(p.id)});\n\t\texpect(plugin.meta.capabilities).toEqual(${JSON.stringify(p.capabilities)});\n\t});\n});\n`,
	);
}

const typesDir = path.join(
	repoRoot,
	'packages',
	'jsonpath',
	'plugin-result-types',
);
write(
	path.join(typesDir, 'src', 'index.ts'),
	`import type { JsonPathPlugin } from '@jsonpath/core';\n\nimport { plugin as value } from '@jsonpath/plugin-result-value';\nimport { plugin as node } from '@jsonpath/plugin-result-node';\nimport { plugin as pathPlugin } from '@jsonpath/plugin-result-path';\nimport { plugin as pointer } from '@jsonpath/plugin-result-pointer';\nimport { plugin as parent } from '@jsonpath/plugin-result-parent';\n\nexport const plugins = [value, node, pathPlugin, pointer, parent] as const satisfies readonly JsonPathPlugin[];\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: '@jsonpath/plugin-result-types',\n\t\tcapabilities: ['result:types'],\n\t\tdependsOn: plugins.map((p) => p.meta.id),\n\t},\n};\n`,
);

write(
	path.join(typesDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { plugin, plugins } from './index';\n\ndescribe('@jsonpath/plugin-result-types', () => {\n\tit('exports plugin list and metadata', () => {\n\t\texpect(plugin.meta.id).toBe('@jsonpath/plugin-result-types');\n\t\texpect(plugins).toHaveLength(5);\n\t});\n});\n`,
);

console.log('Wrote result view plugin shells + aggregator');
