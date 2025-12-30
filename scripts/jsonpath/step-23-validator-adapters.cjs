/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 23)

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

// Ajv adapter
{
	const pkgDir = path.join(
		repoRoot,
		'packages',
		'jsonpath',
		'validator-json-schema',
	);
	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import Ajv from 'ajv';\n\nimport type { Issue, ValidatorAdapter } from '@jsonpath/plugin-validate';\n\nexport type JsonSchema = Record<string, unknown>;\n\nexport function createJsonSchemaAdapter(schema: JsonSchema): ValidatorAdapter {\n\tconst ajv = new Ajv({ allErrors: true, strict: false });\n\tconst validate = ajv.compile(schema as any);\n\n\treturn {\n\t\tid: '@jsonpath/validator-json-schema',\n\t\tvalidate: (value: unknown): Issue[] => {\n\t\t\tconst ok = validate(value as any);\n\t\t\tif (ok) return [];\n\t\t\tconst errors = validate.errors ?? [];\n\t\t\treturn errors.map((e) => ({\n\t\t\t\tmessage: e.message ?? 'Schema validation error',\n\t\t\t\tcode: String(e.keyword ?? 'schema'),\n\t\t\t\tpath: String(e.instancePath ?? ''),\n\t\t\t\tmeta: e,\n\t\t\t}));\n\t\t},\n\t};\n}\n`,
	);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { createJsonSchemaAdapter } from './index';\n\ndescribe('@jsonpath/validator-json-schema', () => {\n\tit('returns issues for invalid values', () => {\n\t\tconst adapter = createJsonSchemaAdapter({ type: 'number' });\n\t\texpect(adapter.validate('x').length).toBeGreaterThan(0);\n\t\texpect(adapter.validate(1)).toEqual([]);\n\t});\n});\n`,
	);
}

// Zod adapter
{
	const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', 'validator-zod');
	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import type { ZodTypeAny } from 'zod';\n\nimport type { Issue, ValidatorAdapter } from '@jsonpath/plugin-validate';\n\nexport function createZodAdapter(schema: ZodTypeAny): ValidatorAdapter {\n\treturn {\n\t\tid: '@jsonpath/validator-zod',\n\t\tvalidate: (value: unknown): Issue[] => {\n\t\t\tconst result = schema.safeParse(value);\n\t\t\tif (result.success) return [];\n\t\t\treturn result.error.issues.map((i) => ({\n\t\t\t\tmessage: i.message,\n\t\t\t\tcode: i.code,\n\t\t\t\tpath: i.path.length ? '/' + i.path.join('/') : '',\n\t\t\t\tmeta: i,\n\t\t\t}));\n\t\t},\n\t};\n}\n`,
	);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { z } from 'zod';\n\nimport { createZodAdapter } from './index';\n\ndescribe('@jsonpath/validator-zod', () => {\n\tit('returns issues for invalid values', () => {\n\t\tconst adapter = createZodAdapter(z.object({ a: z.number() }));\n\t\texpect(adapter.validate({ a: 'x' }).length).toBeGreaterThan(0);\n\t\texpect(adapter.validate({ a: 1 })).toEqual([]);\n\t});\n});\n`,
	);
}

// Yup adapter
{
	const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', 'validator-yup');
	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import type { AnySchema, ValidationError } from 'yup';\n\nimport type { Issue, ValidatorAdapter } from '@jsonpath/plugin-validate';\n\nexport function createYupAdapter(schema: AnySchema): ValidatorAdapter {\n\treturn {\n\t\tid: '@jsonpath/validator-yup',\n\t\tvalidate: (value: unknown): Issue[] => {\n\t\t\ttry {\n\t\t\t\tschema.validateSync(value, { abortEarly: false });\n\t\t\t\treturn [];\n\t\t\t} catch (err) {\n\t\t\t\tconst e = err as ValidationError;\n\t\t\t\tconst inner = e.inner?.length ? e.inner : [e];\n\t\t\t\treturn inner.map((i) => ({\n\t\t\t\t\tmessage: i.message,\n\t\t\t\t\tcode: i.type ?? 'yup',\n\t\t\t\t\tpath: i.path ? '/' + String(i.path).split('.').join('/') : '',\n\t\t\t\t\tmeta: i,\n\t\t\t\t}));\n\t\t\t}\n\t\t},\n\t};\n}\n`,
	);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport * as yup from 'yup';\n\nimport { createYupAdapter } from './index';\n\ndescribe('@jsonpath/validator-yup', () => {\n\tit('returns issues for invalid values', () => {\n\t\tconst adapter = createYupAdapter(yup.object({ a: yup.number().required() }));\n\t\texpect(adapter.validate({ a: 'x' }).length).toBeGreaterThan(0);\n\t\texpect(adapter.validate({ a: 1 })).toEqual([]);\n\t});\n});\n`,
	);
}

console.log('Wrote validator adapters');
