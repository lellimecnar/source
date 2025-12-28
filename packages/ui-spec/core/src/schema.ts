export type UISpecVersion = '1.0';

export interface PathBinding {
	$path: string;
}

export interface ExprBinding {
	$expr: string;
}

export interface CallBinding {
	$call: {
		name: string;
		args?: ValueExpr[];
	};
}

export interface FnBinding {
	$fn: string;
}

export type BindingExpr = PathBinding | ExprBinding | CallBinding | FnBinding;

export type Primitive = string | number | boolean | null;

export type ValueExpr =
	| Primitive
	| BindingExpr
	| Record<string, unknown>
	| unknown[];

export type NodeChild = string | NodeSchema | BindingExpr;
export type NodeChildren = NodeChild | NodeChild[];

export type NodeProps = Record<string, unknown>;

export interface ForDirective {
	$for: {
		each: ValueExpr;
		as?: string;
		key?: ValueExpr;
		then: NodeSchema;
	};
}

export interface IfDirective {
	$if: ValueExpr;
	$then: NodeSchema;
	$else?: NodeSchema | true;
}

export interface SwitchDirective {
	$switch: {
		on: ValueExpr;
		cases: { when: ValueExpr; then: NodeSchema }[];
		default?: NodeSchema;
	};
}

export interface BindDirective {
	$bind: {
		path: string;
		mode?: 'read' | 'write' | 'twoWay';
		parse?: FnBinding | CallBinding;
		transform?: FnBinding | CallBinding;
		debounceMs?: number;
		throttleMs?: number;
		validate?: {
			schema?: string;
			plugin?: string;
		};
	};
}

export interface OnDirective {
	$on: Record<string, FnBinding | CallBinding | ExprBinding>;
}

export interface SlotsDirective {
	$slots: Record<string, NodeChildren>;
}

export interface LifecycleHooks {
	$mounted?: FnBinding | CallBinding;
	$updated?: FnBinding | CallBinding;
	$unmounted?: FnBinding | CallBinding;
}

export interface NodeSchema extends Partial<LifecycleHooks> {
	// Intrinsic node
	type: string;
	$id?: string;
	$ref?: string;
	$extends?: string;
	class?: string;
	props?: NodeProps;
	children?: NodeChildren;

	// Directives
	$if?: IfDirective['$if'];
	$then?: IfDirective['$then'];
	$else?: IfDirective['$else'];
	$switch?: SwitchDirective['$switch'];
	$for?: ForDirective['$for'];
	$bind?: BindDirective['$bind'];
	$on?: OnDirective['$on'];
	$slots?: SlotsDirective['$slots'];
}

export interface ThemeConfig {
	mode?: 'light' | 'dark' | 'system';
}

export interface UISpecMeta {
	title?: string;
	description?: string;
	theme?: ThemeConfig;
	locale?: string;
}

export interface ComponentSchema {
	props?: Record<string, unknown>;
	root: NodeSchema;
}

export interface FunctionSchema {
	$fn: string;
}

export interface PluginConfig {
	name: string;
	options?: Record<string, unknown>;
}

export interface RouteSchema {
	path: string;
	root?: NodeSchema;
	load?: {
		url: string;
	};
	beforeEnter?: FnBinding | CallBinding;
}

export interface UISpecSchema {
	$uispec: UISpecVersion;
	$id?: string;

	meta?: UISpecMeta;
	data?: Record<string, unknown>;
	components?: Record<string, ComponentSchema>;
	functions?: Record<string, FunctionSchema>;
	plugins?: PluginConfig[];
	schemas?: Record<string, unknown>;
	computed?: Record<string, unknown>;

	root?: NodeSchema;
	routes?: RouteSchema[];
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

export function isExprBinding(value: unknown): value is ExprBinding {
	return (
		isPlainObject(value) &&
		Object.keys(value).length === 1 &&
		typeof value.$expr === 'string'
	);
}

export function isCallBinding(value: unknown): value is CallBinding {
	return (
		isPlainObject(value) &&
		Object.keys(value).length === 1 &&
		isPlainObject(value.$call) &&
		typeof value.$call.name === 'string'
	);
}

export function isFnBinding(value: unknown): value is FnBinding {
	return (
		isPlainObject(value) &&
		Object.keys(value).length === 1 &&
		typeof value.$fn === 'string'
	);
}

export function isBindingExpr(value: unknown): value is BindingExpr {
	return (
		isPathBinding(value) ||
		isExprBinding(value) ||
		isCallBinding(value) ||
		isFnBinding(value)
	);
}
