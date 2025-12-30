/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 19)

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
const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', 'pointer');

write(
	path.join(pkgDir, 'src', 'forbidden.ts'),
	`export const ForbiddenPointerSegments = new Set(['__proto__', 'prototype', 'constructor']);\n\nexport function assertNotForbiddenSegment(segment: string): void {\n\tif (ForbiddenPointerSegments.has(segment)) {\n\t\tthrow new Error(\`Forbidden JSON Pointer segment: \${segment}\`);\n\t}\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'parse.ts'),
	`import { assertNotForbiddenSegment } from './forbidden';\n\nfunction decode(segment: string): string {\n\t// RFC 6901: ~1 => / and ~0 => ~\n\treturn segment.replace(/~1/g, '/').replace(/~0/g, '~');\n}\n\nexport function parsePointer(pointer: string): string[] {\n\tif (pointer === '') return [];\n\tif (!pointer.startsWith('/')) throw new Error('JSON Pointer must start with "/" or be empty.');\n\tconst parts = pointer.split('/').slice(1).map(decode);\n\tfor (const p of parts) assertNotForbiddenSegment(p);\n\treturn parts;\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'get.ts'),
	`import { parsePointer } from './parse';\n\nexport function getByPointer(root: unknown, pointer: string): unknown {\n\tconst parts = parsePointer(pointer);\n\tlet current: any = root as any;\n\tfor (const part of parts) {\n\t\tif (current == null) return undefined;\n\t\tcurrent = current[part];\n\t}\n\treturn current;\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'mutate.ts'),
	`import { parsePointer } from './parse';\n\nfunction isObjectLike(value: unknown): value is Record<string, unknown> | unknown[] {\n\treturn typeof value === 'object' && value !== null;\n}\n\nfunction cloneContainer(value: unknown): any {\n\tif (Array.isArray(value)) return value.slice();\n\tif (isObjectLike(value)) return { ...(value as any) };\n\treturn value;\n}\n\nexport function setByPointer(root: unknown, pointer: string, value: unknown): unknown {\n\tconst parts = parsePointer(pointer);\n\tif (parts.length === 0) throw new Error('Cannot set the document root via JSON Pointer.');\n\n\tconst nextRoot: any = cloneContainer(root);\n\tlet current: any = nextRoot;\n\tlet original: any = root as any;\n\n\tfor (let i = 0; i < parts.length - 1; i += 1) {\n\t\tconst part = parts[i];\n\t\tconst origChild = isObjectLike(original) ? (original as any)[part] : undefined;\n\t\tconst child = cloneContainer(origChild ?? {});\n\t\t(current as any)[part] = child;\n\t\tcurrent = child;\n\t\toriginal = origChild;\n\t}\n\n\tconst last = parts[parts.length - 1];\n\t(current as any)[last] = value;\n\treturn nextRoot;\n}\n\nexport function removeByPointer(root: unknown, pointer: string): unknown {\n\tconst parts = parsePointer(pointer);\n\tif (parts.length === 0) throw new Error('Cannot remove the document root via JSON Pointer.');\n\n\tconst nextRoot: any = cloneContainer(root);\n\tlet current: any = nextRoot;\n\tlet original: any = root as any;\n\n\tfor (let i = 0; i < parts.length - 1; i += 1) {\n\t\tconst part = parts[i];\n\t\tconst origChild = isObjectLike(original) ? (original as any)[part] : undefined;\n\t\tif (!isObjectLike(origChild)) return nextRoot;\n\t\tconst child = cloneContainer(origChild);\n\t\t(current as any)[part] = child;\n\t\tcurrent = child;\n\t\toriginal = origChild;\n\t}\n\n\tconst last = parts[parts.length - 1];\n\tif (Array.isArray(current)) {\n\t\tconst idx = Number(last);\n\t\tif (Number.isInteger(idx)) current.splice(idx, 1);\n\t\treturn nextRoot;\n\t}\n\tif (isObjectLike(current)) {\n\t\tdelete (current as any)[last];\n\t}\n\treturn nextRoot;\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`export { ForbiddenPointerSegments, assertNotForbiddenSegment } from './forbidden';\nexport { parsePointer } from './parse';\nexport { getByPointer } from './get';\nexport { setByPointer, removeByPointer } from './mutate';\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { getByPointer, removeByPointer, setByPointer } from './index';\n\ndescribe('@jsonpath/pointer', () => {\n\tit('gets values', () => {\n\t\texpect(getByPointer({ a: { b: 1 } }, '/a/b')).toBe(1);\n\t\texpect(getByPointer({ a: { b: 1 } }, '/a/missing')).toBeUndefined();\n\t});\n\n\tit('sets values immutably', () => {\n\t\tconst root = { a: { b: 1 } };\n\t\tconst next = setByPointer(root, '/a/b', 2) as any;\n\t\texpect((root as any).a.b).toBe(1);\n\t\texpect(next.a.b).toBe(2);\n\t});\n\n\tit('rejects forbidden segments', () => {\n\t\texpect(() => setByPointer({}, '/__proto__/x', 1)).toThrow(/Forbidden JSON Pointer segment/);\n\t\texpect(() => removeByPointer({}, '/constructor/x')).toThrow(/Forbidden JSON Pointer segment/);\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/pointer (hardened)');
