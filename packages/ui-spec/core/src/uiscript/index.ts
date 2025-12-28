import { UISpecError } from '../errors';
import type { EvalExec, EvalContext } from '../eval';
import type { UISpecSchema } from '../schema';
import { compileRestrictedFunction } from './sandbox';
import { defaultUIScriptOptions, type UIScriptOptions } from './spec';

export { defaultUIScriptOptions } from './spec';
export type { UIScriptAllowlist, UIScriptOptions } from './spec';

export interface UISpecContext {
	store: EvalContext['store'];
	validate?: (
		value: unknown,
		schemaRef: string,
	) => { ok: true } | { ok: false; errors: unknown };
	navigate?: (to: string) => void;
	back?: () => void;
	route?: unknown;
}

export function createUIScriptExec(
	schema: UISpecSchema,
	options?: UIScriptOptions,
): EvalExec {
	const opts = { ...defaultUIScriptOptions, ...options };

	const functions = schema.functions ?? {};

	return {
		evalExpr(code, ctx) {
			if (!opts.enabled)
				throw new UISpecError(
					'INVALID_BINDING',
					'UIScript is disabled.',
					'$expr',
				);
			// eslint-disable-next-line no-new-func
			const expr = Function('ctx', `"use strict"; return (${code});`);
			return expr(toUISpecContext(ctx));
		},
		call(name, args, ctx) {
			const fnSchema = functions[name];
			if (!fnSchema)
				throw new UISpecError(
					'INVALID_BINDING',
					`Unknown function: ${name}`,
					'$call',
				);
			const fn = compileRestrictedFunction(fnSchema.$fn, opts);
			return fn(toUISpecContext(ctx), ...args);
		},
		fn(source, ctx) {
			const compiled = compileRestrictedFunction(source, opts);
			return (...args: unknown[]) => compiled(toUISpecContext(ctx), ...args);
		},
	};
}

function toUISpecContext(ctx: EvalContext): UISpecContext {
	return {
		store: ctx.store,
		validate: undefined,
		navigate: undefined,
		back: undefined,
		route: undefined,
	};
}
