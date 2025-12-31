import { describe, expect, it } from 'vitest';

import { createEngine } from './createEngine';

describe('@jsonpath/core engine', () => {
	it('creates an engine and compiles expressions', () => {
		const engine = createEngine({ plugins: [] });
		const compiled = engine.compile('$.x');
		expect(compiled.expression).toBe('$.x');
		expect(compiled.ast.kind).toBe('Path');
	});
});
