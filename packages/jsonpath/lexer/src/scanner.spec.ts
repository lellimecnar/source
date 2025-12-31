import { describe, expect, it } from 'vitest';

import { Scanner } from './scanner';

describe('@jsonpath/lexer', () => {
	it('scans simple punctuation rules', () => {
		const s = new Scanner();
		s.register('Dollar', (input, offset) =>
			input[offset] === '$' ? { lexeme: '$', offset, kind: 'Dollar' } : null,
		);
		const tokens = s.scanAll('$.');
		expect(tokens.map((t) => t.kind)).toEqual(['Dollar', 'Unknown']);
	});
});
