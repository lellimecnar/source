import { UISpecError } from '../errors';
import { isPlainObject, type NodeSchema, type UISpecSchema } from '../schema';

function getComponentKey(ref: string): string {
	if (ref.startsWith('#/components/')) return ref.slice('#/components/'.length);
	return ref;
}

function mergeNodes(base: NodeSchema, next: NodeSchema): NodeSchema {
	return {
		...base,
		...next,
		props: { ...(base.props ?? {}), ...(next.props ?? {}) },
		class: next.class ?? base.class,
		children: next.children ?? base.children,
		$slots: { ...(base.$slots ?? {}), ...(next.$slots ?? {}) },
	};
}

export function resolveRefNode(
	schema: UISpecSchema,
	node: NodeSchema,
): NodeSchema {
	// Resolve $extends first (inheritance), then $ref (substitution).
	let working = node;

	if (working.$extends) {
		const key = getComponentKey(working.$extends);
		const component = schema.components?.[key];
		if (!component) {
			throw new UISpecError(
				'INVALID_NODE',
				`Unknown component for $extends: ${key}`,
				'$.$extends',
			);
		}
		working = mergeNodes(component.root, working);
		delete (working as any).$extends;
	}

	if (working.$ref) {
		const key = getComponentKey(working.$ref);
		const component = schema.components?.[key];
		if (!component) {
			throw new UISpecError(
				'INVALID_NODE',
				`Unknown component for $ref: ${key}`,
				'$.$ref',
			);
		}

		// Component root becomes the resolved node; instance props/slots are layered on top.
		const instance = { ...working };
		delete (instance as any).$ref;
		const merged = mergeNodes(component.root, instance);
		merged.type = component.root.type;
		return deepResolve(schema, merged);
	}

	return deepResolve(schema, working);
}

function deepResolve(schema: UISpecSchema, node: NodeSchema): NodeSchema {
	const children = node.children;
	if (children === undefined) return node;

	const normalize = Array.isArray(children) ? children : [children];
	const nextChildren = normalize.map((c) => {
		if (typeof c === 'string') return c;
		if (isPlainObject(c) && typeof (c as any).type === 'string')
			return resolveRefNode(schema, c as any);
		return c;
	});

	return {
		...node,
		children: Array.isArray(children) ? nextChildren : nextChildren[0],
	};
}
