import { describe, expect, it } from 'vitest';

import { path, segment } from '@jsonpath/ast';

import { createEngine } from './createEngine';
import { JsonPathError } from './errors/JsonPathError';
import { JsonPathErrorCodes } from './errors/codes';

import type { JsonPathPlugin } from './plugins/types';
import { PluginPhases } from './plugins/phases';

describe('@jsonpath/core plugin setup()', () => {
	it('allows plugins to register parser + evaluator + result mapper', () => {
		const plugin: JsonPathPlugin<{ sentinel?: string }> = {
			meta: { id: 'test.plugin', phases: [PluginPhases.runtime] },
			setup: ({ config, engine }) => {
				expect(config?.sentinel).toBe('x');
				engine.parser.registerSegmentParser(() =>
					path([
						segment([
							{
								kind: 'TestSelector',
							},
						]),
					]),
				);
				engine.evaluators.registerSelector('TestSelector', (input) => [input]);
				engine.results.register('value', (nodes) =>
					nodes.map((n) => ({ ok: true, v: n.value })),
				);
			},
		};

		const engine = createEngine({
			plugins: [plugin],
			options: {
				plugins: {
					'test.plugin': { sentinel: 'x' },
				},
			},
		});

		const compiled = engine.compile('ignored');
		const out = engine.evaluateSync(compiled, { a: 1 });
		expect(out).toEqual([{ ok: true, v: { a: 1 } }]);
	});

	it('supports async evaluators via evaluateAsync()', async () => {
		const plugin: JsonPathPlugin = {
			meta: { id: 'test.async-plugin', phases: [PluginPhases.runtime] },
			setup: ({ engine }) => {
				engine.parser.registerSegmentParser(() =>
					path([
						segment([
							{
								kind: 'TestAsyncSelector',
							},
						]),
					]),
				);
				engine.evaluators.registerSelectorAsync(
					'TestAsyncSelector',
					async (input) => [input],
				);
			},
		};

		const engine = createEngine({ plugins: [plugin] });
		const compiled = engine.compile('ignored');
		const out = await engine.evaluateAsync(compiled, { a: 1 });
		expect(out).toEqual([{ a: 1 }]);
	});

	it('wraps plugin hook failures as JsonPathError with pluginIds', () => {
		const plugin: JsonPathPlugin = {
			meta: { id: 'test.failing-plugin', phases: [PluginPhases.runtime] },
			setup: () => {
				throw new Error('boom');
			},
		};

		expect(() => createEngine({ plugins: [plugin] })).toThrow(JsonPathError);
		try {
			createEngine({ plugins: [plugin] });
			throw new Error('Expected createEngine() to throw');
		} catch (err) {
			expect(err).toBeInstanceOf(JsonPathError);
			const e = err as JsonPathError;
			expect(e.code).toBe(JsonPathErrorCodes.Plugin);
			expect(e.pluginIds).toEqual(['test.failing-plugin']);
		}
	});
});
