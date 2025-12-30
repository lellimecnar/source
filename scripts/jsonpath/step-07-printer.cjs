/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 7)

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}
function write(p, c) {
	ensureDir(path.dirname(p));
	fs.writeFileSync(p, c, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'printer');

write(
	path.join(pkgDir, 'src', 'options.ts'),
	`export type PrintOptions = {\n\t// Reserved for future stable formatting options\n\tmode?: 'compact' | 'pretty';\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'printer.ts'),
	`import type { JsonPathAst } from '@jsonpath/ast';\nimport type { PrintOptions } from './options';\n\nexport function printAst(ast: JsonPathAst, _options?: PrintOptions): string {\n\t// Framework-only stable placeholder: emits a minimal sentinel.\n\t// Result/path plugins own stable JSONPath formatting.\n\treturn ast.kind === 'Path' ? '$' : '$';\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`export * from './options';\nexport * from './printer';\n`,
);

write(
	path.join(pkgDir, 'src', 'printer.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { path } from '@jsonpath/ast';\nimport { printAst } from './printer';\n\ndescribe('@jsonpath/printer', () => {\n\tit('prints a placeholder path', () => {\n\t\texpect(printAst(path([]))).toBe('$');\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/printer');
