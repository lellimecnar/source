import { describe, expect, it } from 'vitest';

import { createUISpecStore } from './store';

describe('UISpecStore subscriptions', () => {
	it('subscribe() is idempotent to unsubscribe', () => {
		const store = createUISpecStore({ a: 1 });
		let count = 0;
		const unsub = store.subscribe(() => {
			count += 1;
		});
		unsub();
		unsub();

		store.patch([{ op: 'replace', path: '/a', value: 2 }]);
		expect(count).toBe(0);
	});

	it('select() does not produce stale reads after patch', () => {
		const store = createUISpecStore({ a: 1 });
		const seen: number[] = [];
		const unsub = store.select<number>('$.a').subscribe((v) => seen.push(v));

		store.patch([{ op: 'replace', path: '/a', value: 2 }]);
		expect(seen[seen.length - 1]).toBe(2);

		unsub();
	});

	it('multiple subscribers get notified', () => {
		const store = createUISpecStore({ a: 1 });
		let a = 0;
		let b = 0;
		const ua = store.subscribe(() => (a += 1));
		const ub = store.subscribe(() => (b += 1));

		store.patch([{ op: 'replace', path: '/a', value: 2 }]);
		expect(a).toBe(1);
		expect(b).toBe(1);

		ua();
		ub();
	});
});
