/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 18)

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
	'plugin-script-expressions',
);

write(
	path.join(pkgDir, 'src', 'compartment.ts'),
	`import 'ses';\n\nexport type CreateCompartmentOptions = {\n\tendowments?: Record<string, unknown>;\n};\n\nexport function createCompartment(options: CreateCompartmentOptions = {}) {\n\tconst Compartment = globalThis.Compartment as unknown;\n\tif (typeof Compartment !== 'function') {\n\t\tthrow new Error('SES Compartment is not available. Ensure "ses" is installed and imported.');\n\t}\n\treturn new (Compartment as any)(options.endowments ?? {});\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport { createCompartment } from './compartment';\nexport type { CreateCompartmentOptions } from './compartment';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: '@jsonpath/plugin-script-expressions',\n\t\tcapabilities: ['filter:script:ses'],\n\t},\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { createCompartment, plugin } from './index';\n\ndescribe('@jsonpath/plugin-script-expressions', () => {\n\tit('creates a SES compartment', () => {\n\t\tconst c = createCompartment({ endowments: { x: 1 } });\n\t\texpect(typeof (c as any).evaluate).toBe('function');\n\t});\n\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe('@jsonpath/plugin-script-expressions');\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/plugin-script-expressions');
