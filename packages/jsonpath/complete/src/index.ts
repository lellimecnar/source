import { createEngine } from '@jsonpath/core';
import { plugin as parentSelector } from '@jsonpath/plugin-parent-selector';
import { plugin as propertyNameSelector } from '@jsonpath/plugin-property-name-selector';
import { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';
import { plugin as scriptExpressions } from '@jsonpath/plugin-script-expressions';
import { plugin as typeSelectors } from '@jsonpath/plugin-type-selectors';
import { plugin as validate } from '@jsonpath/plugin-validate';

export { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';
export type {
	JsonPathEngine,
	CompileResult,
	EvaluateOptions,
} from '@jsonpath/core';
export { JsonPathError } from '@jsonpath/core';

export const completePlugins = [
	...rfc9535Plugins,
	scriptExpressions,
	typeSelectors,
	parentSelector,
	propertyNameSelector,
	validate,
] as any[];

export const createCompleteEngine = () =>
	createEngine({
		plugins: completePlugins,
	});

export { createEngine };
