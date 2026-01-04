import { describe, it, expect } from 'vitest';
import { parse } from '@jsonpath/parser';
import { evaluate } from '../evaluator.js';

describe('plugins', () => {
	it('runs hooks and isolates failures', () => {
		const calls: string[] = [];
		const ok = {
			name: 'ok',
			beforeEvaluate: () => calls.push('ok:before'),
			afterEvaluate: () => calls.push('ok:after'),
		};
		const bad = {
			name: 'bad',
			beforeEvaluate: () => {
				calls.push('bad:before');
				throw new Error('boom');
			},
		};

		const data = { a: 1 };
		const ast = parse('$.a');
		const result = evaluate(data, ast, { plugins: [ok, bad] });

		expect(result.values()).toEqual([1]);
		expect(calls).toEqual(['ok:before', 'bad:before', 'ok:after']);
	});

	it('runs onError hook', () => {
		const calls: string[] = [];
		const plugin = {
			name: 'error-logger',
			onError: (ctx: any) => calls.push(`error:${ctx.error.name}`),
		};

		const data = { a: { b: { c: 1 } } };
		const ast = parse('$.a.b.c');
		expect(() =>
			evaluate(data, ast, {
				plugins: [plugin],
				maxDepth: 1,
			}),
		).toThrow();

		expect(calls).toEqual(['error:JSONPathLimitError']);
	});
});
