import { describe, expect, it } from 'vitest';

import { appendIndex, appendMember, rootLocation } from './location';

describe('@jsonpath/core runtime location', () => {
	it('creates a root location', () => {
		expect(rootLocation()).toEqual({ components: [] });
	});

	it('appends member + index components immutably', () => {
		const root = rootLocation();
		const withMember = appendMember(root, 'a');
		const withIndex = appendIndex(withMember, 2);

		expect(root).toEqual({ components: [] });
		expect(withMember).toEqual({ components: [{ kind: 'member', name: 'a' }] });
		expect(withIndex).toEqual({
			components: [
				{ kind: 'member', name: 'a' },
				{ kind: 'index', index: 2 },
			],
		});
	});
});
