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

export const SIGNAL_ADAPTERS: import('./types.js').SignalAdapter[] = [];
export const STATE_ADAPTERS: import('./types.js').StateAdapter[] = [];
export const IMMUTABLE_ADAPTERS: import('./types.js').ImmutableAdapter[] = [];
export const PATH_ADAPTERS: import('./types.js').PathAdapter[] = [];
export const PUBSUB_ADAPTERS: import('./types.js').PubSubAdapter[] = [];
