import type { SegmentNode } from '@jsonpath/ast';
import type { JsonPathPlugin, EvalContext } from '@jsonpath/core';
import {
	JsonPathError,
	JsonPathErrorCodes,
	appendIndex,
	appendMember,
} from '@jsonpath/core';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-descendant',
		capabilities: ['syntax:rfc9535:descendant'],
	},
	hooks: {
		registerEvaluators: (registry) => {
			registry.registerSegment(
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
	},
};
