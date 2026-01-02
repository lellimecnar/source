import type {
	ComponentRegistry,
	UISpecContext,
	UISpecSchema,
	UISpecStore,
} from '@ui-spec/core';
import type { ComponentType, ReactNode } from 'react';
import { createContext, useContext } from 'react';

export interface UISpecReactRuntime {
	schema: UISpecSchema;
	store: UISpecStore;
	ctx: UISpecContext;
	components: ComponentRegistry<ComponentType<any>>;
	children?: ReactNode;
}

export const UISpecRuntimeContext = createContext<UISpecReactRuntime | null>(
	null,
);

export function useUISpecRuntime(): UISpecReactRuntime {
	const runtime = useContext(UISpecRuntimeContext);
	if (!runtime) {
		throw new Error('UISpecProvider is missing');
	}
	return runtime;
}
