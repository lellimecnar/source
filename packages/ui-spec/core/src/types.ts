export type JsonPath = string;

export interface PathBinding {
	$path: JsonPath;
}
export interface CallBinding {
	$call: { id: string; args?: unknown[] };
}

export type BindingValue = unknown | PathBinding | CallBinding;

export interface EventHandlerSchema {
	$call: { id: string; args?: unknown[] };
}

export interface NodeSchema {
	type: string;
	props?: Record<string, BindingValue>;
	children?: (BindingValue | NodeSchema)[];
	$on?: Record<string, EventHandlerSchema>;
}

export interface UISpecSchema {
	data?: unknown;
	root: NodeSchema;
	components?: Record<string, unknown>;
	functions?: Record<string, unknown>;
}

export function isPathBinding(value: unknown): value is PathBinding {
	return (
		typeof value === 'object' &&
		value !== null &&
		'$path' in value &&
		typeof (value as { $path?: unknown }).$path === 'string'
	);
}

export function isCallBinding(value: unknown): value is CallBinding {
	return (
		typeof value === 'object' &&
		value !== null &&
		'$call' in value &&
		typeof (value as { $call?: unknown }).$call === 'object' &&
		(value as { $call?: { id?: unknown } }).$call?.id !== undefined &&
		typeof (value as { $call?: { id?: unknown } }).$call?.id === 'string'
	);
}
