import type { SubscriptionConfig } from './types';

export type SubscriptionId = string;

export function isExactPointer(path: string): boolean {
	return path === '' || path.startsWith('/');
}

export function isPrefixPointer(path: string): boolean {
	return isExactPointer(path) && path.endsWith('/');
}

export interface TieredIndex {
	exact: Map<string, Set<SubscriptionId>>;
	prefix: Map<string, Set<SubscriptionId>>;
}

export function createTieredIndex(): TieredIndex {
	return { exact: new Map(), prefix: new Map() };
}

export function addToIndex(
	index: TieredIndex,
	path: string,
	id: SubscriptionId,
): void {
	if (isPrefixPointer(path)) {
		const set = index.prefix.get(path) ?? new Set<SubscriptionId>();
		set.add(id);
		index.prefix.set(path, set);
		return;
	}
	const set = index.exact.get(path) ?? new Set<SubscriptionId>();
	set.add(id);
	index.exact.set(path, set);
}

export function matchIndex(
	index: TieredIndex,
	pointer: string,
): Set<SubscriptionId> {
	const matched = new Set<SubscriptionId>();
	index.exact.get(pointer)?.forEach((id) => matched.add(id));
	for (const [prefix, ids] of index.prefix) {
		if (prefix === '' || pointer.startsWith(prefix)) {
			ids.forEach((id) => matched.add(id));
		}
	}
	return matched;
}
