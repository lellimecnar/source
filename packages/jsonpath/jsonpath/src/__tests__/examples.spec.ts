import { describe, it, expect } from 'vitest';
import { runCompatExample } from '../../examples/compat-json-p3.js';
import { runPluginExample } from '../../examples/plugins.js';
import { runSchemaExample } from '../../examples/schema-validation.js';

describe('examples', () => {
	it('compat-json-p3 example runs', () => {
		expect(runCompatExample()).toEqual(['A', 'B']);
	});

	it('plugins example runs', () => {
		expect(runPluginExample()).toEqual(['before', 'after']);
	});

	it('schema-validation example runs', () => {
		expect(runSchemaExample()).toBe(true);
	});
});
