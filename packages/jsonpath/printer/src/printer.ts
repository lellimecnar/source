import type { JsonPathAst } from '@jsonpath/ast';
import type { PrintOptions } from './options';

export function printAst(ast: JsonPathAst, _options?: PrintOptions): string {
	// Framework-only stable placeholder: emits a minimal sentinel.
	// Result/path plugins own stable JSONPath formatting.
	return ast.kind === 'Path' ? '$' : '$';
}
