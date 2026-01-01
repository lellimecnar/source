import { describe, expect, it } from 'vitest';

import {
	descendantSegment,
	filterLiteral,
	filterSelector,
	nameSelector,
	path,
	segment,
	wildcardSelector,
} from '@jsonpath/ast';

import { printAst } from './index';

describe('@jsonpath/printer (additional)', () => {
	it('prints simple dot-notation for simple identifiers', () => {
		const ast = path([segment([nameSelector('abc')])]);
		expect(printAst(ast)).toBe('$.abc');
	});

	it('prints bracket-notation for non-identifier member names', () => {
		const ast = path([segment([nameSelector('a b')])]);
		expect(printAst(ast)).toBe("$['a b']");
	});

	it('escapes single quotes and backslashes in member names', () => {
		const ast = path([segment([nameSelector("a'b\\c")])]);
		expect(printAst(ast)).toBe("$['a\\'b\\\\c']");
	});

	it('prints descendant wildcard in compact form', () => {
		const ast = path([descendantSegment([wildcardSelector()])]);
		expect(printAst(ast)).toBe('$..*');
	});

	it('prints filter literals in canonical form', () => {
		const ast = path([
			segment([
				filterSelector(filterLiteral(true)),
				filterSelector(filterLiteral(null)),
			]),
		]);
		expect(printAst(ast)).toBe('$[?(true),?(null)]');
	});
});
