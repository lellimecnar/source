import type { EvaluatorOptions, QueryResult } from './types.js';

export interface BeforeEvaluateContext {
	readonly root: unknown;
	readonly query: unknown;
	readonly options?: EvaluatorOptions;
}

export interface AfterEvaluateContext {
	readonly result: QueryResult;
}

export interface EvaluateErrorContext {
	readonly error: unknown;
}

export interface JSONPathPlugin {
	readonly name: string;

	beforeEvaluate?(ctx: BeforeEvaluateContext): void;
	afterEvaluate?(ctx: AfterEvaluateContext): void;
	onError?(ctx: EvaluateErrorContext): void;
}

export class PluginManager {
	constructor(private readonly plugins: readonly JSONPathPlugin[]) {}

	static from(options?: {
		plugins?: readonly JSONPathPlugin[];
	}): PluginManager {
		return new PluginManager(options?.plugins ?? []);
	}

	beforeEvaluate(ctx: BeforeEvaluateContext): void {
		this.run('beforeEvaluate', ctx);
	}

	afterEvaluate(ctx: AfterEvaluateContext): void {
		this.run('afterEvaluate', ctx);
	}

	onError(ctx: EvaluateErrorContext): void {
		this.run('onError', ctx);
	}

	private run(
		hook: 'beforeEvaluate' | 'afterEvaluate' | 'onError',
		ctx: any,
	): void {
		for (const plugin of this.plugins) {
			const fn = (plugin as any)[hook];
			if (!fn) continue;
			try {
				fn.call(plugin, ctx);
			} catch {
				// isolation: plugin failures never break evaluation
			}
		}
	}
}
