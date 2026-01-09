import { dataMapImmutableAdapter } from './immutable.data-map.js';
import { dataMapPathAdapter } from './path.data-map.js';
import { dlvDsetPathAdapter } from './path.dlv-dset.js';
import { dotPropPathAdapter } from './path.dot-prop.js';
import { lodashPathAdapter } from './path.lodash.js';
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

export type {
	AdapterKind,
	BaseAdapter,
	SignalAdapter,
	StateAdapter,
	ImmutableAdapter,
	PathAdapter,
	PubSubAdapter,
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
export const STATE_ADAPTERS = [dataMapStateAdapter];
export const IMMUTABLE_ADAPTERS = [dataMapImmutableAdapter];
export const PATH_ADAPTERS = [
	dataMapPathAdapter,
	lodashPathAdapter,
	dotPropPathAdapter,
	dlvDsetPathAdapter,
];
export const PUBSUB_ADAPTERS = [
	dataMapPubSubAdapter,
	mittPubSubAdapter,
	eventemitter3PubSubAdapter,
	nanoeventsPubSubAdapter,
];
