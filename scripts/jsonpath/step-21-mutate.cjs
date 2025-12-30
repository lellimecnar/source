/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 21)

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'mutate');

write(
	path.join(pkgDir, 'src', 'mutate.ts'),
	`import { removeByPointer, setByPointer } from '@jsonpath/pointer';\n\nexport function setAll(root: unknown, pointers: readonly string[], value: unknown): unknown {\n\tlet current: unknown = root;\n\tfor (const p of pointers) current = setByPointer(current, p, value);\n\treturn current;\n}\n\nexport function removeAll(root: unknown, pointers: readonly string[]): unknown {\n\tlet current: unknown = root;\n\tfor (const p of pointers) current = removeByPointer(current, p);\n\treturn current;\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`export { setAll, removeAll } from './mutate';\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { removeAll, setAll } from './index';\n\ndescribe('@jsonpath/mutate', () => {\n\tit('sets multiple pointers', () => {\n\t\tconst root = { a: { b: 1 }, c: { d: 2 } };\n\t\tconst next = setAll(root, ['/a/b', '/c/d'], 9) as any;\n\t\texpect((root as any).a.b).toBe(1);\n\t\texpect(next.a.b).toBe(9);\n\t\texpect(next.c.d).toBe(9);\n\t});\n\n\tit('removes multiple pointers', () => {\n\t\tconst root = { a: { b: 1, c: 2 } };\n\t\tconst next = removeAll(root, ['/a/b']) as any;\n\t\texpect((root as any).a.b).toBe(1);\n\t\texpect(next.a.b).toBeUndefined();\n\t\texpect(next.a.c).toBe(2);\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/mutate');
