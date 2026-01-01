import { describe, expect, it } from 'vitest';

import { __package } from './index';

describe('@lellimecnar/jsonpath-compat-harness (additional)', () => {
	it('exports an identifying package string', () => {
		expect(__package).toContain('jsonpath-compat-harness');
	});

	it('is stable across JSON serialization', () => {
		const s = JSON.stringify({ __package });
		expect(JSON.parse(s).__package).toBe(__package);
	});

	it('looks like a scoped package name', () => {
		expect(__package.startsWith('@')).toBe(true);
		expect(__package.includes('/')).toBe(true);
	});

	it('is not empty', () => {
		expect(__package.length).toBeGreaterThan(5);
	});

	it('does not include whitespace', () => {
		expect(__package).not.toMatch(/\s/);
	});
});
