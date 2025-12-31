import { path } from '@jsonpath/ast';
import { Scanner, TokenStream } from '@jsonpath/lexer';
import { JsonPathParser } from '@jsonpath/parser';

import type { JsonPathEngine, CompileResult, EvaluateOptions } from './engine';
import { JsonPathErrorCodes } from './errors/codes';
import { JsonPathError } from './errors/JsonPathError';
import { resolvePlugins } from './plugins/resolve';
import type { JsonPathPlugin } from './plugins/types';
import { EvaluatorRegistry, ResultRegistry } from './runtime/hooks';
import type { JsonPathNode } from './runtime/node';
import { rootNode } from './runtime/node';

export interface CreateEngineOptions {
	plugins: readonly JsonPathPlugin[];
	options?: {
		maxDepth?: number;
		maxResults?: number;
		plugins?: Record<string, unknown>;
	};
}

export function createEngine({
	plugins,
	options,
}: CreateEngineOptions): JsonPathEngine {
	// Resolve (deterministic order + deps + conflicts)
	const resolved = resolvePlugins(plugins);

	const scanner = new Scanner();
	const parser = new JsonPathParser();

	// Runtime registries populated by plugins
	const evaluators = new EvaluatorRegistry();
	const results = new ResultRegistry();

	// Configure plugins + register hooks in deterministic order
	for (const plugin of resolved.ordered) {
		const pluginConfig = options?.plugins?.[plugin.meta.id];
		plugin.configure?.(pluginConfig as any);
		plugin.hooks?.registerTokens?.(scanner);
		plugin.hooks?.registerParsers?.(parser);
		plugin.hooks?.registerEvaluators?.(evaluators);
		plugin.hooks?.registerResults?.(results);
	}

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
		compiled: CompileResult,
		json: unknown,
		evaluateOptions?: EvaluateOptions,
	) => {
		let nodes: JsonPathNode[] = [rootNode(json)];

		for (const seg of compiled.ast.segments) {
			const next: JsonPathNode[] = [];
			for (const inputNode of nodes) {
				for (const selector of seg.selectors) {
					const evalSelector = evaluators.getSelector(selector.kind);
					if (!evalSelector) {
						throw new JsonPathError({
							code: JsonPathErrorCodes.Evaluation,
							message: `No evaluator registered for selector kind: ${selector.kind}`,
						});
					}
					next.push(...evalSelector(inputNode, selector));
				}
			}
			nodes = next;
		}

		const resultType = evaluateOptions?.resultType ?? 'value';
		const mapper = results.get(resultType as any);
		if (mapper) return mapper(nodes);

		// Safe defaults for early scaffolding.
		if (resultType === 'value') return nodes.map((n) => n.value);
		if (resultType === 'node') return nodes;

		throw new JsonPathError({
			code: JsonPathErrorCodes.Config,
			message: `No result mapper registered for resultType: ${resultType}`,
		});
	};

	const evaluateAsync = async (
		compiled: CompileResult,
		json: unknown,
		evaluateOptions?: EvaluateOptions,
	) => evaluateSync(compiled, json, evaluateOptions);

	return { compile, parse, evaluateSync, evaluateAsync };
}
