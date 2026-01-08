import { dataMapSignalsAdapter } from './signals.data-map.js';
import { maverickSignalsAdapter } from './signals.maverick.js';
import { nanostoresSignalsAdapter } from './signals.nanostores.js';
import { preactSignalsAdapter } from './signals.preact.js';
import { solidSignalsAdapter } from './signals.solid.js';
import { vueSignalsAdapter } from './signals.vue.js';

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

export const STATE_ADAPTERS: import('./types.js').StateAdapter[] = [];
export const IMMUTABLE_ADAPTERS: import('./types.js').ImmutableAdapter[] = [];
export const PATH_ADAPTERS: import('./types.js').PathAdapter[] = [];
export const PUBSUB_ADAPTERS: import('./types.js').PubSubAdapter[] = [];
