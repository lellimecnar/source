import { describe, expect, it, vi } from 'vitest';
import { SubscriptionEngine } from '../subscription-engine.js';

describe('SubscriptionEngine', () => {
	it('notifies exact pointer subscribers', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePointer('/a/b', fn);
		engine.notify('/a/b', 123);
		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn.mock.calls[0][0]).toEqual({ pointer: '/a/b', value: 123 });
	});

	it('matches wildcard patterns like $.users[*].name', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePattern('$.users[*].name', fn);
		engine.notify('/users/0/name', 'Alice');
		engine.notify('/users/1/name', 'Bob');
		engine.notify('/users/0/age', 1);
		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('matches recursive descent like $..name', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePattern('$..name', fn);
		engine.notify('/users/0/name', 'Alice');
		engine.notify('/org/name', 'ACME');
		engine.notify('/users/0/age', 1);
		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(2);
	});
});
