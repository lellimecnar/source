import { describe, expect, it } from 'vitest';

import { path } from '@jsonpath/ast';
import { printAst } from './printer';

describe('@jsonpath/printer', () => {
	it('prints a placeholder path', () => {
		expect(printAst(path([]))).toBe('$');
	});
});
