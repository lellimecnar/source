/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 4)

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}
function write(p, c) {
	ensureDir(path.dirname(p));
	fs.writeFileSync(p, c, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'ast');

write(
	path.join(pkgDir, 'src', 'nodes.ts'),
	`export type AstNodeBase<TKind extends string> = {\n\tkind: TKind;\n};\n\nexport type JsonPathAst = PathNode;\n\nexport type PathNode = AstNodeBase<'Path'> & {\n\tsegments: SegmentNode[];\n};\n\nexport type SegmentNode = AstNodeBase<'Segment'> & {\n\tselectors: SelectorNode[];\n};\n\nexport type SelectorNode = AstNodeBase<string> & Record<string, unknown>;\n\nexport function path(segments: SegmentNode[]): PathNode {\n\treturn { kind: 'Path', segments };\n}\n\nexport function segment(selectors: SelectorNode[]): SegmentNode {\n\treturn { kind: 'Segment', selectors };\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'visitor.ts'),
	`import type { PathNode, SegmentNode, SelectorNode } from './nodes';\n\nexport type Visitor = {\n\tPath?: (node: PathNode) => void;\n\tSegment?: (node: SegmentNode) => void;\n\tSelector?: (node: SelectorNode) => void;\n};\n\nexport function visitPath(node: PathNode, visitor: Visitor): void {\n\tvisitor.Path?.(node);\n\tfor (const seg of node.segments) {\n\t\tvisitor.Segment?.(seg);\n\t\tfor (const sel of seg.selectors) visitor.Selector?.(sel);\n\t}\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'printable.ts'),
	`import type { JsonPathAst } from './nodes';\n\nexport type PrintableAst = {\n\tast: JsonPathAst;\n};\n\nexport function printable(ast: JsonPathAst): PrintableAst {\n\treturn { ast };\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`export * from './nodes';\nexport * from './visitor';\nexport * from './printable';\n`,
);

write(
	path.join(pkgDir, 'src', 'nodes.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { path, segment } from './nodes';\n\ndescribe('@jsonpath/ast', () => {\n\tit('constructs a basic AST', () => {\n\t\tconst ast = path([segment([{ kind: 'Root' }])]);\n\t\texpect(ast.kind).toBe('Path');\n\t\texpect(ast.segments).toHaveLength(1);\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/ast');
