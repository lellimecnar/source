/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 17)

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
const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', 'plugin-rfc-9535');

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`import type { JsonPathPlugin } from '@jsonpath/core';\nimport { createEngine } from '@jsonpath/core';\n\nimport { plugin as root } from '@jsonpath/plugin-syntax-root';\nimport { plugin as current } from '@jsonpath/plugin-syntax-current';\nimport { plugin as childMember } from '@jsonpath/plugin-syntax-child-member';\nimport { plugin as childIndex } from '@jsonpath/plugin-syntax-child-index';\nimport { plugin as wildcard } from '@jsonpath/plugin-syntax-wildcard';\nimport { plugin as union } from '@jsonpath/plugin-syntax-union';\nimport { plugin as descendant } from '@jsonpath/plugin-syntax-descendant';\nimport { plugin as filterContainer } from '@jsonpath/plugin-syntax-filter';\n\nimport { plugin as literals } from '@jsonpath/plugin-filter-literals';\nimport { plugin as boolOps } from '@jsonpath/plugin-filter-boolean';\nimport { plugin as comparison } from '@jsonpath/plugin-filter-comparison';\nimport { plugin as existence } from '@jsonpath/plugin-filter-existence';\nimport { plugin as functionsCore } from '@jsonpath/plugin-functions-core';\nimport { plugin as filterFunctions } from '@jsonpath/plugin-filter-functions';\nimport { plugin as iregexp } from '@jsonpath/plugin-iregexp';\nimport { plugin as filterRegex } from '@jsonpath/plugin-filter-regex';\n\nimport { plugin as resultValue } from '@jsonpath/plugin-result-value';\nimport { plugin as resultNode } from '@jsonpath/plugin-result-node';\nimport { plugin as resultPath } from '@jsonpath/plugin-result-path';\nimport { plugin as resultPointer } from '@jsonpath/plugin-result-pointer';\nimport { plugin as resultParent } from '@jsonpath/plugin-result-parent';\nimport { plugin as resultTypes } from '@jsonpath/plugin-result-types';\n\nexport const rfc9535Plugins = [\n\troot,\n\tcurrent,\n\tchildMember,\n\tchildIndex,\n\twildcard,\n\tunion,\n\tdescendant,\n\tfilterContainer,\n\tliterals,\n\tboolOps,\n\tcomparison,\n\texistence,\n\tfunctionsCore,\n\tfilterFunctions,\n\tiregexp,\n\tfilterRegex,\n\tresultValue,\n\tresultNode,\n\tresultPath,\n\tresultPointer,\n\tresultParent,\n\tresultTypes,\n] as const satisfies readonly JsonPathPlugin[];\n\nexport function createRfc9535Engine() {\n\treturn createEngine({ plugins: rfc9535Plugins });\n}\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: '@jsonpath/plugin-rfc-9535',\n\t\tcapabilities: ['preset:rfc9535'],\n\t\tdependsOn: rfc9535Plugins.map((p) => p.meta.id),\n\t},\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { createRfc9535Engine, plugin, rfc9535Plugins } from './index';\n\ndescribe('@jsonpath/plugin-rfc-9535', () => {\n\tit('exports a preset list', () => {\n\t\texpect(rfc9535Plugins.length).toBeGreaterThan(5);\n\t});\n\n\tit('creates an engine', () => {\n\t\tconst engine = createRfc9535Engine();\n\t\tconst compiled = engine.compile('$.x');\n\t\texpect(compiled.expression).toBe('$.x');\n\t});\n\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe('@jsonpath/plugin-rfc-9535');\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/plugin-rfc-9535 preset');
