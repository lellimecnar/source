import type { QueryNode } from '@jsonpath/parser';

export interface CodegenOptions {
	readonly sourceMap?: boolean;
	readonly unsafe?: boolean;
}

export interface GeneratedModule {
	/** JavaScript source of the compiled query function factory */
	readonly source: string;
	/** AST used to generate */
	readonly ast: QueryNode;
}

export function wrapFactory(
	ast: QueryNode,
	fnBodySource: string,
	options: CodegenOptions,
): GeneratedModule {
	// NOTE: we generate a factory so we can inject runtime dependencies safely.
	// new Function('QueryResult', 'getFunction', 'Nothing', 'return (root, opts) => {...}')
	const source = options.sourceMap
		? `// source: ${JSON.stringify(ast.source)}\n${fnBodySource}`
		: fnBodySource;

	return { source, ast };
}
