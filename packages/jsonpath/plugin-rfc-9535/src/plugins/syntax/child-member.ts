import { SelectorKinds } from '@jsonpath/ast';
import type { EvalContext } from '@jsonpath/core';
import { appendMember, createPlugin, PluginPhases } from '@jsonpath/core';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const createSyntaxChildMemberPlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-rfc-9535/syntax-child-member',
			phases: [PluginPhases.syntax, PluginPhases.runtime],
			capabilities: ['syntax:rfc9535:child-member'],
		},
		setup: ({ engine }) => {
			engine.evaluators.registerSelector(
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
	});
