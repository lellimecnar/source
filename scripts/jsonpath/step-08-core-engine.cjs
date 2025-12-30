/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 8)

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}
function write(p, c) {
	ensureDir(path.dirname(p));
	fs.writeFileSync(p, c, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'core');

write(
	path.join(pkgDir, 'src', 'engine.ts'),
	`import type { PathNode } from '@jsonpath/ast';\n\nexport type CompileResult = {\n\texpression: string;\n\tast: PathNode;\n};\n\nexport type EvaluateOptions = {\n\tresultType?: 'value' | 'node' | 'path' | 'pointer' | 'parent';\n};\n\nexport type JsonPathEngine = {\n\tcompile: (expression: string) => CompileResult;\n\tparse: (expression: string) => PathNode;\n\tevaluateSync: (compiled: CompileResult, json: unknown, options?: EvaluateOptions) => unknown[];\n\tevaluateAsync: (compiled: CompileResult, json: unknown, options?: EvaluateOptions) => Promise<unknown[]>;\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'createEngine.ts'),
	`import { Scanner, TokenStream } from '@jsonpath/lexer';\nimport { JsonPathParser } from '@jsonpath/parser';\nimport { path } from '@jsonpath/ast';\n\nimport type { JsonPathEngine, CompileResult, EvaluateOptions } from './engine';\nimport type { JsonPathPlugin } from './plugins/types';\nimport { resolvePlugins } from './plugins/resolve';\n\nexport type CreateEngineOptions = {\n\tplugins: readonly JsonPathPlugin[];\t\n\toptions?: {\n\t\tmaxDepth?: number;\n\t\tmaxResults?: number;\n\t};\n};\n\nexport function createEngine({ plugins }: CreateEngineOptions): JsonPathEngine {\n\t// Resolve (deterministic order + deps + conflicts)\n\tresolvePlugins(plugins);\n\n\tconst scanner = new Scanner();\t\n\tconst parser = new JsonPathParser();\n\n\tconst parse = (expression: string) => {\n\t\tconst tokens = scanner.scanAll(expression);\n\t\treturn parser.parse({ input: expression, tokens: new TokenStream(tokens) }) ?? path([]);\n\t};\n\n\tconst compile = (expression: string): CompileResult => ({ expression, ast: parse(expression) });\n\n\tconst evaluateSync = (_compiled: CompileResult, _json: unknown, _options?: EvaluateOptions) => {\n\t\t// Framework-only: evaluation semantics are provided by plugins.\n\t\treturn [];\n\t};\n\n\tconst evaluateAsync = async (compiled: CompileResult, json: unknown, options?: EvaluateOptions) =>\n\t\tevaluateSync(compiled, json, options);\n\n\treturn { compile, parse, evaluateSync, evaluateAsync };\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'compile.ts'),
	`export { createEngine } from './createEngine';\n`,
);

write(
	path.join(pkgDir, 'src', 'engine.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { createEngine } from './createEngine';\n\ndescribe('@jsonpath/core engine', () => {\n\tit('creates an engine and compiles expressions', () => {\n\t\tconst engine = createEngine({ plugins: [] });\n\t\tconst compiled = engine.compile('$.x');\n\t\texpect(compiled.expression).toBe('$.x');\n\t\texpect(compiled.ast.kind).toBe('Path');\n\t});\n});\n`,
);

// Re-export createEngine
const indexPath = path.join(pkgDir, 'src', 'index.ts');
const existingIndex = fs.readFileSync(indexPath, 'utf8');
if (!existingIndex.includes('createEngine')) {
	fs.writeFileSync(
		indexPath,
		existingIndex +
			"\nexport { createEngine } from './createEngine';\nexport type { JsonPathEngine } from './engine';\n",
		'utf8',
	);
}

console.log('Wrote @jsonpath/core engine wiring');
