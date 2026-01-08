import { dataMapImmutableAdapter } from './immutable.data-map.js';
import { dataMapSignalsAdapter } from './signals.data-map.js';
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

export const SIGNAL_ADAPTERS = [dataMapSignalsAdapter];
export const STATE_ADAPTERS = [dataMapStateAdapter];
export const IMMUTABLE_ADAPTERS = [dataMapImmutableAdapter];
export const PATH_ADAPTERS: import('./types.js').PathAdapter[] = [];
export const PUBSUB_ADAPTERS: import('./types.js').PubSubAdapter[] = [];
