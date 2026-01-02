import { resolveAction, type ActionSchema } from './actions';
import type { ComponentRegistry } from './component-registry';
import type { UISpecContext } from './context';
import { isCallBinding, isPathBinding, type NodeSchema } from './types';

export interface ResolvedNode<TComponent = unknown> {
	type: string;
	intrinsic?: string;
	component?: TComponent;
	props: Record<string, unknown>;
	children: (ResolvedNode<TComponent> | unknown)[];
}

function isIntrinsicTag(type: string): boolean {
	return type.toLowerCase() === type;
}

function resolveAny(value: unknown, ctx: UISpecContext): unknown {
	if (isPathBinding(value)) {
		return ctx.get(value.$path);
	}
	if (isCallBinding(value)) {
		return resolveAction(value, ctx);
	}
	if (Array.isArray(value)) {
		return value.map((v) => resolveAny(v, ctx));
	}
	if (typeof value === 'object' && value !== null) {
		// NodeSchema-like
		if ('type' in value && typeof (value as any).type === 'string') {
			return value;
		}
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = resolveAny(v, ctx);
		}
		return out;
	}
	return value;
}

export function resolveNode<TComponent>(
	node: NodeSchema,
	ctx: UISpecContext,
	registries: { components: ComponentRegistry<TComponent> },
): ResolvedNode<TComponent> {
	const props: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(node.props ?? {})) {
		props[k] = resolveAny(v, ctx);
	}

	if (node.$on) {
		for (const [eventName, action] of Object.entries(node.$on)) {
			props[eventName] = () => resolveAction(action as ActionSchema, ctx);
		}
	}

	const children: (ResolvedNode<TComponent> | unknown)[] = [];
	for (const child of node.children ?? []) {
		if (typeof child === 'object' && child !== null && 'type' in child) {
			children.push(resolveNode(child as NodeSchema, ctx, registries));
			continue;
		}
		children.push(resolveAny(child, ctx));
	}

	if (isIntrinsicTag(node.type)) {
		return { type: node.type, intrinsic: node.type, props, children };
	}

	return {
		type: node.type,
		component: registries.components.require(node.type),
		props,
		children,
	};
}
