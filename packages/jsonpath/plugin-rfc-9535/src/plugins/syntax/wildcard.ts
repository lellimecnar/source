import { SelectorKinds } from '@jsonpath/ast';
import type { EvalContext } from '@jsonpath/core';
import {
	appendIndex,
	appendMember,
	createPlugin,
	PluginPhases,
} from '@jsonpath/core';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const createSyntaxWildcardPlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-rfc-9535/syntax-wildcard',
			phases: [PluginPhases.syntax, PluginPhases.runtime],
			capabilities: ['syntax:rfc9535:wildcard'],
		},
		setup: ({ engine }) => {
			engine.evaluators.registerSelector(
				SelectorKinds.Wildcard,
				(input, selector, ctx: EvalContext) => {
					const v = input.value;
					if (Array.isArray(v)) {
						return v.map((item, i) => ({
							value: item,
							location: appendIndex(input.location, i),
							root: input.root,
						}));
					}
					if (isRecord(v)) {
						const keys = Object.keys(v).sort();
						return keys.map((k) => ({
							value: (v as any)[k],
							location: appendMember(input.location, k),
							root: input.root,
						}));
					}
					return [];
				},
			);
		},
	});
