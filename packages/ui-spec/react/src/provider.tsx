import {
	createStore,
	type UISpecSchema,
	type UISpecStore,
	type UIScriptOptions,
} from '@ui-spec/core';
import * as React from 'react';

interface UISpecRuntime {
	schema: UISpecSchema;
	store: UISpecStore;
	uiscript?: UIScriptOptions;
}

const RuntimeContext = React.createContext<UISpecRuntime | null>(null);

export function UISpecProvider(props: {
	schema: UISpecSchema;
	initialData?: unknown;
	store?: UISpecStore;
	uiscript?: UIScriptOptions;
	children: React.ReactNode;
}) {
	const store = React.useMemo(() => {
		if (props.store) return props.store;
		const seed = props.initialData ?? props.schema.data ?? {};
		return createStore(seed);
	}, [props.store, props.initialData, props.schema]);

	const runtime = React.useMemo(
		() => ({ schema: props.schema, store, uiscript: props.uiscript }),
		[props.schema, store, props.uiscript],
	);

	return (
		<RuntimeContext.Provider value={runtime}>
			{props.children}
		</RuntimeContext.Provider>
	);
}

export function useUISpecRuntime(): UISpecRuntime {
	const runtime = React.useContext(RuntimeContext);
	if (!runtime)
		throw new Error('UISpecProvider is missing in the component tree.');
	return runtime;
}
