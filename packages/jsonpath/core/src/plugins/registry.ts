import type { JsonPathPlugin, JsonPathPluginId } from './types';

export class PluginRegistry {
	private readonly pluginsById: Map<JsonPathPluginId, JsonPathPlugin> =
		new Map();

	public register(plugin: JsonPathPlugin): void {
		this.pluginsById.set(plugin.meta.id, plugin);
	}

	public get(id: JsonPathPluginId): JsonPathPlugin | undefined {
		return this.pluginsById.get(id);
	}

	public all(): readonly JsonPathPlugin[] {
		return [...this.pluginsById.values()];
	}
}
