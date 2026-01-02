import type { ComponentType } from 'react';

import { ComponentRegistry } from '@ui-spec/core';

import type { UISpecComponentAdapter } from './adapter';

export function createComponentRegistry(params: {
	adapters?: UISpecComponentAdapter[];
	intrinsic?: Record<string, ComponentType<any>>;
}): ComponentRegistry<ComponentType<any>> {
	const registry = new ComponentRegistry<ComponentType<any>>();

	for (const [id, component] of Object.entries(params.intrinsic ?? {})) {
		registry.register(id, component);
	}

	for (const adapter of params.adapters ?? []) {
		for (const [id, component] of Object.entries(adapter.getComponents())) {
			// Last adapter wins by overwriting.
			registry.register(id, component);
		}
	}

	return registry;
}
