import {
	createJsonp3FunctionRegistry,
	createUISpecContext,
	createUISpecStore,
	FunctionRegistry,
	type UISpecSchema,
	type UISpecStore,
} from '@ui-spec/core';
import { useMemo, type ReactNode } from 'react';

import type { UISpecComponentAdapter } from './adapter';
import { UISpecRuntimeContext } from './context';
import { createComponentRegistry } from './registry';

export interface UISpecProviderProps {
	schema: UISpecSchema;
	adapters?: UISpecComponentAdapter[];
	store?: UISpecStore;
	functions?: FunctionRegistry;
	children?: ReactNode;
}

export function UISpecProvider(props: UISpecProviderProps) {
	const {
		schema,
		adapters = [],
		store: injectedStore,
		functions: injectedFunctions,
		children,
	} = props;

	const store = useMemo(
		() => injectedStore ?? createUISpecStore(schema.data ?? {}),
		[injectedStore, schema],
	);

	const functions = useMemo(
		() =>
			injectedFunctions ?? new FunctionRegistry(createJsonp3FunctionRegistry()),
		[injectedFunctions],
	);

	const ctx = useMemo(
		() => createUISpecContext({ store, functions }),
		[store, functions],
	);
	const components = useMemo(
		() => createComponentRegistry({ adapters }),
		[adapters],
	);

	const runtimeValue = useMemo(
		() => ({ schema, store, ctx, components }),
		[schema, store, ctx, components],
	);

	return (
		<UISpecRuntimeContext.Provider value={runtimeValue}>
			{children}
		</UISpecRuntimeContext.Provider>
	);
}
