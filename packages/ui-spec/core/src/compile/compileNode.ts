import { resolveComponentTree } from '../components';
import { resolveValue } from '../eval/resolveValue';
import type { NodeSchema, UISpecSchema, ValueExpr } from '../schema';
import type { UISpecStore } from '../store';

export interface CompileContext {
	schema: UISpecSchema;
	store: UISpecStore;
	scope?: Record<string, unknown>;
	exec?: any;
}

function truthy(value: unknown): boolean {
	return Boolean(value);
}

export function compileNode(node: NodeSchema, ctx: CompileContext): NodeSchema {
	// Resolve components ($ref/$extends/slots) before directives.
	const resolved = resolveComponentTree(ctx.schema, node);

	// $if
	if (resolved.$if !== undefined) {
		const test = resolveValue(resolved.$if as unknown as ValueExpr, {
			store: ctx.store,
			scope: ctx.scope,
			exec: ctx.exec,
		});
		const branch = truthy(test)
			? resolved.$then!
			: resolved.$else === true
				? undefined
				: resolved.$else;
		return branch
			? compileNode(branch, ctx)
			: { type: 'fragment', children: [] };
	}

	// $switch
	if (resolved.$switch) {
		const onValue = resolveValue(resolved.$switch.on as any, {
			store: ctx.store,
			scope: ctx.scope,
			exec: ctx.exec,
		});
		for (const c of resolved.$switch.cases) {
			const whenValue = resolveValue(c.when as any, {
				store: ctx.store,
				scope: ctx.scope,
				exec: ctx.exec,
			});
			if (Object.is(onValue, whenValue)) return compileNode(c.then, ctx);
		}
		return resolved.$switch.default
			? compileNode(resolved.$switch.default, ctx)
			: { type: 'fragment', children: [] };
	}

	// $for
	if (resolved.$for) {
		const forSpec = resolved.$for;
		const eachValue = resolveValue(forSpec.each as any, {
			store: ctx.store,
			scope: ctx.scope,
			exec: ctx.exec,
		});
		const items = Array.isArray(eachValue) ? eachValue : [];
		const as = forSpec.as ?? 'item';

		const children = items.map((item, index) => {
			const scope = { ...(ctx.scope ?? {}), [as]: item, $index: index };
			return compileNode(forSpec.then, { ...ctx, scope });
		});

		return { type: 'fragment', children };
	}

	// Recurse children for base nodes
	if (resolved.children === undefined) return resolved;
	const arr = Array.isArray(resolved.children)
		? resolved.children
		: [resolved.children];
	const nextChildren = arr.map((c) => {
		if (typeof c === 'string') return c;
		if (c && typeof c === 'object' && (c as any).type)
			return compileNode(c as any, ctx);
		return c;
	});

	return {
		...resolved,
		children: Array.isArray(resolved.children) ? nextChildren : nextChildren[0],
	};
}
