import { bench, describe } from 'vitest';

import { DataMap } from '../datamap';

describe('DataMap benchmarks', () => {
	describe('resolve and get operations', () => {
		const dm = new DataMap({
			users: [
				{ id: '1', name: 'Alice', email: 'alice@example.com' },
				{ id: '2', name: 'Bob', email: 'bob@example.com' },
				{ id: '3', name: 'Charlie', email: 'charlie@example.com' },
			],
			settings: { theme: 'dark', language: 'en' },
			metadata: { version: '1.0', timestamp: Date.now() },
		});

		bench('resolve with static pointer', () => {
			dm.resolve('/users/0');
		});

		bench('resolve with wildcard', () => {
			dm.resolve('/users/*/id');
		});

		bench('resolve with recursive descent', () => {
			dm.resolve('$..id');
		});

		bench('get with static pointer', () => {
			dm.get('/users/0');
		});

		bench('get with wildcard', () => {
			dm.get('/users/*/name');
		});

		bench('peek operation', () => {
			dm.peek('/users/0');
		});
	});

	describe('write operations', () => {
		bench('set single value', () => {
			const dm = new DataMap({ a: 1, b: 2 });
			dm.set('/a', 2);
		});

		bench('patch single operation', () => {
			const dm = new DataMap({ a: 1, b: 2 });
			dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
		});

		bench('patch multiple operations', () => {
			const dm = new DataMap({ a: 1, b: 2, c: 3 });
			dm.patch([
				{ op: 'replace', path: '/a', value: 10 },
				{ op: 'replace', path: '/b', value: 20 },
				{ op: 'replace', path: '/c', value: 30 },
			]);
		});

		bench('batch set operations', () => {
			const dm = new DataMap({ a: 1, b: 2, c: 3 });
			dm.batch((d: DataMap<any, any>) => {
				d.set('/a', 10);
				d.set('/b', 20);
				d.set('/c', 30);
			});
		});

		bench('fluent batch operations', () => {
			const dm = new DataMap({ a: 1, b: 2, c: 3 });
			dm.batch.set('/a', 10).set('/b', 20).set('/c', 30).apply();
		});
	});

	describe('subscriptions', () => {
		bench('subscribe to static pointer', () => {
			const dm = new DataMap({ a: { b: { c: 1 } } });
			dm.subscribe({
				path: '/a/b/c',
				after: 'patch',
				fn: () => {},
			});
		});

		bench('subscribe to wildcard path', () => {
			const dm = new DataMap({ users: [{ id: 1 }, { id: 2 }] });
			dm.subscribe({
				path: '/users/*/id',
				after: 'patch',
				fn: () => {},
			});
		});

		bench('subscribe to recursive descent', () => {
			const dm = new DataMap({
				nested: { data: { value: 1, child: { value: 2 } } },
			});
			dm.subscribe({
				path: '$..value',
				after: 'patch',
				fn: () => {},
			});
		});

		bench('notification dispatch with many subscribers', () => {
			const dm = new DataMap({ a: 1 });
			for (let i = 0; i < 50; i++) {
				dm.subscribe({
					path: '/a',
					after: 'patch',
					fn: () => {},
				});
			}
			dm.set('/a', 2);
		});
	});

	describe('pattern matching', () => {
		const largeData = {
			items: Array.from({ length: 100 }, (_, i) => ({
				id: i,
				name: `Item ${i}`,
				tags: ['tag1', 'tag2'],
				metadata: { created: Date.now() },
			})),
		};

		bench('match array elements', () => {
			const dm = new DataMap(largeData);
			dm.resolve('/items/*/id');
		});

		bench('recursive descent on large structure', () => {
			const dm = new DataMap(largeData);
			dm.resolve('$..id');
		});

		bench('filter expression evaluation', () => {
			const dm = new DataMap(largeData);
			dm.resolve('$.items[?@.id > 50]');
		});
	});

	describe('definition resolution', () => {
		const defs = [
			{ pointer: '/a', readOnly: true, type: 'number' },
			{ pointer: '/b', type: 'string' },
			{ path: '/c/*', readOnly: false },
		];

		bench('resolve with definitions', () => {
			const dm = new DataMap(
				{ a: 1, b: 'hello', c: [1, 2, 3] },
				{ define: defs },
			);
			dm.resolve('/a');
		});

		bench('apply definition getters', () => {
			const dm = new DataMap(
				{ count: 0 },
				{
					define: [
						{
							pointer: '/count',
							get: (v) => (v as number) + 1,
						},
					],
				},
			);
			dm.resolve('/count');
		});
	});
});
