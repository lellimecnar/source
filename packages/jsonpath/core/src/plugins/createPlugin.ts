import type {
	JsonPathPlugin,
	JsonPathPluginId,
	JsonPathPluginMeta,
	PluginSetupContext,
} from './types';

export interface PluginDefinition<Config = unknown> {
	meta: Omit<JsonPathPluginMeta, 'id'> & { id?: JsonPathPluginId };
	setup: (ctx: PluginSetupContext<Config>) => void;
}

export function createPlugin<Config = unknown>(
	definition:
		| PluginDefinition<Config>
		| ((config?: Config) => PluginDefinition<Config>),
): JsonPathPlugin<Config> | ((config?: Config) => JsonPathPlugin<Config>) {
	if (typeof definition === 'function') {
		return (config?: Config) => {
			const def = definition(config);
			return {
				meta: {
					...def.meta,
					id: def.meta.id || 'anonymous-plugin',
				} as JsonPathPluginMeta,
				setup: def.setup,
			};
		};
	}

	return {
		meta: {
			...definition.meta,
			id: definition.meta.id || 'anonymous-plugin',
		} as JsonPathPluginMeta,
		setup: definition.setup,
	};
}
