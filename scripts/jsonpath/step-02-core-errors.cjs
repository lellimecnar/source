/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 2)

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'core');

write(
	path.join(pkgDir, 'src', 'errors', 'codes.ts'),
	`export type JsonPathErrorCode =\n\t| 'JSONPATH_SYNTAX_ERROR'\n\t| 'JSONPATH_EVALUATION_ERROR'\n\t| 'JSONPATH_PLUGIN_ERROR'\n\t| 'JSONPATH_CONFIG_ERROR';\n\nexport const JsonPathErrorCodes = {\n\tSyntax: 'JSONPATH_SYNTAX_ERROR',\n\tEvaluation: 'JSONPATH_EVALUATION_ERROR',\n\tPlugin: 'JSONPATH_PLUGIN_ERROR',\n\tConfig: 'JSONPATH_CONFIG_ERROR',\n} as const satisfies Record<string, JsonPathErrorCode>;\n`,
);

write(
	path.join(pkgDir, 'src', 'errors', 'types.ts'),
	`import type { JsonPathErrorCode } from './codes';\n\nexport type JsonPathLocation = {\n\toffset: number;\n\tline?: number;\n\tcolumn?: number;\n};\n\nexport type JsonPathErrorMeta = {\n\tcode: JsonPathErrorCode;\n\tmessage: string;\n\texpression?: string;\n\tlocation?: JsonPathLocation;\n\tpluginIds?: string[];\n\toptions?: unknown;\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'errors', 'JsonPathError.ts'),
	`import type { JsonPathErrorMeta } from './types';\n\nexport class JsonPathError extends Error {\n\tpublic readonly code: JsonPathErrorMeta['code'];\n\tpublic readonly expression?: string;\n\tpublic readonly location?: JsonPathErrorMeta['location'];\n\tpublic readonly pluginIds?: string[];\n\tpublic readonly options?: unknown;\n\n\tpublic constructor(meta: JsonPathErrorMeta, cause?: unknown) {\n\t\tsuper(meta.message, cause ? { cause } : undefined);\n\t\tthis.name = 'JsonPathError';\n\t\tthis.code = meta.code;\n\t\tthis.expression = meta.expression;\n\t\tthis.location = meta.location;\n\t\tthis.pluginIds = meta.pluginIds;\n\t\tthis.options = meta.options;\n\t}\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'diagnostics', 'types.ts'),
	`import type { JsonPathErrorCode } from '../errors/codes';\nimport type { JsonPathLocation } from '../errors/types';\n\nexport type JsonPathDiagnostic = {\n\tlevel: 'error' | 'warning' | 'info';\n\tcode: JsonPathErrorCode;\n\tmessage: string;\n\texpression?: string;\n\tlocation?: JsonPathLocation;\n\tpluginId?: string;\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'diagnostics', 'collect.ts'),
	`import type { JsonPathDiagnostic } from './types';\n\nexport class DiagnosticsCollector {\n\tprivate readonly items: JsonPathDiagnostic[] = [];\n\tpublic add(diag: JsonPathDiagnostic): void {\n\t\tthis.items.push(diag);\n\t}\n\tpublic all(): readonly JsonPathDiagnostic[] {\n\t\treturn this.items;\n\t}\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'errors.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { JsonPathError } from './errors/JsonPathError';\nimport { JsonPathErrorCodes } from './errors/codes';\n\ndescribe('JsonPathError', () => {\n\tit('creates a structured error with code and optional cause', () => {\n\t\tconst cause = new Error('root cause');\n\t\tconst err = new JsonPathError({\n\t\t\tcode: JsonPathErrorCodes.Syntax,\n\t\t\tmessage: 'bad syntax',\n\t\t\texpression: '$..',\n\t\t\tlocation: { offset: 2, line: 1, column: 3 },\n\t\t\tpluginIds: ['@jsonpath/plugin-syntax-root'],\n\t\t\toptions: { safe: true },\n\t\t}, cause);\n\n\t\texpect(err.name).toBe('JsonPathError');\n\t\texpect(err.code).toBe(JsonPathErrorCodes.Syntax);\n\t\texpect(err.expression).toBe('$..');\n\t\texpect(err.location?.offset).toBe(2);\n\t\texpect(err.pluginIds).toEqual(['@jsonpath/plugin-syntax-root']);\n\t\texpect(err.options).toEqual({ safe: true });\n\t\texpect(err.cause).toBe(cause);\n\t});\n});\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`export { JsonPathError } from './errors/JsonPathError';\nexport { JsonPathErrorCodes } from './errors/codes';\nexport type { JsonPathErrorCode } from './errors/codes';\nexport type { JsonPathErrorMeta, JsonPathLocation } from './errors/types';\n\nexport { DiagnosticsCollector } from './diagnostics/collect';\nexport type { JsonPathDiagnostic } from './diagnostics/types';\n`,
);

console.log('Wrote @jsonpath/core error + diagnostics primitives');
