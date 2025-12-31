import type { JsonPathPlugin } from '@jsonpath/core';
import { createEngine } from '@jsonpath/core';
import { plugin as boolOps } from '@jsonpath/plugin-filter-boolean';
import { plugin as comparison } from '@jsonpath/plugin-filter-comparison';
import { plugin as existence } from '@jsonpath/plugin-filter-existence';
import { plugin as filterFunctions } from '@jsonpath/plugin-filter-functions';
import { plugin as literals } from '@jsonpath/plugin-filter-literals';
import { plugin as filterRegex } from '@jsonpath/plugin-filter-regex';
import { plugin as functionsCore } from '@jsonpath/plugin-functions-core';
import { plugin as iregexp } from '@jsonpath/plugin-iregexp';
import { plugin as resultNode } from '@jsonpath/plugin-result-node';
import { plugin as resultParent } from '@jsonpath/plugin-result-parent';
import { plugin as resultPath } from '@jsonpath/plugin-result-path';
import { plugin as resultPointer } from '@jsonpath/plugin-result-pointer';
import { plugin as resultTypes } from '@jsonpath/plugin-result-types';
import { plugin as resultValue } from '@jsonpath/plugin-result-value';
import { plugin as childIndex } from '@jsonpath/plugin-syntax-child-index';
import { plugin as childMember } from '@jsonpath/plugin-syntax-child-member';
import { plugin as current } from '@jsonpath/plugin-syntax-current';
import { plugin as descendant } from '@jsonpath/plugin-syntax-descendant';
import { plugin as filterContainer } from '@jsonpath/plugin-syntax-filter';
import { plugin as root } from '@jsonpath/plugin-syntax-root';
import { plugin as union } from '@jsonpath/plugin-syntax-union';
import { plugin as wildcard } from '@jsonpath/plugin-syntax-wildcard';

export const rfc9535Plugins = [
	root,
	current,
	childMember,
	childIndex,
	wildcard,
	union,
	descendant,
	filterContainer,
	literals,
	boolOps,
	comparison,
	existence,
	functionsCore,
	filterFunctions,
	iregexp,
	filterRegex,
	resultValue,
	resultNode,
	resultPath,
	resultPointer,
	resultParent,
	resultTypes,
] as const satisfies readonly JsonPathPlugin[];

export function createRfc9535Engine() {
	return createEngine({ plugins: rfc9535Plugins });
}

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-rfc-9535',
		capabilities: ['preset:rfc9535'],
		dependsOn: rfc9535Plugins.map((p) => p.meta.id),
	},
};
