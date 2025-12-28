export type UISpecVersion = '1.0';

export interface PathBinding {
	$path: string;
}

export type NodeChild = string | NodeSchema | PathBinding;
export type NodeChildren = NodeChild | NodeChild[];

export type NodeProps = Record<string, unknown>;

export interface NodeSchema {
	type: string;
	class?: string;
	props?: NodeProps;
	children?: NodeChildren;
}

export interface UISpecSchema {
	$uispec: UISpecVersion;
	root: NodeSchema;
}

export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

export function isPathBinding(value: unknown): value is PathBinding {
	return (
		isPlainObject(value) &&
		Object.keys(value).length === 1 &&
		typeof value.$path === 'string'
	);
}
