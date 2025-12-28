import {
	isPlainObject,
	type NodeChildren,
	type NodeSchema,
	type UISpecSchema,
} from '../schema';

function toArray(
	children: NodeChildren | undefined,
): (string | NodeSchema | unknown)[] {
	if (children === undefined) return [];
	return Array.isArray(children) ? children : [children];
}

function isSlotNode(value: unknown): value is NodeSchema {
	return (
		isPlainObject(value) &&
		typeof (value as any).type === 'string' &&
		(value as any).type === 'Slot'
	);
}

export function applySlots(schema: UISpecSchema, node: NodeSchema): NodeSchema {
	const slots = node.$slots ?? {};
	const children = toArray(node.children);

	const nextChildren = children.flatMap((child) => {
		if (typeof child === 'string') return [child];
		if (isSlotNode(child)) {
			const name = ((child.props as any)?.name as string) ?? 'default';
			const injected = slots[name];
			if (injected === undefined) return [];
			return toArray(injected);
		}
		if (isPlainObject(child) && typeof (child as any).type === 'string') {
			return [applySlots(schema, child as any)];
		}
		return [child];
	});

	return {
		...node,
		children: nextChildren as any,
	};
}
