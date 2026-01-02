import { describe, expect, it } from 'vitest';

import { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

import * as core from '@jsonpath/core';
import * as ast from '@jsonpath/ast';
import * as lexer from '@jsonpath/lexer';
import * as parser from '@jsonpath/parser';
import * as printer from '@jsonpath/printer';
import * as pointer from '@jsonpath/pointer';
import * as patch from '@jsonpath/patch';
import * as mutate from '@jsonpath/mutate';
import * as validate from '@jsonpath/plugin-validate';

describe('jsonpath ecosystem smoke', () => {
	it('imports public entries and runs a tiny end-to-end query', () => {
		expect(typeof core.createEngine).toBe('function');
		expect(typeof ast.path).toBe('function');
		expect(typeof lexer.Scanner).toBe('function');
		expect(typeof parser.JsonPathParser).toBe('function');
		expect(typeof printer.printAst).toBe('function');
		expect(typeof pointer.parsePointer).toBe('function');
		expect(typeof patch.applyPatch).toBe('function');
		expect(typeof mutate.setAll).toBe('function');
		expect(typeof validate.validateAll).toBe('function');

		const engine = createRfc9535Engine({ profile: 'rfc9535-core' });
		const compiled = engine.compile('$.a');
		const out = engine.evaluateSync(compiled, { a: 1 });
		expect(out).toEqual([1]);
	});
});
