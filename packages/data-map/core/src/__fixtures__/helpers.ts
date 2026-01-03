import { type DataMapOptions } from 'src/types';

import { DataMap } from '../datamap';
import { complexData } from './data';
import type { SubscriptionEventInfo } from '../subscription/types';

export function createDataMap<T = typeof complexData>(
	overrides?: T,
	options?: DataMapOptions<T, any>,
) {
	const initial = overrides ?? (structuredClone(complexData) as T);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- testing
	return new DataMap(initial, options);
}

export interface EventSpy {
	events: SubscriptionEventInfo[];
	values: unknown[];
	fn: (
		value: unknown,
		event: SubscriptionEventInfo,
		cancel: () => void,
	) => void;
}

export function createEventSpy(): EventSpy {
	const events: SubscriptionEventInfo[] = [];
	const values: unknown[] = [];

	return {
		events,
		values,
		fn: (value: unknown, event: SubscriptionEventInfo) => {
			values.push(value);
			events.push(event);
		},
	};
}

export async function flushMicrotasks(): Promise<void> {
	await new Promise<void>((resolve) => {
		queueMicrotask(resolve);
	});
}
