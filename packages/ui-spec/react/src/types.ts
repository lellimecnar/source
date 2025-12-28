import type { UISpecSchema, UISpecStore } from '@ui-spec/core';

export interface UISpecProviderProps {
	store: UISpecStore;
	children: React.ReactNode;
}

export interface UISpecRendererProps {
	schema: UISpecSchema;
}
