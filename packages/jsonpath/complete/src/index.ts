import { createEngine } from '@jsonpath/core';
import { plugin as filterFunctions } from '@jsonpath/plugin-filter-functions';
import { plugin as filterRegex } from '@jsonpath/plugin-filter-regex';
import { plugin as functionsCore } from '@jsonpath/plugin-functions-core';
import { plugin as parentSelector } from '@jsonpath/plugin-parent-selector';
import { plugin as propertyNameSelector } from '@jsonpath/plugin-property-name-selector';
import { plugin as resultTypes } from '@jsonpath/plugin-result-types';
import { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';
import { plugin as scriptExpressions } from '@jsonpath/plugin-script-expressions';
import { plugin as typeSelectors } from '@jsonpath/plugin-type-selectors';
import { plugin as validate } from '@jsonpath/plugin-validate';

export { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';

export const completePlugins = [
	...rfc9535Plugins,
	filterRegex,
	scriptExpressions,
	typeSelectors,
	parentSelector,
	propertyNameSelector,
	validate,
	resultTypes,
	filterFunctions,
	functionsCore,
] as any[];

export const createCompleteEngine = () =>
	createEngine({
		plugins: completePlugins,
	});

export { createEngine };
