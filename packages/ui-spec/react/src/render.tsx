import {
	compileNode,
	createUIScriptExec,
	resolveValue,
	isBindingExpr,
	isPlainObject,
	type NodeSchema,
	type UISpecSchema,
} from '@ui-spec/core';
import * as React from 'react';

import { useLifecycle } from './hooks/useLifecycle';
import { useUISpecRuntime } from './provider';
import { toReactEventProp } from './runtime/events';

function toChildArray(children: unknown): unknown[] {
	if (children === undefined) return [];
	return Array.isArray(children) ? children : [children];
}

function stringifyForText(value: unknown): string {
	if (value === undefined || value === null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean')
		return String(value);
	return JSON.stringify(value);
}

function renderChild(
	child: unknown,
	resolve: (value: unknown) => unknown,
): React.ReactNode {
	if (typeof child === 'string') return child;
	if (isBindingExpr(child)) return stringifyForText(resolve(child));
	if (isPlainObject(child)) return renderNode(child as any, resolve);
	return null;
}

function resolveProps(
	props: Record<string, unknown> | undefined,
	resolve: (value: unknown) => unknown,
) {
	if (!props) return undefined;
	const resolved: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(props)) {
		resolved[key] = isBindingExpr(value) ? resolve(value) : value;
	}
	return resolved;
}

function renderNode(
	node: NodeSchema,
	resolve: (value: unknown) => unknown,
): React.ReactElement {
	if (node.type === 'fragment') {
		const childArray = toChildArray(node.children);
		return React.createElement(
			React.Fragment,
			null,
			...childArray.map((c, i) =>
				React.createElement(
					React.Fragment,
					{ key: i },
					renderChild(c, resolve),
				),
			),
		);
	}

	const resolvedProps = resolveProps(node.props, resolve) ?? {};

	if (typeof node.class === 'string' && node.class.length > 0) {
		(resolvedProps as any).className = node.class;
	}

	if (node.$on) {
		for (const [eventName, handlerExpr] of Object.entries(node.$on)) {
			const propName = toReactEventProp(eventName);
			(resolvedProps as any)[propName] = (...args: unknown[]) => {
				const result = resolve(handlerExpr);
				if (typeof result === 'function') return (result as any)(...args);
				return result;
			};
		}
	}

	const childArray = toChildArray(node.children);
	const renderedChildren = childArray.map((c, index) => (
		<React.Fragment key={index}>{renderChild(c, resolve)}</React.Fragment>
	));

	return React.createElement(node.type, resolvedProps, ...renderedChildren);
}

export function UISpecNode(props: { node: NodeSchema }) {
	const { schema, store, uiscript } = useUISpecRuntime();

	React.useSyncExternalStore(
		store.subscribe,
		() => store.getData(),
		() => store.getData(),
	);

	const exec = React.useMemo(
		() => createUIScriptExec(schema, uiscript),
		[schema, uiscript],
	);

	const resolve = React.useCallback(
		(value: unknown) => resolveValue(value as any, { store, exec }),
		[store, exec],
	);

	const compiled = React.useMemo(
		() => compileNode(props.node, { schema, store, exec }),
		[props.node, schema, store, exec],
	);

	useLifecycle({
		onMounted: () => {
			if (!compiled.$mounted) return;
			const fn = resolve(compiled.$mounted as any);
			if (typeof fn === 'function') fn();
		},
		onUpdated: () => {
			if (!compiled.$updated) return;
			const fn = resolve(compiled.$updated as any);
			if (typeof fn === 'function') fn();
		},
		onUnmounted: () => {
			if (!compiled.$unmounted) return;
			const fn = resolve(compiled.$unmounted as any);
			if (typeof fn === 'function') fn();
		},
	});
	return renderNode(compiled, resolve);
}

export function UISpecApp(props: { schema?: UISpecSchema }) {
	const runtime = useUISpecRuntime();
	const schema = props.schema ?? runtime.schema;
	if (!schema.root) return null;
	return <UISpecNode node={schema.root} />;
}
