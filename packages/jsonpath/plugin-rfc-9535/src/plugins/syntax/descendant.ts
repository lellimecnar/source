import type { SegmentNode } from '@jsonpath/ast';
import type { EvalContext } from '@jsonpath/core';
import {
	appendIndex,
	appendMember,
	createPlugin,
	JsonPathError,
	JsonPathErrorCodes,
	PluginPhases,
} from '@jsonpath/core';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const createSyntaxDescendantPlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-rfc-9535/syntax-descendant',
			phases: [PluginPhases.syntax, PluginPhases.runtime],
			capabilities: ['syntax:rfc9535:descendant'],
		},
		setup: ({ engine }) => {
			engine.evaluators.registerSegment(
				'DescendantSegment',
				(
					inputs,
					segment: SegmentNode & { selectors: any[] },
					evaluators,
					ctx: EvalContext,
				) => {
					function descendantsOrSelf(node: any): any[] {
						const out: any[] = [node];
						const queue: any[] = [node];
						while (queue.length) {
							const current = queue.shift()!;
							const v = current.value;
							if (Array.isArray(v)) {
								for (let i = 0; i < v.length; i += 1) {
									const child = {
										value: v[i],
										location: appendIndex(current.location, i),
										root: current.root,
									};
									out.push(child);
									queue.push(child);
								}
								continue;
							}
							if (isRecord(v)) {
								for (const key of Object.keys(v).sort()) {
									const child = {
										value: v[key],
										location: appendMember(current.location, key),
										root: current.root,
									};
									out.push(child);
									queue.push(child);
								}
							}
						}
						return out;
					}

					const expanded = inputs.flatMap((n) => descendantsOrSelf(n));
					const next: any[] = [];
					for (const inputNode of expanded) {
						for (const selector of segment.selectors) {
							const evalSelector = evaluators.getSelector(selector.kind);
							if (!evalSelector) {
								throw new JsonPathError({
									code: JsonPathErrorCodes.Evaluation,
									message: `No evaluator registered for selector kind: ${selector.kind}`,
								});
							}
							next.push(...evalSelector(inputNode, selector, ctx));
						}
					}
					return next;
				},
			);
		},
	});
