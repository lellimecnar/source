import { SelectorKinds } from '@jsonpath/ast';
import type { JsonPathPlugin, EvalContext } from '@jsonpath/core';
import { appendMember } from '@jsonpath/core';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-child-member',
		capabilities: ['syntax:rfc9535:child-member'],
	},
	hooks: {
		registerEvaluators: (registry) => {
			registry.registerSelector(
				SelectorKinds.Name,
				(input, selector: any, ctx: EvalContext) => {
					if (!isRecord(input.value)) return [];
					const name = String(selector.name);
					if (!(name in input.value)) return [];
					return [
						{
							value: input.value[name],
							location: appendMember(input.location, name),
							root: input.root,
						},
					];
				},
			);
		},
	},
};
