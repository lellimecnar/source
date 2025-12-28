import {
	isPathBinding,
	isPlainObject,
	type NodeSchema,
	type UISpecSchema,
} from '@ui-spec/core';
import * as React from 'react';

import { useUISpecStore } from './provider';

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
	readPath: (path: string) => unknown,
): React.ReactNode {
	if (typeof child === 'string') return child;
	if (isPathBinding(child)) return stringifyForText(readPath(child.$path));
	if (isPlainObject(child))
		return renderNode(child as unknown as NodeSchema, readPath);
	return null;
}

function resolveProps(
	props: Record<string, unknown> | undefined,
	readPath: (path: string) => unknown,
) {
	if (!props) return undefined;

	const resolved: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(props)) {
		if (isPathBinding(value)) {
			resolved[key] = readPath(value.$path);
			continue;
		}

		resolved[key] = value;
	}

	return resolved;
}

function renderNode(
	node: NodeSchema,
	readPath: (path: string) => unknown,
): React.ReactElement {
	const resolvedProps = resolveProps(node.props, readPath) ?? {};

	if (typeof node.class === 'string' && node.class.length > 0) {
		resolvedProps.className = node.class;
	}

	const childArray = toChildArray(node.children);
	const renderedChildren = childArray.map((c, index) => (
		<React.Fragment key={index}>{renderChild(c, readPath)}</React.Fragment>
	));

	return React.createElement(node.type, resolvedProps, ...renderedChildren);
}

export function UISpecRenderer(props: { schema: UISpecSchema }) {
	const store = useUISpecStore();

	React.useSyncExternalStore(
		store.subscribe,
		() => store.getData(),
		() => store.getData(),
	);

	const readPath = React.useCallback(
		(path: string) => store.get(path),
		[store],
	);

	return renderNode(props.schema.root, readPath);
}
