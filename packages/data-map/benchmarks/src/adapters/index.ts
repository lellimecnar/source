import { klonaCloningAdapter } from './cloning.klona.js';
import { rfdcCloningAdapter } from './cloning.rfdc.js';
import { structuredCloneCloningAdapter } from './cloning.structured-clone.js';
import { dataMapImmutableAdapter } from './immutable.data-map.js';
import { immerImmutableAdapter } from './immutable.immer.js';
import { mutativeImmutableAdapter } from './immutable.mutative.js';
import { dataMapJsonPatchAdapter } from './jsonpatch.data-map.js';
import { fastJsonPatchAdapter } from './jsonpatch.fast-json-patch.js';
import { immutableJsonPatchAdapter } from './jsonpatch.immutable-json-patch.js';
import { rfc6902Adapter } from './jsonpatch.rfc6902.js';
import { dataMapPathAdapter } from './path.data-map.js';
import { dlvDsetPathAdapter } from './path.dlv-dset.js';
import { dotPropPathAdapter } from './path.dot-prop.js';
import { jsonPointerPathAdapter } from './path.json-pointer.js';
import { lodashPathAdapter } from './path.lodash.js';
import { objectPathAdapter } from './path.object-path.js';
import { dataMapPubSubAdapter } from './pubsub.data-map.js';
import { eventemitter3PubSubAdapter } from './pubsub.eventemitter3.js';
import { mittPubSubAdapter } from './pubsub.mitt.js';
import { nanoeventsPubSubAdapter } from './pubsub.nanoevents.js';
import { dataMapSignalsAdapter } from './signals.data-map.js';
import { maverickSignalsAdapter } from './signals.maverick.js';
import { nanostoresSignalsAdapter } from './signals.nanostores.js';
import { preactSignalsAdapter } from './signals.preact.js';
import { solidSignalsAdapter } from './signals.solid.js';
import { vueSignalsAdapter } from './signals.vue.js';
import { dataMapStateAdapter } from './state.data-map.js';
import { jotaiStateAdapter } from './state.jotai.js';
import { valtioStateAdapter } from './state.valtio.js';
import { zustandStateAdapter } from './state.zustand.js';

export type {
	AdapterKind,
	BaseAdapter,
	SignalAdapter,
	StateAdapter,
	ImmutableAdapter,
	PathAdapter,
	PubSubAdapter,
	JsonPatchAdapter,
	JsonPatchOperation,
	CloningAdapter,
	SupportFlag,
} from './types.js';

export const SIGNAL_ADAPTERS = [
	dataMapSignalsAdapter,
	preactSignalsAdapter,
	maverickSignalsAdapter,
	vueSignalsAdapter,
	nanostoresSignalsAdapter,
	solidSignalsAdapter,
];

export const STATE_ADAPTERS = [
	dataMapStateAdapter,
	valtioStateAdapter,
	zustandStateAdapter,
	jotaiStateAdapter,
];

export const IMMUTABLE_ADAPTERS = [
	dataMapImmutableAdapter,
	immerImmutableAdapter,
	mutativeImmutableAdapter,
];

export const PATH_ADAPTERS = [
	dataMapPathAdapter,
	lodashPathAdapter,
	dotPropPathAdapter,
	dlvDsetPathAdapter,
	objectPathAdapter,
	jsonPointerPathAdapter,
];

export const PUBSUB_ADAPTERS = [
	dataMapPubSubAdapter,
	mittPubSubAdapter,
	eventemitter3PubSubAdapter,
	nanoeventsPubSubAdapter,
];

export const JSONPATCH_ADAPTERS = [
	dataMapJsonPatchAdapter,
	fastJsonPatchAdapter,
	rfc6902Adapter,
	immutableJsonPatchAdapter,
];

export const CLONING_ADAPTERS = [
	klonaCloningAdapter,
	rfdcCloningAdapter,
	structuredCloneCloningAdapter,
];
