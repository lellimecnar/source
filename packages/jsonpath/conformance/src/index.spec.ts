import { describe, expect, it } from 'vitest';

import { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

import { cases, documents, runConformanceCase } from './index';

describe('@lellimecnar/jsonpath-conformance', () => {
	it('exports a corpus with documents + cases', () => {
		expect(documents.length).toBeGreaterThan(0);
		expect(cases.length).toBeGreaterThan(0);
	});

	it.fails('RFC 9535 (draft): root normalized path ($)', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-draft' });
		const testCase = cases.find(
			(c) => c.query === '$' && c.profile === 'rfc9535-draft',
		)!;
		const out = runConformanceCase(engine, testCase, { resultType: 'path' });
		expect(out).toEqual(['$']);
	});

	it('RFC 9535 (core): root value ($)', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-core' });
		const testCase = cases.find(
			(c) => c.query === '$' && c.profile === 'rfc9535-core',
		)!;
		const out = runConformanceCase(engine, testCase);
		expect(out).toEqual(testCase.expect?.values);
	});

	it('RFC 9535 (core): child member with space', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-core' });
		const testCase = cases.find(
			(c) => c.name === 'rfc: child member with space',
		)!;
		const out = runConformanceCase(engine, testCase);
		expect(out).toEqual([42]);
	});

	it('RFC 9535 (core): wildcard selector', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-core' });
		const testCase = cases.find((c) => c.name === 'rfc: wildcard selector')!;
		const out = runConformanceCase(engine, testCase);
		expect(out).toEqual([1, 2]);
	});

	it('RFC 9535 (core): index union', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-core' });
		const testCase = cases.find((c) => c.name === 'rfc: index union')!;
		const out = runConformanceCase(engine, testCase);
		expect(out).toEqual([1, 2]);
	});

	it('RFC 9535 (core): descendant name', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-core' });
		const testCase = cases.find((c) => c.name === 'rfc: descendant name')!;
		const out = runConformanceCase(engine, testCase);
		expect(out).toEqual(['Nigel Rees', 'Evelyn Waugh']);
	});

	it('RFC 9535 (core): rejects filter syntax', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-core' });
		const testCase = cases.find(
			(c) => c.name === 'rfc: reject filter in core',
		)!;
		try {
			runConformanceCase(engine, testCase);
			expect.fail('Should have thrown');
		} catch (e: any) {
			expect(e.message).toBe(
				'Filter selectors are not supported in rfc9535-core',
			);
			expect(e.code).toBe('JSONPATH_SYNTAX_ERROR');
		}
	});

	it('RFC 9535 (full): length() works in filters', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-full' });
		const testCase = cases.find(
			(c) => c.name === 'rfc: length() over author string (full)',
		)!;
		const out = runConformanceCase(engine, testCase);
		expect(out).toEqual(testCase.expect?.values);
	});

	it('RFC 9535 (full): count() works in filters', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-full' });
		const testCase = cases.find(
			(c) => c.name === 'rfc: count() over wildcard expansion (full)',
		)!;
		const out = runConformanceCase(engine, testCase);
		expect(out).toEqual(testCase.expect?.values);
	});

	it('RFC 9535 (full): search() finds substring matches', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-full' });
		const testCase = cases.find(
			(c) => c.name === 'rfc: match() vs search() (full)',
		)!;
		const out = runConformanceCase(engine, testCase);
		expect(out).toEqual(testCase.expect?.values);
	});

	it('RFC 9535 (full): match() requires full-string match', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-full' });
		const testCase = cases.find(
			(c) => c.name === 'rfc: match() anchors the full string (full)',
		)!;
		const out = runConformanceCase(engine, testCase);
		expect(out).toEqual(testCase.expect?.values);
	});

	it('RFC 9535 (full): value() extracts singular node values', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-full' });
		const testCase = cases.find(
			(c) => c.name === 'rfc: value() extracts singular node value (full)',
		)!;
		const out = runConformanceCase(engine, testCase);
		expect(out).toEqual(testCase.expect?.values);
	});
});
