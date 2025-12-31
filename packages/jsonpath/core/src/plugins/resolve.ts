import { JsonPathError } from '../errors/JsonPathError';
import { JsonPathErrorCodes } from '../errors/codes';
import type {
	JsonPathCapability,
	JsonPathPlugin,
	JsonPathPluginId,
} from './types';
import { orderPluginsDeterministically } from './order';

export type ResolvePluginsResult = {
	ordered: readonly JsonPathPlugin[];
	byId: ReadonlyMap<JsonPathPluginId, JsonPathPlugin>;
};

function list(p?: readonly string[]): readonly string[] {
	return p ?? [];
}

export function resolvePlugins(
	plugins: readonly JsonPathPlugin[],
): ResolvePluginsResult {
	const ordered = orderPluginsDeterministically(plugins);
	const byId = new Map<JsonPathPluginId, JsonPathPlugin>();
	for (const p of ordered) byId.set(p.meta.id, p);

	// Dependency validation
	for (const p of ordered) {
		for (const dep of list(p.meta.dependsOn)) {
			if (!byId.has(dep)) {
				throw new JsonPathError({
					code: JsonPathErrorCodes.Plugin,
					message: `Missing required plugin dependency: ${p.meta.id} depends on ${dep}`,
					pluginIds: [p.meta.id, dep],
				});
			}
		}
	}

	// Capability conflict detection (exact match)
	const capabilityToOwner = new Map<JsonPathCapability, JsonPathPluginId>();
	for (const p of ordered) {
		for (const cap of list(p.meta.capabilities)) {
			const owner = capabilityToOwner.get(cap);
			if (owner && owner !== p.meta.id) {
				throw new JsonPathError({
					code: JsonPathErrorCodes.Plugin,
					message: `Capability conflict: ${cap} claimed by ${owner} and ${p.meta.id}`,
					pluginIds: [owner, p.meta.id],
				});
			}
			capabilityToOwner.set(cap, p.meta.id);
		}
	}

	return { ordered, byId };
}
