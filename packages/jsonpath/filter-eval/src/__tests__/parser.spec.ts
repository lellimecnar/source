import { describe, it, expect } from 'vitest';
import { parseFilter } from '../parser.js';

describe('parseFilter (jsep config)', () => {
	it('parses @ and $ identifiers', () => {
		expect(() => parseFilter('@.a == 1')).not.toThrow();
		expect(() => parseFilter('$.a == 1')).not.toThrow();
	});

	it('parses valid filter expressions', () => {
		expect(() => parseFilter('@.price < 10')).not.toThrow();
		expect(() => parseFilter('@.a && @.b')).not.toThrow();
		expect(() => parseFilter('$.store')).not.toThrow();
	});
});
