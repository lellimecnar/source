import type { BindingExpr, ValueExpr } from '../schema';
import type { UISpecStore } from '../store';

export interface EvalExec {
	evalExpr?: (code: string, ctx: EvalContext) => unknown;
	call?: (name: string, args: unknown[], ctx: EvalContext) => unknown;
	fn?: (source: string, ctx: EvalContext) => (...args: unknown[]) => unknown;
}

export interface EvalContext {
	store: UISpecStore;
	scope?: Record<string, unknown>;
	exec?: EvalExec;
}

export type ResolvedValue = unknown;
export type ResolveValue = (
	value: ValueExpr,
	ctx: EvalContext,
) => ResolvedValue;
export type ResolveBinding = (
	binding: BindingExpr,
	ctx: EvalContext,
) => ResolvedValue;

export * from './resolveValue';
export * from './resolveClass';
export * from './resolveStyle';
