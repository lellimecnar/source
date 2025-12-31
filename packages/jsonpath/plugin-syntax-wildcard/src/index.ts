import { SelectorKinds } from '@jsonpath/ast';
import type { JsonPathPlugin, EvalContext } from '@jsonpath/core';
import { appendIndex, appendMember } from '@jsonpath/core';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-wildcard',
		capabilities: ['syntax:rfc9535:wildcard'],
	},
	hooks: {
		registerEvaluators: (registry) => {
			registry.registerSelector(
				SelectorKinds.Wildcard,
				(input, selector, ctx: EvalContext) => {
					const v = input.value;
					if (Array.isArray(v)) {
						return v.map((item, i) => ({
							value: item,
							location: appendIndex(input.location, i),
						}));
					}
					if (isRecord(v)) {
						const keys = Object.keys(v).sort();
						return keys.map((k) => ({
							value: (v as any)[k],
							location: appendMember(input.location, k),
						}));
					}
					return [];
				},
			);
		},
	},
};
