import type { JsonPathPlugin } from '@jsonpath/core';
import { plugin as parent } from '@jsonpath/plugin-result-parent';
import {
	createResultNodePlugin,
	createResultPathPlugin,
	createResultPointerPlugin,
	createResultValuePlugin,
} from '@jsonpath/plugin-rfc-9535';

export const plugins = [
	createResultValuePlugin(),
	createResultNodePlugin(),
	createResultPathPlugin(),
	createResultPointerPlugin(),
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
