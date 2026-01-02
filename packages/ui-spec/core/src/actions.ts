import type { UISpecContext } from './context';
import { UISpecError } from './errors';
import { isCallBinding, isPathBinding, type CallBinding } from './types';

export type ActionSchema = CallBinding;

function resolveValue(value: unknown, ctx: UISpecContext): unknown {
	if (isPathBinding(value)) {
		return ctx.get(value.$path);
	}
	if (isCallBinding(value)) {
		return resolveAction(value, ctx);
	}
	if (Array.isArray(value)) {
		return value.map((v) => resolveValue(v, ctx));
	}
	if (typeof value === 'object' && value !== null) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = resolveValue(v, ctx);
		}
		return out;
	}
	return value;
}

export function resolveAction(
	action: ActionSchema,
	ctx: UISpecContext,
): unknown {
	if (!action.$call?.id) {
		throw new UISpecError('UI_SPEC_INVALID_SCHEMA', 'Invalid $call action', {
			action,
		});
	}

	const args = (action.$call.args ?? []).map((a) => resolveValue(a, ctx));
	return ctx.functions.call(action.$call.id, ctx, ...args);
}
