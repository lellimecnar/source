import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { flushMicrotasks } from '../__fixtures__/helpers';

describe('subscription events', () => {
	it("treats 'set' as an alias for 'patch' for stage selection", async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		dm.subscribe({
			path: '/a',
			after: 'set',
			fn: () => calls.push('after:set'),
		});
		dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
		await flushMicrotasks();
		expect(calls).toEqual(['after:set']);
	});

	it('supports multiple event types in single subscription', async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		dm.subscribe({
			path: '/a',
			before: ['patch', 'set'],
			after: 'patch',
			fn: (_v, e) => calls.push(`${e.stage}:${e.type}`),
		});
		dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
		await flushMicrotasks();
		// before fires for both types, after fires once
		expect(calls).toContain('before:patch');
		expect(calls).toContain('after:patch');
	});

	it('receives operation info in event', async () => {
		const dm = new DataMap({ a: 1 });
		let operation: any;
		dm.subscribe({
			path: '/a',
			after: 'patch',
			fn: (_v, e) => {
				operation = e.operation;
			},
		});
		dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
		await flushMicrotasks();
		expect(operation?.op).toBe('replace');
	});
});
