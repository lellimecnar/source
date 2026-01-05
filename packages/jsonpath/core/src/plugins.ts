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

export interface PluginContext {
	readonly options: EvaluatorOptions;
	readonly metadata: Record<string, unknown>;
	register(key: string, value: unknown): void;
	get<T>(key: string): T | undefined;
}

export interface JSONPathPlugin {
	readonly name: string;
	readonly version?: string;
	readonly dependencies?: readonly string[];

	onRegister?(ctx: PluginContext): void;
	beforeEvaluate?(ctx: BeforeEvaluateContext): void;
	afterEvaluate?(ctx: AfterEvaluateContext): void;
	onError?(ctx: EvaluateErrorContext): void;
}

export class PluginManager {
	private readonly context: PluginContext;
	private readonly plugins: JSONPathPlugin[] = [];

	constructor(
		plugins: readonly JSONPathPlugin[],
		options: EvaluatorOptions = {},
	) {
		const metadata: Record<string, unknown> = {};
		this.context = {
			options,
			metadata,
			register(key, value) {
				metadata[key] = value;
			},
			get(key) {
				return metadata[key] as any;
			},
		};

		this.resolveAndRegister(plugins);
	}

	private resolveAndRegister(plugins: readonly JSONPathPlugin[]) {
		const pending = [...plugins];
		const registeredNames = new Set<string>();

		let changed = true;
		while (pending.length > 0 && changed) {
			changed = false;
			for (let i = 0; i < pending.length; i++) {
				const plugin = pending[i];
				const deps = plugin.dependencies ?? [];
				if (deps.every((dep) => registeredNames.has(dep))) {
					this.plugins.push(plugin);
					registeredNames.add(plugin.name);
					try {
						plugin.onRegister?.(this.context);
					} catch {
						// isolation
					}
					pending.splice(i, 1);
					i--;
					changed = true;
				}
			}
		}

		if (pending.length > 0) {
			throw new Error(
				`Circular or missing plugin dependencies: ${pending.map((p) => p.name).join(', ')}`,
			);
		}
	}

	static from(options?: {
		plugins?: readonly JSONPathPlugin[];
	}): PluginManager {
		return new PluginManager(options?.plugins ?? [], options as any);
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
