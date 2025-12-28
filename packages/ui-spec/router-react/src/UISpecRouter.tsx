import type { UISpecSchema } from '@ui-spec/core';
import { UISpecProvider, UISpecApp } from '@ui-spec/react';
import { createRouter } from '@ui-spec/router';
import * as React from 'react';

export function UISpecRouter(props: { schema: UISpecSchema }) {
	const router = React.useMemo(
		() => createRouter(props.schema),
		[props.schema],
	);

	React.useEffect(() => {
		router.start();
		return () => router.stop();
	}, [router]);

	React.useSyncExternalStore(
		router.subscribe,
		() => router.getState(),
		() => router.getState(),
	);

	const state = router.getState();
	const activeSchema = state.loadedSchema ?? props.schema;

	const node = state.active?.root ?? activeSchema.root;
	if (!node) return null;

	return (
		<UISpecProvider schema={activeSchema}>
			<UISpecApp schema={{ ...activeSchema, root: node }} />
		</UISpecProvider>
	);
}
