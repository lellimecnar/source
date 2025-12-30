/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 6)

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}
function write(p, c) {
	ensureDir(path.dirname(p));
	fs.writeFileSync(p, c, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'parser');

write(
	path.join(pkgDir, 'src', 'context.ts'),
	`import type { TokenStream } from '@jsonpath/lexer';\n\nexport type ParserContext = {\n\tinput: string;\n\ttokens: TokenStream;\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'pratt', 'types.ts'),
	`export type PrattOperator = {\n\tid: string;\n\tprecedence: number;\n};\n\nexport class PrattRegistry {\n\tprivate readonly ops: PrattOperator[] = [];\n\tpublic register(op: PrattOperator): void {\n\t\tthis.ops.push(op);\n\t}\n\tpublic all(): readonly PrattOperator[] {\n\t\treturn this.ops;\n\t}\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'parser.ts'),
	`import type { ParserContext } from './context';\nimport type { PathNode } from '@jsonpath/ast';\nimport { path } from '@jsonpath/ast';\n\nexport type SegmentParser = (ctx: ParserContext) => PathNode | null;\n\nexport class JsonPathParser {\n\tprivate readonly segmentParsers: SegmentParser[] = [];\n\tpublic registerSegmentParser(p: SegmentParser): void {\n\t\tthis.segmentParsers.push(p);\n\t}\n\tpublic parse(ctx: ParserContext): PathNode {\n\t\t// Framework-only placeholder: returns empty path when no parsers installed.\n\t\tfor (const p of this.segmentParsers) {\n\t\t\tconst result = p(ctx);\n\t\t\tif (result) return result;\n\t\t}\n\t\treturn path([]);\n\t}\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`export * from './context';\nexport * from './parser';\nexport * from './pratt/types';\n`,
);

write(
	path.join(pkgDir, 'src', 'pratt.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { PrattRegistry } from './pratt/types';\n\ndescribe('@jsonpath/parser pratt', () => {\n\tit('registers operators', () => {\n\t\tconst r = new PrattRegistry();\n\t\tr.register({ id: '==', precedence: 10 });\n\t\texpect(r.all()).toHaveLength(1);\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/parser');
