import type { JsonPathAst } from './nodes';

export type PrintableAst = {
	ast: JsonPathAst;
};

export function printable(ast: JsonPathAst): PrintableAst {
	return { ast };
}
