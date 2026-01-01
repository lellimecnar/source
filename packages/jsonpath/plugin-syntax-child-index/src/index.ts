import { SelectorKinds } from '@jsonpath/ast';
import type { JsonPathPlugin, EvalContext } from '@jsonpath/core';
import { appendIndex } from '@jsonpath/core';

function normalizeIndex(index: number, length: number): number {
	if (index < 0) return length + index;
	return index;
}

function computeSliceIndices(args: {
	start?: number;
	end?: number;
	step?: number;
	length: number;
}): number[] {
	const step = args.step ?? 1;
	if (step === 0) return [];

	const length = args.length;
	const startRaw = args.start ?? (step > 0 ? 0 : length - 1);
	const endRaw = args.end ?? (step > 0 ? length : -1);

	let start = startRaw;
	let end = endRaw;

	// Normalize negative to relative.
	if (start < 0) start = length + start;
	if (end < 0) end = length + end;

	const out: number[] = [];
	if (step > 0) {
		for (let i = Math.max(0, start); i < Math.min(length, end); i += step)
			out.push(i);
		return out;
	}

	for (let i = Math.min(length - 1, start); i > Math.max(-1, end); i += step)
		out.push(i);
	return out;
}

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-child-index',
		capabilities: ['syntax:rfc9535:child-index', 'syntax:rfc9535:slice'],
	},
	setup: ({ engine }) => {
		engine.evaluators.registerSelector(
			SelectorKinds.Index,
			(input, selector: any, ctx: EvalContext) => {
				if (!Array.isArray(input.value)) return [];
				const idx = normalizeIndex(Number(selector.index), input.value.length);
				if (idx < 0 || idx >= input.value.length) return [];
				return [
					{
						value: input.value[idx],
						location: appendIndex(input.location, idx),
						root: input.root,
					},
				];
			},
		);

		engine.evaluators.registerSelector(
			SelectorKinds.Slice,
			(input, selector: any, ctx: EvalContext) => {
				if (!Array.isArray(input.value)) return [];
				const val = input.value as any[];
				const indices = computeSliceIndices({
					start: selector.start,
					end: selector.end,
					step: selector.step,
					length: val.length,
				});
				return indices.map((i) => ({
					value: val[i],
					location: appendIndex(input.location, i),
					root: input.root,
				}));
			},
		);
	},
};
