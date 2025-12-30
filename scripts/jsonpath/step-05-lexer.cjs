/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 5)

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}
function write(p, c) {
	ensureDir(path.dirname(p));
	fs.writeFileSync(p, c, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'lexer');

write(
	path.join(pkgDir, 'src', 'token.ts'),
	`export type TokenKind = string;\n\nexport type Token = {\n\tkind: TokenKind;\n\tlexeme: string;\n\toffset: number;\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'stream.ts'),
	`import type { Token } from './token';\n\nexport class TokenStream {\n\tprivate readonly tokens: readonly Token[];\n\tprivate index = 0;\n\n\tpublic constructor(tokens: readonly Token[]) {\n\t\tthis.tokens = tokens;\n\t}\n\n\tpublic peek(): Token | undefined {\n\t\treturn this.tokens[this.index];\n\t}\n\n\tpublic next(): Token | undefined {\n\t\tconst t = this.tokens[this.index];\n\t\tif (t) this.index += 1;\n\t\treturn t;\n\t}\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'scanner.ts'),
	`import type { Token, TokenKind } from './token';\n\nexport type ScanRule = (input: string, offset: number) => Token | null;\n\nexport class Scanner {\n\tprivate readonly rules: Map<TokenKind, ScanRule> = new Map();\n\n\tpublic register(kind: TokenKind, rule: ScanRule): void {\n\t\tthis.rules.set(kind, rule);\n\t}\n\n\tpublic scanAll(input: string): Token[] {\n\t\tconst tokens: Token[] = [];\n\t\tlet offset = 0;\n\t\twhile (offset < input.length) {\n\t\t\tlet matched = false;\n\t\t\t// Skip whitespace by default\n\t\t\tconst ch = input[offset];\n\t\t\tif (ch === ' ' || ch === '\\t' || ch === '\\n' || ch === '\\r') {\n\t\t\t\toffset += 1;\n\t\t\t\tcontinue;\n\t\t\t}\n\n\t\t\tfor (const [kind, rule] of this.rules.entries()) {\n\t\t\t\tconst token = rule(input, offset);\n\t\t\t\tif (token) {\n\t\t\t\t\ttokens.push({ ...token, kind });\n\t\t\t\t\toffset += token.lexeme.length;\n\t\t\t\t\tmatched = true;\n\t\t\t\t\tbreak;\n\t\t\t\t}\n\t\t\t}\n\n\t\t\tif (!matched) {\n\t\t\t\t// Unknown character becomes a 1-char token.\n\t\t\t\ttokens.push({ kind: 'Unknown', lexeme: input[offset], offset });\n\t\t\t\toffset += 1;\n\t\t\t}\n\t\t}\n\t\treturn tokens;\n\t}\n}\n`, // gitleaks:allow
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`export * from './token';\nexport * from './scanner';\nexport * from './stream';\n`,
);

write(
	path.join(pkgDir, 'src', 'scanner.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { Scanner } from './scanner';\n\ndescribe('@jsonpath/lexer', () => {\n\tit('scans simple punctuation rules', () => {\n\t\tconst s = new Scanner();\n\t\ts.register('Dollar', (input, offset) => (input[offset] === '$' ? { lexeme: '$', offset, kind: 'Dollar' } : null));\n\t\tconst tokens = s.scanAll('$.');\n\t\texpect(tokens.map((t) => t.kind)).toEqual(['Dollar', 'Unknown']);\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/lexer');
