import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { detectPathType } from '../path/detect';

const flushMicrotasks = () => new Promise((resolve) => queueMicrotask(resolve));

describe('spec compliance', () => {
	describe('Requirements (REQ-*)', () => {
		describe('REQ-001: json-p3 JSONPath behavior', () => {
			it('uses json-p3 semantics for JSONPath queries', () => {
				const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
				expect(dm.getAll('$.users[*].name')).toEqual(['A', 'B']);
			});

			it('supports recursive descent', () => {
				const dm = new DataMap({
					a: { b: { name: 'x' } },
					c: { name: 'y' },
				});
				expect(dm.getAll('$..name').sort()).toEqual(['x', 'y']);
			});
		});

		describe('REQ-002: RFC6902 patch operations', () => {
			it('supports add operation', () => {
				const dm = new DataMap({ items: [1] });
				dm.patch([{ op: 'add', path: '/items/-', value: 2 }]);
				expect(dm.get('/items')).toEqual([1, 2]);
			});

			it('supports remove operation', () => {
				const dm = new DataMap({ a: 1, b: 2 });
				dm.patch([{ op: 'remove', path: '/a' }]);
				expect(dm.get('/a')).toBeUndefined();
			});

			it('supports replace operation', () => {
				const dm = new DataMap({ a: 1 });
				dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
				expect(dm.get('/a')).toBe(2);
			});

			it('supports copy operation', () => {
				const dm = new DataMap({ a: 1 });
				dm.patch([{ op: 'copy', from: '/a', path: '/b' }]);
				expect(dm.get('/b')).toBe(1);
			});

			it('supports move operation', () => {
				const dm = new DataMap({ a: 1 });
				dm.patch([{ op: 'move', from: '/a', path: '/b' }]);
				expect(dm.get('/a')).toBeUndefined();
				expect(dm.get('/b')).toBe(1);
			});

			it('supports test operation', () => {
				const dm = new DataMap({ a: 1 }, { strict: true });
				expect(() =>
					dm.patch([{ op: 'test', path: '/a', value: 2 }]),
				).toThrow();
				expect(() =>
					dm.patch([{ op: 'test', path: '/a', value: 1 }]),
				).not.toThrow();
			});
		});

		describe('REQ-003: Immutability', () => {
			it('does not mutate initial data', () => {
				const initial = { a: 1 };
				const dm = new DataMap(initial);
				dm.set('/a', 2);
				expect(initial.a).toBe(1);
			});

			it('supports snapshot tradeoffs via snapshotMode', () => {
				// Default is fastest by-reference snapshot (v0 breaking change per plan).
				const dm = new DataMap({ a: { b: 1 } });
				const refSnap = dm.getSnapshot() as any;
				refSnap.a.b = 999;
				expect(dm.get('/a/b')).toBe(999);

				// Use snapshotMode='clone' for mutation isolation.
				const dmClone = new DataMap({ a: { b: 1 } }, {
					snapshotMode: 'clone',
				} as any);
				const clonedSnap = dmClone.getSnapshot() as any;
				clonedSnap.a.b = 999;
				expect(dmClone.get('/a/b')).toBe(1);
			});
		});

		describe('REQ-004: Path interchangeability', () => {
			it('accepts JSON Pointer and JSONPath interchangeably for reads', () => {
				const dm = new DataMap({ user: { id: 1 } });
				expect(dm.get('/user/id')).toBe(1);
				expect(dm.get('$.user.id')).toBe(1);
			});
		});

		describe('REQ-005: Path type detection', () => {
			it('classifies pointer vs relative-pointer vs jsonpath', () => {
				expect(detectPathType('')).toBe('pointer');
				expect(detectPathType('/')).toBe('pointer');
				expect(detectPathType('/a')).toBe('pointer');
				expect(detectPathType('#/a')).toBe('pointer');
				expect(detectPathType('0')).toBe('relative-pointer');
				expect(detectPathType('1/a')).toBe('relative-pointer');
				expect(detectPathType('$')).toBe('jsonpath');
				expect(detectPathType('$.a')).toBe('jsonpath');
				expect(detectPathType('$..a')).toBe('jsonpath');
			});
		});

		describe('REQ-006: Subscription system', () => {
			it('supports before/on/after stages', async () => {
				const dm = new DataMap({ a: 1 });
				const stages: string[] = [];

				dm.subscribe({
					path: '/a',
					before: 'patch',
					on: 'patch',
					after: 'patch',
					fn: (_v, e) => stages.push(e.stage),
				});

				dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
				expect(stages).toEqual(['before']);
				await flushMicrotasks();
				expect(stages).toEqual(['before', 'on', 'after']);
			});

			it('supports unsubscribe', async () => {
				const dm = new DataMap({ a: 1 });
				const calls: number[] = [];

				const sub = dm.subscribe({
					path: '/a',
					after: 'patch',
					fn: (v) => calls.push(v as number),
				});

				dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
				await flushMicrotasks();
				sub.unsubscribe();
				dm.patch([{ op: 'replace', path: '/a', value: 3 }]);

				await flushMicrotasks();
				expect(calls).toEqual([2]);
			});
		});

		describe('REQ-010/011/012: patch generation (minimal, deterministic, container creation)', () => {
			it('AC-008: set() on an existing pointer generates a replace op', () => {
				const dm = new DataMap({ a: 1 });
				expect(dm.set.toPatch('/a', 2)).toEqual([
					{ op: 'replace', path: '/a', value: 2 },
				]);
			});

			it('AC-009: set() on a missing deep pointer creates intermediate containers', () => {
				const dm = new DataMap({} as any);
				expect(dm.set.toPatch('/a/0/b', 'x')).toEqual([
					{ op: 'add', path: '/a', value: [] },
					{ op: 'add', path: '/a/0', value: {} },
					{ op: 'add', path: '/a/0/b', value: 'x' },
				]);
			});

			it('REQ-011: setAll.toPatch() is deterministic for stable match sets', () => {
				const dm = new DataMap({
					users: [{ active: false }, { active: true }],
				});
				const p1 = dm.setAll.toPatch('$.users[*].active', (v) => !v);
				const p2 = dm.setAll.toPatch('$.users[*].active', (v) => !v);
				expect(p1).toEqual(p2);
			});
		});
	});

	describe('Acceptance Criteria (AC-*)', () => {
		// Use SPEC_COMPLIANCE_REPORT.md as the source-of-truth matrix.
		// Add one describe() per AC-* grouping (constructor/read/mutate/batch/subscriptions/definitions/array ops).
		// Prefer tests that verify both strict and non-strict branches where applicable.

		describe('AC-010: setAll updates all matched locations', () => {
			it('updates every match and preserves deterministic match order', () => {
				const dm = new DataMap({
					users: [{ active: false }, { active: false }],
				});
				dm.setAll('$.users[*].active', true);
				expect(dm.get('/users/0/active')).toBe(true);
				expect(dm.get('/users/1/active')).toBe(true);
			});
		});

		describe('AC-023/AC-024: before:set cancellation and transformation', () => {
			it('AC-023: cancel() aborts a set() in strict mode', () => {
				const dm = new DataMap({ a: 1 }, { strict: true });
				dm.subscribe({
					path: '/a',
					before: 'set',
					fn: (_v, _e, cancel) => cancel(),
				});
				expect(() => dm.set('/a', 2)).toThrow(
					'Patch cancelled by subscription',
				);
				expect(dm.get('/a')).toBe(1);
			});

			it('AC-024: returning a value from before:set transforms stored value', () => {
				const dm = new DataMap({ a: 1 }, { strict: true });
				dm.subscribe({
					path: '/a',
					before: 'set',
					fn: (v) => (v as number) * 2,
				});
				dm.set('/a', 3);
				expect(dm.get('/a')).toBe(6);
			});
		});
	});
});
