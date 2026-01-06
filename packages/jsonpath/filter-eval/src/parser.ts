import jsep from 'jsep';
import jsepRegex from '@jsep-plugin/regex';

export type FilterAst = any;

let configured = false;

function configureOnce(): void {
	if (configured) return;
	configured = true;

	jsep.plugins.register(jsepRegex);

	// Project contract: only accept operators supported by @jsonpath/parser/@jsonpath/evaluator.
	// If additional operators are supported via operator plugins, they must be enabled here too.
	jsep.removeUnaryOp('~');
	jsep.removeUnaryOp('typeof');

	jsep.removeBinaryOp('|');
	jsep.removeBinaryOp('^');
	jsep.removeBinaryOp('&');
	jsep.removeBinaryOp('>>>');
	jsep.removeBinaryOp('>>');
	jsep.removeBinaryOp('<<');
	jsep.removeBinaryOp('in');
	jsep.removeBinaryOp('instanceof');

	// Allow JSONPath roots as identifiers.
	jsep.addIdentifierChar('@');
	jsep.addIdentifierChar('$');
}

export function parseFilter(input: string): FilterAst {
	configureOnce();
	return jsep(input);
}
