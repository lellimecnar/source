export type Pointer = string;

export type SubscriptionKind = 'exact' | 'pattern' | 'query';

export interface SubscriptionEvent {
	pointer: Pointer;
	value: unknown;
}

export type Unsubscribe = () => void;

export type Subscriber = (event: SubscriptionEvent) => void;

export interface Subscription {
	id: symbol;
	kind: SubscriptionKind;
	pattern: string;
	subscriber: Subscriber;
}

export interface CompiledPattern {
	pattern: string;
	kind: 'pattern' | 'query';
	matchesPointer(pointer: Pointer): boolean;
}
