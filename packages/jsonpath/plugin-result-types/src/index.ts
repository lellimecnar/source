import type { JsonPathPlugin } from '@jsonpath/core';
import { plugin as node } from '@jsonpath/plugin-result-node';
import { plugin as parent } from '@jsonpath/plugin-result-parent';
import { plugin as pathPlugin } from '@jsonpath/plugin-result-path';
import { plugin as pointer } from '@jsonpath/plugin-result-pointer';
import { plugin as value } from '@jsonpath/plugin-result-value';

export const plugins = [
	value,
	node,
	pathPlugin,
	pointer,
	parent,
] as const satisfies readonly JsonPathPlugin[];

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-result-types',
		capabilities: ['result:types'],
		dependsOn: plugins.map((p) => p.meta.id),
	},
	setup: () => undefined,
};
