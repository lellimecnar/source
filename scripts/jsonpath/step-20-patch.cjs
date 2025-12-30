/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 20)

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
const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', 'patch');

write(
	path.join(pkgDir, 'src', 'types.ts'),
	`export type JsonPatchOp =\n\t| { op: 'add'; path: string; value: unknown }\n\t| { op: 'replace'; path: string; value: unknown }\n\t| { op: 'remove'; path: string };\n`,
);

write(
	path.join(pkgDir, 'src', 'apply.ts'),
	`import type { JsonPatchOp } from './types';\n\nimport { removeByPointer, setByPointer } from '@jsonpath/pointer';\n\nexport function applyPatch(doc: unknown, ops: readonly JsonPatchOp[]): unknown {\n\tlet current: unknown = doc;\n\tfor (const op of ops) {\n\t\tif (op.op === 'add' || op.op === 'replace') {\n\t\t\tcurrent = setByPointer(current, op.path, op.value);\n\t\t\tcontinue;\n\t\t}\n\t\tif (op.op === 'remove') {\n\t\t\tcurrent = removeByPointer(current, op.path);\n\t\t\tcontinue;\n\t\t}\n\t\tconst _exhaustive: never = op;\n\t\tthrow new Error('Unsupported JSON Patch operation');\n\t}\n\treturn current;\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`export type { JsonPatchOp } from './types';\nexport { applyPatch } from './apply';\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { applyPatch } from './index';\n\ndescribe('@jsonpath/patch', () => {\n\tit('applies add/replace/remove operations', () => {\n\t\tconst doc = { a: { b: 1 }, xs: [1, 2, 3] };\n\t\tconst next = applyPatch(doc, [\n\t\t\t{ op: 'replace', path: '/a/b', value: 2 },\n\t\t\t{ op: 'add', path: '/a/c', value: 3 },\n\t\t\t{ op: 'remove', path: '/xs/1' },\n\t\t]) as any;\n\t\texpect((doc as any).a.b).toBe(1);\n\t\texpect(next.a.b).toBe(2);\n\t\texpect(next.a.c).toBe(3);\n\t\texpect(next.xs).toEqual([1, 3]);\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/patch');
