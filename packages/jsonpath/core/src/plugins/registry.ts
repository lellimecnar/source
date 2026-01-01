import type { JsonPathPlugin, JsonPathPluginId } from './types';
import { JsonPathErrorCodes } from '../errors/codes';
import { JsonPathError } from '../errors/JsonPathError';

export class PluginRegistry {
	private readonly pluginsById = new Map<
		JsonPathPluginId,
		JsonPathPlugin<any>
	>();

	public register(plugin: JsonPathPlugin<any>): void {
		const existing = this.pluginsById.get(plugin.meta.id);
		if (existing) {
			throw new JsonPathError({
				code: JsonPathErrorCodes.Plugin,
				message: `Duplicate plugin id registered: ${plugin.meta.id}`,
				pluginIds: [plugin.meta.id],
			});
		}
		this.pluginsById.set(plugin.meta.id, plugin);
	}

	public get(id: JsonPathPluginId): JsonPathPlugin<any> | undefined {
		return this.pluginsById.get(id);
	}

	public all(): readonly JsonPathPlugin<any>[] {
		return [...this.pluginsById.values()];
	}
}
