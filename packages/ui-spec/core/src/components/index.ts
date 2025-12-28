import type { ComponentSchema, NodeSchema, UISpecSchema } from '../schema';
import { resolveRefNode } from './resolveRef';
import { applySlots } from './slots';

export type ComponentRegistry = Record<string, ComponentSchema>;

export function getComponentRegistry(schema: UISpecSchema): ComponentRegistry {
	return schema.components ?? {};
}

export function resolveComponentTree(
	schema: UISpecSchema,
	node: NodeSchema,
): NodeSchema {
	const withRefs = resolveRefNode(schema, node);
	return applySlots(schema, withRefs);
}
