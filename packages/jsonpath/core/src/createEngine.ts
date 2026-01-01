import { path } from '@jsonpath/ast';
import { Scanner, TokenStream } from '@jsonpath/lexer';
import { JsonPathParser } from '@jsonpath/parser';

import type { JsonPathEngine, CompileResult, EvaluateOptions } from './engine';
import { JsonPathErrorCodes } from './errors/codes';
import { JsonPathError } from './errors/JsonPathError';
import { resolvePlugins } from './plugins/resolve';
import type { JsonPathPlugin } from './plugins/types';
import {
	EvaluatorRegistry,
	ResultRegistry,
	type EvalContext,
} from './runtime/hooks';
import { EngineLifecycleHooks } from './runtime/lifecycle';
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
	const lifecycle = new EngineLifecycleHooks();

	// Configure plugins + register hooks in deterministic order
	for (const plugin of resolved.ordered) {
		const pluginConfig = options?.plugins?.[plugin.meta.id];
		try {
			plugin.setup({
				pluginId: plugin.meta.id,
				config: pluginConfig as any,
				engine: {
					scanner,
					parser,
					evaluators,
					results,
					lifecycle,
				},
			});
		} catch (err) {
			throw new JsonPathError(
				{
					code: JsonPathErrorCodes.Plugin,
					message: `Plugin setup() failed: ${plugin.meta.id}`,
					pluginIds: [plugin.meta.id],
					options: pluginConfig,
				},
				err,
			);
		}
	}

	const enrichError = (originalErr: unknown, ctx: unknown): unknown => {
		let err: unknown = originalErr;
		for (const enricher of lifecycle.getErrorEnrichers()) {
			try {
				err = enricher.fn(err, ctx);
			} catch (inner) {
				throw new JsonPathError(
					{
						code: JsonPathErrorCodes.Plugin,
						message: `Plugin error enricher failed: ${enricher.pluginId}`,
						pluginIds: [enricher.pluginId],
					},
					inner,
				);
			}
		}
		return err;
	};

	const parse = (expression: string) => {
		try {
			let tokens = scanner.scanAll(expression);
			for (const transform of lifecycle.getTokenTransforms()) {
				try {
					tokens = transform.fn(tokens, { expression });
				} catch (err) {
					throw new JsonPathError(
						{
							code: JsonPathErrorCodes.Plugin,
							message: `Plugin token transform failed: ${transform.pluginId}`,
							pluginIds: [transform.pluginId],
							expression,
						},
						err,
					);
				}
			}

			let ast =
				parser.parse({
					input: expression,
					tokens: new TokenStream(tokens),
				}) ?? path([]);

			for (const transform of lifecycle.getAstTransforms()) {
				try {
					ast = transform.fn(ast, { expression });
				} catch (err) {
					throw new JsonPathError(
						{
							code: JsonPathErrorCodes.Plugin,
							message: `Plugin AST transform failed: ${transform.pluginId}`,
							pluginIds: [transform.pluginId],
							expression,
						},
						err,
					);
				}
			}

			return ast;
		} catch (err) {
			const enriched = enrichError(err, { expression });
			throw new JsonPathError(
				{
					code: JsonPathErrorCodes.Syntax,
					message: 'Failed to parse JSONPath expression',
					expression,
				},
				enriched,
			);
		}
	};

	const compile = (expression: string): CompileResult => ({
		expression,
		ast: parse(expression),
	});

	const evaluateNodesSyncBase = (
		compiled: CompileResult,
		json: unknown,
		evaluateOptions?: EvaluateOptions,
	): readonly JsonPathNode[] => {
		const root = rootNode(json);
		let nodes: JsonPathNode[] = [root];

		const ctx: EvalContext = { root };

		for (const seg of compiled.ast.segments) {
			const evalSegment = evaluators.getSegment(seg.kind);
			if (evalSegment) {
				nodes = [...evalSegment(nodes, seg as any, evaluators, ctx)];
				continue;
			}

			const selectors = (seg as any).selectors;
			if (!Array.isArray(selectors)) {
				throw new JsonPathError({
					code: JsonPathErrorCodes.Evaluation,
					message: `No segment evaluator registered for segment kind: ${seg.kind}`,
					expression: compiled.expression,
				});
			}

			const next: JsonPathNode[] = [];
			for (const inputNode of nodes) {
				for (const selector of selectors) {
					const evalSelector = evaluators.getSelector(selector.kind);
					if (!evalSelector) {
						throw new JsonPathError({
							code: JsonPathErrorCodes.Evaluation,
							message: `No evaluator registered for selector kind: ${selector.kind}`,
							expression: compiled.expression,
						});
					}
					next.push(...evalSelector(inputNode, selector, ctx));
				}
			}
			nodes = next;
		}

		return nodes;
	};

	const evaluateNodesAsyncBase = async (
		compiled: CompileResult,
		json: unknown,
		evaluateOptions?: EvaluateOptions,
	): Promise<readonly JsonPathNode[]> => {
		const root = rootNode(json);
		let nodes: JsonPathNode[] = [root];

		const ctx: EvalContext = { root };

		for (const seg of compiled.ast.segments) {
			const evalSegmentAsync = evaluators.getSegmentAsync(seg.kind);
			if (evalSegmentAsync) {
				nodes = [
					...(await evalSegmentAsync(nodes, seg as any, evaluators, ctx)),
				];
				continue;
			}

			const evalSegment = evaluators.getSegment(seg.kind);
			if (evalSegment) {
				nodes = [...evalSegment(nodes, seg as any, evaluators, ctx)];
				continue;
			}

			const selectors = (seg as any).selectors;
			if (!Array.isArray(selectors)) {
				throw new JsonPathError({
					code: JsonPathErrorCodes.Evaluation,
					message: `No segment evaluator registered for segment kind: ${seg.kind}`,
					expression: compiled.expression,
				});
			}

			const next: JsonPathNode[] = [];
			for (const inputNode of nodes) {
				for (const selector of selectors) {
					const evalSelectorAsync = evaluators.getSelectorAsync(selector.kind);
					if (evalSelectorAsync) {
						next.push(
							...((await evalSelectorAsync(inputNode, selector, ctx)) as any),
						);
						continue;
					}

					const evalSelector = evaluators.getSelector(selector.kind);
					if (!evalSelector) {
						throw new JsonPathError({
							code: JsonPathErrorCodes.Evaluation,
							message: `No evaluator registered for selector kind: ${selector.kind}`,
							expression: compiled.expression,
						});
					}
					next.push(...evalSelector(inputNode, selector, ctx));
				}
			}
			nodes = next;
		}

		return nodes;
	};

	let evaluateNodesSync = evaluateNodesSyncBase;
	for (const mw of [...lifecycle.getEvaluateSyncMiddleware()].reverse()) {
		try {
			evaluateNodesSync = mw.fn(evaluateNodesSync);
		} catch (err) {
			throw new JsonPathError(
				{
					code: JsonPathErrorCodes.Plugin,
					message: `Plugin evaluateSync middleware failed: ${mw.pluginId}`,
					pluginIds: [mw.pluginId],
				},
				err,
			);
		}
	}

	let evaluateNodesAsync = evaluateNodesAsyncBase;
	for (const mw of [...lifecycle.getEvaluateAsyncMiddleware()].reverse()) {
		try {
			evaluateNodesAsync = mw.fn(evaluateNodesAsync);
		} catch (err) {
			throw new JsonPathError(
				{
					code: JsonPathErrorCodes.Plugin,
					message: `Plugin evaluateAsync middleware failed: ${mw.pluginId}`,
					pluginIds: [mw.pluginId],
				},
				err,
			);
		}
	}

	const evaluateSync = (
		compiled: CompileResult,
		json: unknown,
		evaluateOptions?: EvaluateOptions,
	) => {
		let nodes: readonly JsonPathNode[];
		try {
			nodes = evaluateNodesSync(compiled, json, evaluateOptions);
		} catch (err) {
			throw enrichError(err, {
				compiled,
				root: rootNode(json),
				options: evaluateOptions,
			});
		}
		const resultType = evaluateOptions?.resultType ?? 'value';
		const mapper = results.get(resultType as any);
		if (mapper) return mapper(nodes);
		if (resultType === 'value') return nodes.map((n) => n.value);
		if (resultType === 'node') return nodes as any;
		throw new JsonPathError({
			code: JsonPathErrorCodes.Config,
			message: `No result mapper registered for resultType: ${resultType}`,
			expression: compiled.expression,
		});
	};

	const evaluateAsync = async (
		compiled: CompileResult,
		json: unknown,
		evaluateOptions?: EvaluateOptions,
	) => {
		let nodes: readonly JsonPathNode[];
		try {
			nodes = await evaluateNodesAsync(compiled, json, evaluateOptions);
		} catch (err) {
			throw enrichError(err, {
				compiled,
				root: rootNode(json),
				options: evaluateOptions,
			});
		}
		const resultType = evaluateOptions?.resultType ?? 'value';
		const mapper = results.get(resultType as any);
		if (mapper) return mapper(nodes);
		if (resultType === 'value') return nodes.map((n) => n.value);
		if (resultType === 'node') return nodes as any;
		throw new JsonPathError({
			code: JsonPathErrorCodes.Config,
			message: `No result mapper registered for resultType: ${resultType}`,
			expression: compiled.expression,
		});
	};

	return { compile, parse, evaluateSync, evaluateAsync };
}
