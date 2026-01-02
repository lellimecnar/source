import { orderPluginsDeterministically } from './order';
import { PhaseOrder, type PluginPhase } from './phases';
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
	// 1. Handle duplicates and allowMultiple
	const byId = new Map<JsonPathPluginId, JsonPathPlugin<any>>();
	const inputOrdered = orderPluginsDeterministically(plugins);

	for (const p of inputOrdered) {
		if (byId.has(p.meta.id) && !p.meta.allowMultiple) {
			// Last wins for non-multiple plugins
			byId.set(p.meta.id, p);
		} else {
			byId.set(p.meta.id, p);
		}
	}

	const uniquePlugins = [...byId.values()];

	// 2. Validate dependencies (global)
	for (const p of uniquePlugins) {
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

	// 3. Group by phase
	const phaseGroups = new Map<PluginPhase, JsonPathPlugin<any>[]>();
	for (const phase of PhaseOrder) {
		phaseGroups.set(phase, []);
	}

	for (const p of uniquePlugins) {
		for (const phase of p.meta.phases) {
			phaseGroups.get(phase)?.push(p);
		}
	}

	const finalOrdered: JsonPathPlugin<any>[] = [];

	// 4. Resolve each phase independently
	for (const phase of PhaseOrder) {
		const phasePlugins = phaseGroups.get(phase)!;
		if (phasePlugins.length === 0) continue;

		// Topological sort within phase based on order constraints and dependencies
		const phaseOrdered = resolvePhase(phasePlugins);
		finalOrdered.push(...phaseOrdered);
	}

	// 5. Capability conflict detection (global)
	const capabilityToOwner = new Map<JsonPathCapability, JsonPathPluginId>();
	for (const p of finalOrdered) {
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

	return {
		ordered: finalOrdered,
		byId,
	};
}

function resolvePhase(plugins: JsonPathPlugin<any>[]): JsonPathPlugin<any>[] {
	const ids = plugins.map((p) => p.meta.id);
	const byId = new Map(plugins.map((p) => [p.meta.id, p]));

	const outgoing = new Map<JsonPathPluginId, Set<JsonPathPluginId>>();
	const indegree = new Map<JsonPathPluginId, number>();

	for (const id of ids) {
		outgoing.set(id, new Set());
		indegree.set(id, 0);
	}

	const addEdge = (from: JsonPathPluginId, to: JsonPathPluginId) => {
		if (!byId.has(from) || !byId.has(to)) return;
		const set = outgoing.get(from)!;
		if (set.has(to)) return;
		set.add(to);
		indegree.set(to, (indegree.get(to) ?? 0) + 1);
	};

	for (const p of plugins) {
		// Respect dependsOn if in same phase
		for (const dep of list(p.meta.dependsOn)) {
			addEdge(dep, p.meta.id);
		}
		for (const dep of list(p.meta.optionalDependsOn)) {
			addEdge(dep, p.meta.id);
		}

		const { order } = p.meta;
		if (!order) continue;

		if (order.before) {
			for (const targetId of order.before) {
				addEdge(p.meta.id, targetId);
			}
		}
		if (order.after) {
			for (const targetId of order.after) {
				addEdge(targetId, p.meta.id);
			}
		}
		if (order.first) {
			for (const otherId of ids) {
				if (otherId !== p.meta.id) {
					addEdge(p.meta.id, otherId);
				}
			}
		}
		if (order.last) {
			for (const otherId of ids) {
				if (otherId !== p.meta.id) {
					addEdge(otherId, p.meta.id);
				}
			}
		}
	}

	// Standard topological sort
	const queue: JsonPathPluginId[] = ids.filter(
		(id) => (indegree.get(id) ?? 0) === 0,
	);
	queue.sort((a, b) => a.localeCompare(b));

	const ordered: JsonPathPlugin<any>[] = [];
	while (queue.length > 0) {
		const id = queue.shift()!;
		ordered.push(byId.get(id));

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

	if (ordered.length !== ids.length) {
		// Cycle detected or unsatisfiable constraints
		// Fallback to stable ID ordering for the remaining plugins
		const remainingIds = ids.filter(
			(id) => !ordered.some((p) => p.meta.id === id),
		);
		remainingIds.sort((a, b) => a.localeCompare(b));
		for (const id of remainingIds) {
			ordered.push(byId.get(id));
		}
	}

	return ordered;
}
