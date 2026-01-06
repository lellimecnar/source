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

	it('caches predicates by normalized hash', () => {
		const a = compilePredicate('@.active == true');
		const b = compilePredicate('@.active == true');
		expect(a.predicate).toBe(b.predicate);
		expect(a.hash).toBe(b.hash);
	});

	it('reuses cache for whitespace variations', () => {
		const a = compilePredicate('@.active == true');
		const b = compilePredicate('  @.active  ==  true  ');
		const c = compilePredicate('@.active==true');

		// All should have the same hash after normalization
		expect(a.hash).toBe(b.hash);
		expect(a.hash).toBe(c.hash);

		// All should reuse the same compiled function
		expect(a.predicate).toBe(b.predicate);
		expect(a.predicate).toBe(c.predicate);
	});

	it('distinguishes semantically different expressions', () => {
		const a = compilePredicate('@.score > 90');
		const b = compilePredicate('@.score > 95');

		expect(a.hash).not.toBe(b.hash);
		expect(a.predicate).not.toBe(b.predicate);
	});
});
