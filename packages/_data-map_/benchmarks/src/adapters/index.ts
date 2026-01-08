import { dataMapAdapter } from './data-map.adapter.js';
import { dlvDsetAdapter } from './dlv-dset.adapter.js';
import { dotPropAdapter } from './dot-prop.adapter.js';
import { fastJsonPatchAdapter } from './fast-json-patch.adapter.js';
import { immerAdapter } from './immer.adapter.js';
import { immutableJsonPatchAdapter } from './immutable-json-patch.adapter.js';
import { jsonpathRawAdapter } from './jsonpath-raw.adapter.js';
import {
	klonaAdapter,
	klonaFullAdapter,
	klonaJsonAdapter,
} from './klona.adapter.js';
import { lodashAdapter } from './lodash.adapter.js';
import { mutativeAdapter } from './mutative.adapter.js';
import { nativeAdapter, jsonCloneAdapter } from './native.adapter.js';
import { rfc6902Adapter } from './rfc6902.adapter.js';
import {
	rfdcAdapter,
	rfdcCircularAdapter,
	rfdcProtoAdapter,
} from './rfdc.adapter.js';
import type { AdapterFeatures, BenchmarkAdapter } from './types.js';
import { valtioAdapter } from './valtio.adapter.js';
import { zustandAdapter } from './zustand.adapter.js';

// Re-export types
export type {
	BenchmarkAdapter,
	AdapterFeatures,
	PatchOp,
	SubscriptionHandle,
} from './types.js';

/**
 * Get all available benchmark adapters
 */
export function getAllAdapters(): BenchmarkAdapter[] {
	return [
		// Full-featured
		dataMapAdapter,
		jsonpathRawAdapter,

		// Path access
		lodashAdapter,
		dotPropAdapter,
		dlvDsetAdapter,

		// Immutable state
		mutativeAdapter,
		immerAdapter,

		// JSON Patch
		fastJsonPatchAdapter,
		rfc6902Adapter,
		immutableJsonPatchAdapter,

		// State management
		valtioAdapter,
		zustandAdapter,

		// Cloning
		nativeAdapter,
		jsonCloneAdapter,
		klonaAdapter,
		klonaFullAdapter,
		klonaJsonAdapter,
		rfdcAdapter,
		rfdcCircularAdapter,
		rfdcProtoAdapter,
	];
}

/**
 * Filter adapters by feature support
 */
export function getAdaptersWithFeature<K extends keyof AdapterFeatures>(
	feature: K,
): BenchmarkAdapter[] {
	return getAllAdapters().filter((a) => a.features[feature]);
}

/**
 * Filter adapters by category
 */
export function getAdaptersByCategory(
	category: BenchmarkAdapter['category'],
): BenchmarkAdapter[] {
	return getAllAdapters().filter((a) => a.category === category);
}

/**
 * Get adapters that support a specific operation
 */
export function getAdaptersForOperation(
	operation:
		| 'get'
		| 'set'
		| 'patch'
		| 'clone'
		| 'subscribe'
		| 'batch'
		| 'push'
		| 'pop'
		| 'map',
): BenchmarkAdapter[] {
	return getAdaptersWithFeature(operation).filter((a) => {
		switch (operation) {
			case 'get':
				return typeof a.get === 'function';
			case 'set':
				return typeof a.set === 'function';
			case 'patch':
				return typeof a.applyPatch === 'function';
			case 'clone':
				return typeof a.clone === 'function';
			case 'subscribe':
				return typeof a.subscribe === 'function';
			case 'batch':
				return typeof a.batch === 'function';
			case 'push':
				return typeof a.push === 'function';
			case 'pop':
				return typeof a.pop === 'function';
			case 'map':
				return typeof a.map === 'function';
			default:
				return false;
		}
	});
}

/**
 * Group adapters by category for organized benchmarking
 */
export function getAdaptersGroupedByCategory(): Record<
	string,
	BenchmarkAdapter[]
> {
	const adapters = getAllAdapters();
	const groups: Record<string, BenchmarkAdapter[]> = {};

	for (const adapter of adapters) {
		const category = adapter.category ?? 'other';
		if (!groups[category]) groups[category] = [];
		groups[category].push(adapter);
	}

	return groups;
}

// Export individual adapters for direct use
export {
	dataMapAdapter,
	dlvDsetAdapter,
	dotPropAdapter,
	fastJsonPatchAdapter,
	immerAdapter,
	immutableJsonPatchAdapter,
	jsonpathRawAdapter,
	klonaAdapter,
	klonaFullAdapter,
	klonaJsonAdapter,
	lodashAdapter,
	mutativeAdapter,
	nativeAdapter,
	jsonCloneAdapter,
	rfc6902Adapter,
	rfdcAdapter,
	rfdcCircularAdapter,
	rfdcProtoAdapter,
	valtioAdapter,
	zustandAdapter,
};
