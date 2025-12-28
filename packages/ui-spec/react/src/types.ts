import type {
	UISpecSchema,
	UISpecStore,
	NodeSchema,
	UIScriptOptions,
} from '@ui-spec/core';

export interface UISpecProviderProps {
	schema: UISpecSchema;
	initialData?: unknown;
	store?: UISpecStore;
	uiscript?: UIScriptOptions;
	children: React.ReactNode;
}

export interface UISpecRuntime {
	schema: UISpecSchema;
	store: UISpecStore;
	uiscript?: UIScriptOptions;
}

export interface UISpecAppProps {
	// For non-router usage: renders schema.root.
	schema?: UISpecSchema;
}

export interface UISpecNodeProps {
	node: NodeSchema;
}
