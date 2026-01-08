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
		expect(fn.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				pointer: '/a/b',
				value: 123,
				previousValue: undefined,
				stage: 'on',
				cancel: expect.any(Function),
			}),
		);
	});

	it('supports previousValue', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePointer('/x', fn);
		engine.notify('/x', 2, 1);
		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				pointer: '/x',
				value: 2,
				previousValue: 1,
				stage: 'on',
			}),
		);
	});

	it('supports immediate option for pointer subscriptions', () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePointer('/immediate', fn, { immediate: true });
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				pointer: '/immediate',
				value: undefined,
				previousValue: undefined,
				stage: 'on',
			}),
		);
	});

	it('supports deep option (prefix match with pointer boundaries)', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePointer('/a', fn, { deep: true });
		engine.notify('/a/b', 1);
		engine.notify('/a2', 2);
		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn.mock.calls[0][0]).toEqual(
			expect.objectContaining({ pointer: '/a/b', value: 1, stage: 'on' }),
		);
	});

	it('supports debounce option (on stage)', async () => {
		vi.useFakeTimers();
		try {
			const engine = new SubscriptionEngine();
			const fn = vi.fn();
			engine.subscribePointer('/d', fn, { debounce: 10 });
			engine.notify('/d', 1);
			engine.notify('/d', 2);
			engine.notify('/d', 3);
			await Promise.resolve();
			expect(fn).toHaveBeenCalledTimes(0);

			vi.advanceTimersByTime(10);
			await Promise.resolve();
			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn.mock.calls[0][0]).toEqual(
				expect.objectContaining({ pointer: '/d', value: 3, stage: 'on' }),
			);
		} finally {
			vi.useRealTimers();
		}
	});

	it('supports stages and cancel()', async () => {
		const engine = new SubscriptionEngine();
		const calls: string[] = [];
		engine.subscribePointer(
			'/staged',
			(e) => {
				calls.push(e.stage);
				if (e.stage === 'before') e.cancel();
			},
			{ stages: ['before', 'on', 'after'] },
		);
		engine.notify('/staged', 1);
		await Promise.resolve();
		// Cancel in before prevents on/after.
		expect(calls).toEqual(['before']);
	});

	it('matches wildcard patterns like $.users[*].name', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePattern('$.users[*].name', fn);
		engine.notify('/users/0/name', 'Alice');
		engine.notify('/users/1/name', 'Bob');
		engine.notify('/users/0/age', 1);
		await Promise.resolve();
		// Pattern subscriptions are microtask-batched and coalesced per subscriber.
		// With two matching updates in the same tick, the subscriber sees the last one.
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				pointer: '/users/1/name',
				value: 'Bob',
				previousValue: undefined,
				stage: 'on',
				cancel: expect.any(Function),
			}),
		);
	});

	it('matches recursive descent like $..name', async () => {
		const engine = new SubscriptionEngine();
		const fn = vi.fn();
		engine.subscribePattern('$..name', fn);
		engine.notify('/users/0/name', 'Alice');
		engine.notify('/org/name', 'ACME');
		engine.notify('/users/0/age', 1);
		await Promise.resolve();
		// Same batching/coalescing behavior as other pattern subscriptions.
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				pointer: '/org/name',
				value: 'ACME',
				previousValue: undefined,
				stage: 'on',
				cancel: expect.any(Function),
			}),
		);
	});
});
