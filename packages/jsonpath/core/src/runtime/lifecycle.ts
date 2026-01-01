import type { PathNode } from '@jsonpath/ast';
import type { Token } from '@jsonpath/lexer';

import type { CompileResult, EvaluateOptions } from '../engine';
import type { JsonPathNode } from './node';

export interface ParseContext {
	expression: string;
}

export type TokenTransform = (
	tokens: readonly Token[],
	ctx: ParseContext,
) => readonly Token[];

export type AstTransform = (ast: PathNode, ctx: ParseContext) => PathNode;

export interface EvaluateContext {
	compiled: CompileResult;
	root: JsonPathNode;
	options?: EvaluateOptions;
}

export type EvaluateNodesSync = (
	compiled: CompileResult,
	json: unknown,
	options?: EvaluateOptions,
) => readonly JsonPathNode[];

export type EvaluateNodesAsync = (
	compiled: CompileResult,
	json: unknown,
	options?: EvaluateOptions,
) => Promise<readonly JsonPathNode[]>;

export type EvaluateMiddlewareSync = (
	next: EvaluateNodesSync,
) => EvaluateNodesSync;
export type EvaluateMiddlewareAsync = (
	next: EvaluateNodesAsync,
) => EvaluateNodesAsync;

export type ErrorEnricher = (err: unknown, ctx: unknown) => unknown;

interface RegisteredHook<T> {
	pluginId: string;
	fn: T;
}

export class EngineLifecycleHooks {
	private readonly tokenTransforms: RegisteredHook<TokenTransform>[] = [];
	private readonly astTransforms: RegisteredHook<AstTransform>[] = [];
	private readonly evalSyncMiddleware: RegisteredHook<EvaluateMiddlewareSync>[] =
		[];
	private readonly evalAsyncMiddleware: RegisteredHook<EvaluateMiddlewareAsync>[] =
		[];
	private readonly errorEnrichers: RegisteredHook<ErrorEnricher>[] = [];

	public registerTokenTransform(pluginId: string, fn: TokenTransform): void {
		this.tokenTransforms.push({ pluginId, fn });
	}

	public registerAstTransform(pluginId: string, fn: AstTransform): void {
		this.astTransforms.push({ pluginId, fn });
	}

	public registerEvaluateSync(
		pluginId: string,
		fn: EvaluateMiddlewareSync,
	): void {
		this.evalSyncMiddleware.push({ pluginId, fn });
	}

	public registerEvaluateAsync(
		pluginId: string,
		fn: EvaluateMiddlewareAsync,
	): void {
		this.evalAsyncMiddleware.push({ pluginId, fn });
	}

	public registerErrorEnricher(pluginId: string, fn: ErrorEnricher): void {
		this.errorEnrichers.push({ pluginId, fn });
	}

	public getTokenTransforms(): readonly RegisteredHook<TokenTransform>[] {
		return this.tokenTransforms;
	}

	public getAstTransforms(): readonly RegisteredHook<AstTransform>[] {
		return this.astTransforms;
	}

	public getEvaluateSyncMiddleware(): readonly RegisteredHook<EvaluateMiddlewareSync>[] {
		return this.evalSyncMiddleware;
	}

	public getEvaluateAsyncMiddleware(): readonly RegisteredHook<EvaluateMiddlewareAsync>[] {
		return this.evalAsyncMiddleware;
	}

	public getErrorEnrichers(): readonly RegisteredHook<ErrorEnricher>[] {
		return this.errorEnrichers;
	}
}
