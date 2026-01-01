import { describe, expect, it } from 'vitest';

import { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

import { cases, documents, runConformanceCase } from './index';

describe('@jsonpath/conformance (additional)', () => {
	it('has a small built-in document corpus', () => {
		expect(documents.length).toBeGreaterThanOrEqual(3);
		expect(documents.map((d) => d.name)).toContain('simple');
	});

	it('runConformanceCase throws for unknown documents', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-core' });
		expect(() =>
			runConformanceCase(engine, {
				name: 'bad',
				profile: 'rfc9535-core',
				documentName: 'nope',
				query: '$',
			}),
		).toThrow(/Unknown conformance document/);
	});

	it('can run a basic child-member case in rfc9535-core', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-core' });
		const testCase = cases.find((c) => c.query === "$.o['j j']")!;
		const out = runConformanceCase(engine, testCase);
		expect(out).toEqual([42]);
	});

	it('can run wildcard selector case in rfc9535-core', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-core' });
		const testCase = cases.find((c) => c.query === '$.xs[*]')!;
		const out = runConformanceCase(engine, testCase);
		expect(out).toEqual([1, 2]);
	});

	it('supports resultType=path wiring for stable paths', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-core' });
		const testCase = {
			name: 'path check',
			profile: 'rfc9535-core',
			documentName: 'simple',
			query: '$.a.b',
		};
		const out = runConformanceCase(engine, testCase as any, {
			resultType: 'path',
		});
		expect(out).toEqual(['$.a.b']);
	});
});
