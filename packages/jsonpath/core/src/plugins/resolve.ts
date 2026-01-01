import { orderPluginsDeterministically } from './order';
import type {
	JsonPathCapability,
	JsonPathPlugin,
	JsonPathPluginId,
} from './types';
import { JsonPathErrorCodes } from '../errors/codes';
import { JsonPathError } from '../errors/JsonPathError';

export interface ResolvePluginsResult {
	ordered: readonly JsonPathPlugin<any>[];
	byId: ReadonlyMap<JsonPathPluginId, JsonPathPlugin<any>>;
}

function list(p?: readonly string[]): readonly string[] {
	return p ?? [];
}

export function resolvePlugins(
	plugins: readonly JsonPathPlugin<any>[],
): ResolvePluginsResult {
	const inputOrdered = orderPluginsDeterministically(plugins);

	const byId = new Map<JsonPathPluginId, JsonPathPlugin<any>>();
	const duplicates = new Set<JsonPathPluginId>();
	for (const p of inputOrdered) {
		if (byId.has(p.meta.id)) duplicates.add(p.meta.id);
		byId.set(p.meta.id, p);
	}

	if (duplicates.size > 0) {
		const ids = [...duplicates].sort((a, b) => a.localeCompare(b));
		throw new JsonPathError({
			code: JsonPathErrorCodes.Plugin,
			message: `Duplicate plugin ids provided: ${ids.join(', ')}`,
			pluginIds: ids,
		});
	}

	// Dependency validation and graph construction
	const ids = [...byId.keys()].sort((a, b) => a.localeCompare(b));
	const outgoing = new Map<JsonPathPluginId, Set<JsonPathPluginId>>();
	const indegree = new Map<JsonPathPluginId, number>();
	for (const id of ids) {
		outgoing.set(id, new Set());
		indegree.set(id, 0);
	}

	const addEdge = (from: JsonPathPluginId, to: JsonPathPluginId) => {
		const set = outgoing.get(from);
		if (!set) return;
		if (set.has(to)) return;
		set.add(to);
		indegree.set(to, (indegree.get(to) ?? 0) + 1);
	};

	for (const p of byId.values()) {
		for (const dep of list(p.meta.dependsOn)) {
			if (!byId.has(dep)) {
				throw new JsonPathError({
					code: JsonPathErrorCodes.Plugin,
					message: `Missing required plugin dependency: ${p.meta.id} depends on ${dep}`,
					pluginIds: [p.meta.id, dep],
				});
			}
			addEdge(dep, p.meta.id);
		}

		for (const dep of list(p.meta.optionalDependsOn)) {
			if (!byId.has(dep)) continue;
			addEdge(dep, p.meta.id);
		}
	}

	// Deterministic topological sort: prefer lowest plugin id on ties.
	const queue: JsonPathPluginId[] = ids.filter(
		(id) => (indegree.get(id) ?? 0) === 0,
	);
	queue.sort((a, b) => a.localeCompare(b));

	const orderedIds: JsonPathPluginId[] = [];
	while (queue.length > 0) {
		const id = queue.shift()!;
		orderedIds.push(id);

		const next = outgoing.get(id);
		if (!next) continue;
		for (const to of next) {
			const nextDegree = (indegree.get(to) ?? 0) - 1;
			indegree.set(to, nextDegree);
			if (nextDegree === 0) {
				queue.push(to);
			}
		}
		queue.sort((a, b) => a.localeCompare(b));
	}

	if (orderedIds.length !== ids.length) {
		const remaining = ids.filter((id) => (indegree.get(id) ?? 0) > 0);
		const remainingSet = new Set(remaining);

		const visited = new Set<JsonPathPluginId>();
		const inStack = new Set<JsonPathPluginId>();
		const stack: JsonPathPluginId[] = [];

		const findCycle = (
			start: JsonPathPluginId,
		): JsonPathPluginId[] | undefined => {
			const dfs = (id: JsonPathPluginId): JsonPathPluginId[] | undefined => {
				visited.add(id);
				inStack.add(id);
				stack.push(id);

				for (const to of outgoing.get(id) ?? []) {
					if (!remainingSet.has(to)) continue;
					if (!visited.has(to)) {
						const res = dfs(to);
						if (res) return res;
						continue;
					}
					if (inStack.has(to)) {
						const idx = stack.indexOf(to);
						if (idx >= 0) return [...stack.slice(idx), to];
						return [to, to];
					}
				}

				stack.pop();
				inStack.delete(id);
				return undefined;
			};

			return dfs(start);
		};

		const cycle = remaining.length > 0 ? findCycle(remaining[0]) : undefined;
		const pluginIds = cycle ?? remaining;
		const message = cycle
			? `Plugin dependency cycle detected: ${cycle.join(' -> ')}`
			: `Plugin dependency cycle detected among: ${remaining.join(', ')}`;

		throw new JsonPathError({
			code: JsonPathErrorCodes.Plugin,
			message,
			pluginIds,
		});
	}

	const ordered = orderedIds.map((id) => byId.get(id)!);

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
