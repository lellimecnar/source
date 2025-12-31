import { Scanner, TokenStream } from '@jsonpath/lexer';
import { JsonPathParser } from '@jsonpath/parser';
import { path } from '@jsonpath/ast';

import type { JsonPathEngine, CompileResult, EvaluateOptions } from './engine';
import type { JsonPathPlugin } from './plugins/types';
import { resolvePlugins } from './plugins/resolve';

export type CreateEngineOptions = {
	plugins: readonly JsonPathPlugin[];
	options?: {
		maxDepth?: number;
		maxResults?: number;
	};
};

export function createEngine({ plugins }: CreateEngineOptions): JsonPathEngine {
	// Resolve (deterministic order + deps + conflicts)
	resolvePlugins(plugins);

	const scanner = new Scanner();
	const parser = new JsonPathParser();

	const parse = (expression: string) => {
		const tokens = scanner.scanAll(expression);
		return (
			parser.parse({ input: expression, tokens: new TokenStream(tokens) }) ??
			path([])
		);
	};

	const compile = (expression: string): CompileResult => ({
		expression,
		ast: parse(expression),
	});

	const evaluateSync = (
		_compiled: CompileResult,
		_json: unknown,
		_options?: EvaluateOptions,
	) => {
		// Framework-only: evaluation semantics are provided by plugins.
		return [];
	};

	const evaluateAsync = async (
		compiled: CompileResult,
		json: unknown,
		options?: EvaluateOptions,
	) => evaluateSync(compiled, json, options);

	return { compile, parse, evaluateSync, evaluateAsync };
}
