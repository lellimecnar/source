/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 22)

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(
	process.cwd(),
	'packages',
	'jsonpath',
	'plugin-validate',
);

write(
	path.join(pkgDir, 'src', 'types.ts'),
	`export type Issue = {\n\tmessage: string;\n\tcode?: string;\n\tpath?: string;\n\tmeta?: unknown;\n};\n\nexport type ValidatorAdapter = {\n\tid: string;\n\tvalidate: (value: unknown) => readonly Issue[];\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'validate.ts'),
	`import type { Issue, ValidatorAdapter } from './types';\n\nexport function validateAll(values: readonly unknown[], adapter: ValidatorAdapter): Issue[] {\n\tconst issues: Issue[] = [];\n\tfor (const v of values) issues.push(...adapter.validate(v));\n\treturn issues;\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport type { Issue, ValidatorAdapter } from './types';\nexport { validateAll } from './validate';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: '@jsonpath/plugin-validate',\n\t\tcapabilities: ['validate'],\n\t},\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { plugin, validateAll, type ValidatorAdapter } from './index';\n\ndescribe('@jsonpath/plugin-validate', () => {\n\tit('validates multiple values', () => {\n\t\tconst adapter: ValidatorAdapter = {\n\t\t\tid: 'test',\n\t\t\tvalidate: (v) => (v === 1 ? [{ message: 'bad', code: 'E_BAD' }] : []),\n\t\t};\n\t\texpect(validateAll([0, 1, 2], adapter)).toEqual([{ message: 'bad', code: 'E_BAD' }]);\n\t});\n\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe('@jsonpath/plugin-validate');\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/plugin-validate');
