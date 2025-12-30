/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 25)

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

// dchester/jsonpath compat
{
	const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', 'compat-jsonpath');
	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import jp from 'jsonpath';\n\n// Minimal drop-in surface: re-export the library API.\n\nexport default jp;\nexport const { query, value, paths, nodes, parent, apply } = jp as any;\n`,
	);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport jp, { query } from './index';\n\ndescribe('@jsonpath/compat-jsonpath', () => {\n\tit('delegates to jsonpath', () => {\n\t\tconst obj = { a: { b: 1 } };\n\t\texpect(query(obj, '$.a.b')).toEqual([1]);\n\t\texpect((jp as any).query(obj, '$.a.b')).toEqual([1]);\n\t});\n});\n`,
	);
}

// jsonpath-plus compat
{
	const pkgDir = path.join(
		repoRoot,
		'packages',
		'jsonpath',
		'compat-jsonpath-plus',
	);
	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`export { JSONPath } from 'jsonpath-plus';\n\nexport type JSONPathEvalMode = 'safe' | 'native' | false;\n\nexport function readJsonPath(json: unknown, pathExpr: string, evalMode: JSONPathEvalMode = 'safe'): unknown {\n\tconst results = JSONPath<unknown[]>({ path: pathExpr, json: json as any, wrap: true, eval: evalMode });\n\tif (!Array.isArray(results) || results.length === 0) return undefined;\n\tif (results.length === 1) return results[0];\n\treturn results;\n}\n\nexport function findJsonPathPointers(json: unknown, pathExpr: string, evalMode: JSONPathEvalMode = 'safe'): string[] {\n\tconst pointers = JSONPath<string[]>({ path: pathExpr, json: json as any, wrap: true, resultType: 'pointer', eval: evalMode });\n\treturn Array.isArray(pointers) ? pointers : [];\n}\n`,
	);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { findJsonPathPointers, readJsonPath } from './index';\n\ndescribe('@jsonpath/compat-jsonpath-plus', () => {\n\tit('reads values and enumerates pointers', () => {\n\t\tconst obj = { a: { b: 1 } };\n\t\texpect(readJsonPath(obj, '$.a.b')).toBe(1);\n\t\texpect(findJsonPathPointers(obj, '$.a.b')).toEqual(['/a/b']);\n\t});\n});\n`,
	);
}

console.log('Wrote initial compat shims');
