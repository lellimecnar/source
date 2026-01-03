import { describe, expect, it } from 'vitest';

import { compilePredicate } from './predicate';

describe('compilePredicate', () => {
	it('compiles simple comparisons', () => {
		const { predicate } = compilePredicate('@.active == true');
		expect(predicate({ active: true }, 0, [])).toBe(true);
		expect(predicate({ active: false }, 0, [])).toBe(false);
	});

	it('compiles logical composition', () => {
		const { predicate } = compilePredicate('@.score > 90 && @.verified');
		expect(predicate({ score: 95, verified: true }, 0, [])).toBe(true);
		expect(predicate({ score: 95, verified: false }, 0, [])).toBe(false);
	});

	it('compiles match()', () => {
		const { predicate } = compilePredicate("match(@.email, '.*@example.com')");
		expect(predicate({ email: 'a@example.com' }, 0, [])).toBe(true);
		expect(predicate({ email: 'a@other.com' }, 0, [])).toBe(false);
	});

	it('caches predicates', () => {
		const a = compilePredicate('@.active == true');
		const b = compilePredicate('@.active == true');
		expect(a.predicate).toBe(b.predicate);
		expect(a.hash).toBe(b.hash);
	});
});
