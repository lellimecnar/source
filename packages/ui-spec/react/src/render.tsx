import { resolveNode, type NodeSchema, type ResolvedNode } from '@ui-spec/core';
import type { ReactNode } from 'react';
import { Fragment, useSyncExternalStore } from 'react';

import { useUISpecRuntime } from './context';

function renderResolved(node: ResolvedNode<any>): ReactNode {
	const children = node.children.map((child, idx) => {
		if (typeof child === 'object' && child !== null && 'type' in child) {
			return (
				<Fragment key={idx}>
					{renderResolved(child as ResolvedNode<any>)}
				</Fragment>
			);
		}
		return <Fragment key={idx}>{child as ReactNode}</Fragment>;
	});

	if (node.intrinsic) {
		const Tag = node.intrinsic as any;
		return <Tag {...node.props}>{children}</Tag>;
	}

	const Comp = node.component as any;
	return <Comp {...node.props}>{children}</Comp>;
}

export function UISpecNode(props: { node: NodeSchema }) {
	const { store, ctx, components } = useUISpecRuntime();

	useSyncExternalStore(
		(onStoreChange) => store.subscribe(onStoreChange),
		() => store.getDocument(),
	);

	const resolved = resolveNode(props.node, ctx, { components });
	return <>{renderResolved(resolved)}</>;
}

export function UISpecRoot() {
	const { schema } = useUISpecRuntime();
	return <UISpecNode node={schema.root} />;
}
