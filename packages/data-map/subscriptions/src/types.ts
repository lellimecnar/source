export type Pointer = string;

export type SubscriptionKind = 'exact' | 'pattern' | 'query';

export type SubscriptionStage = 'before' | 'on' | 'after';

export interface SubscriptionOptions {
	/** Invoke the callback immediately on subscribe (best-effort; value is unknown). */
	immediate?: boolean;
	/** Receive notifications for descendant pointers (prefix match). */
	deep?: boolean;
	/** Debounce notifications (ms). Applied to the 'on' stage. */
	debounce?: number;
	/** Stages to receive notifications for. Defaults to ['on']. */
	stages?: SubscriptionStage[];
}

export interface SubscriptionEvent {
	pointer: Pointer;
	value: unknown;
	previousValue: unknown;
	stage: SubscriptionStage;
	cancel: () => void;
}

export type Unsubscribe = () => void;

export type Subscriber = (event: SubscriptionEvent) => void;

export interface Subscription {
	id: symbol;
	kind: SubscriptionKind;
	pattern: string;
	subscriber: Subscriber;
	options?: SubscriptionOptions;
}

export interface CompiledPattern {
	pattern: string;
	kind: 'pattern' | 'query';
	matchesPointer: (pointer: Pointer) => boolean;
}
