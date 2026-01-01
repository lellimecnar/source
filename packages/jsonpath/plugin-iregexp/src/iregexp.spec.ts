import { describe, expect, it } from 'vitest';

import { compile, matchesEntire, searches } from './iregexp';
import { vectors } from './vectors';

describe('@jsonpath/plugin-iregexp', () => {
	for (const v of vectors) {
		it(v.name, () => {
			const c = compile(v.pattern);
			if ((v as any).invalid) {
				expect(c).toBeNull();
				return;
			}
			expect(matchesEntire(v.pattern, v.value)).toBe(v.entire);
			expect(searches(v.pattern, v.value)).toBe(v.search);
		});
	}
});
