import type { EvalContext } from '.';
import { UISpecError } from '../errors';
import {
	isCallBinding,
	isExprBinding,
	isFnBinding,
	isPathBinding,
	type ValueExpr,
} from '../schema';

export function resolveValue(value: ValueExpr, ctx: EvalContext): unknown {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((v) => resolveValue(v as any, ctx));
	}

	if (isPathBinding(value)) {
		return ctx.store.get(value.$path);
	}

	if (isExprBinding(value)) {
		if (!ctx.exec?.evalExpr) {
			throw new UISpecError(
				'INVALID_BINDING',
				'$expr evaluation is disabled (UIScript not enabled).',
				'$expr',
			);
		}
		return ctx.exec.evalExpr(value.$expr, ctx);
	}

	if (isCallBinding(value)) {
		if (!ctx.exec?.call) {
			throw new UISpecError(
				'INVALID_BINDING',
				'$call invocation is disabled (UIScript not enabled).',
				'$call',
			);
		}
		const args = (value.$call.args ?? []).map((a) =>
			resolveValue(a as any, ctx),
		);
		return ctx.exec.call(value.$call.name, args, ctx);
	}

	if (isFnBinding(value)) {
		if (!ctx.exec?.fn) {
			throw new UISpecError(
				'INVALID_BINDING',
				'$fn compilation is disabled (UIScript not enabled).',
				'$fn',
			);
		}
		return ctx.exec.fn(value.$fn, ctx);
	}

	if (value && typeof value === 'object') {
		return value;
	}

	return undefined;
}
