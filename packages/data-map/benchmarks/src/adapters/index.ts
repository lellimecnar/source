import { dataMapAdapter } from './data-map.adapter.js';
import { dlvDsetAdapter } from './dlv-dset.adapter.js';
import { dotPropAdapter } from './dot-prop.adapter.js';
import { fastJsonPatchAdapter } from './fast-json-patch.adapter.js';
import { immerAdapter } from './immer.adapter.js';
import { immutableJsonPatchAdapter } from './immutable-json-patch.adapter.js';
import { jsonpathRawAdapter } from './jsonpath-raw.adapter.js';
import { klonaAdapter } from './klona.adapter.js';
import { lodashAdapter } from './lodash.adapter.js';
import { mutativeAdapter } from './mutative.adapter.js';
import { rfc6902Adapter } from './rfc6902.adapter.js';
import { rfdcAdapter } from './rfdc.adapter.js';
import type { BenchmarkAdapter } from './types.js';
import { valtioAdapter } from './valtio.adapter.js';
import { zustandAdapter } from './zustand.adapter.js';

export function getAllAdapters(): BenchmarkAdapter[] {
	return [
		dataMapAdapter,
		lodashAdapter,
		dotPropAdapter,
		dlvDsetAdapter,
		mutativeAdapter,
		immerAdapter,
		fastJsonPatchAdapter,
		rfc6902Adapter,
		immutableJsonPatchAdapter,
		jsonpathRawAdapter,
		valtioAdapter,
		zustandAdapter,
		klonaAdapter,
		rfdcAdapter,
	];
}
