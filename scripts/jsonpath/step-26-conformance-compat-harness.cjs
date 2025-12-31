/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 26)

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

// Conformance corpus
{
	const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', 'conformance');
	write(
		path.join(pkgDir, 'src', 'corpus.ts'),
		`export type ConformanceDocument = {\n\tname: string;\n\tjson: unknown;\n};\n\nexport type ConformanceCase = {\n\tname: string;\n\tpath: string;\n};\n\nexport const documents: ConformanceDocument[] = [\n\t{ name: 'simple', json: { a: { b: 1 }, xs: [1, 2] } },\n];\n\nexport const cases: ConformanceCase[] = [\n\t{ name: 'child member', path: '$.a.b' },\n\t{ name: 'array wildcard', path: '$.xs[*]' },\n];\n`,
	);
	write(path.join(pkgDir, 'src', 'index.ts'), `export * from './corpus';\n`);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { cases, documents } from './index';\n\ndescribe('@lellimecnar/jsonpath-conformance', () => {\n\tit('exports a minimal corpus', () => {\n\t\texpect(documents.length).toBeGreaterThan(0);\n\t\texpect(cases.length).toBeGreaterThan(0);\n\t});\n});\n`,
	);
}

// Compat harness
{
	const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', 'compat-harness');
	write(
		path.join(pkgDir, 'src', 'compat.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { JSONPath } from 'jsonpath-plus';\n\nimport { documents } from '@lellimecnar/jsonpath-conformance';\nimport { findJsonPathPointers } from '@jsonpath/compat-jsonpath-plus';\n\ndescribe('@lellimecnar/jsonpath-compat-harness', () => {\n\tit('compares pointer enumeration to upstream jsonpath-plus', () => {\n\t\tconst doc = documents.find((d) => d.name === 'simple')!;\n\t\tconst upstream = JSONPath<string[]>({\n\t\t\tpath: '$.a.b',\n\t\t\tjson: doc.json as any,\n\t\t\twrap: true,\n\t\t\tresultType: 'pointer',\n\t\t\teval: 'safe',\n\t\t});\n\t\tconst ours = findJsonPathPointers(doc.json, '$.a.b', 'safe');\n\t\texpect(ours).toEqual(upstream);\n\t});\n});\n`,
	);
}

console.log('Wrote conformance corpus + compat harness');
