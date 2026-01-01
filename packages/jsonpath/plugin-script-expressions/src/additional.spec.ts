import { describe, expect, it } from 'vitest';
import { createEngine } from '@jsonpath/core';
import { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';
import { plugin as scriptPlugin } from './index';

describe('@jsonpath/plugin-script-expressions integration', () => {
	it('evaluates a script expression fallback', () => {
		const engine = createEngine({
			plugins: [...rfc9535Plugins, scriptPlugin],
			options: {
				plugins: {
					'@jsonpath/plugin-script-expressions': { enabled: true },
				},
			},
		});

		const data = {
			items: [
				{ a: 1, b: 2 },
				{ a: 2, b: 3 },
				{ a: 3, b: 4 },
			],
		};

		// Standard filter works
		const standard = engine.evaluateSync(
			engine.compile('$.items[?(@.a == 1)]'),
			data,
		);
		expect(standard).toEqual([{ a: 1, b: 2 }]);

		// Script expression fallback (using + which is not in RFC 9535)
		// Note: The parser will fallback to script if parseFilterOr fails.
		const script = engine.evaluateSync(
			engine.compile('$.items[?(@.a + @.b == 5)]'),
			data,
		);
		expect(script).toEqual([{ a: 2, b: 3 }]);
	});

	it('supports $ for root access in scripts', () => {
		const engine = createEngine({
			plugins: [...rfc9535Plugins, scriptPlugin],
			options: {
				plugins: {
					'@jsonpath/plugin-script-expressions': { enabled: true },
				},
			},
		});

		const data = {
			threshold: 5,
			items: [{ val: 4 }, { val: 6 }],
		};

		const result = engine.evaluateSync(
			engine.compile('$.items[?(@.val > $.threshold)]'),
			data,
		);
		expect(result).toEqual([{ val: 6 }]);
	});

	it('returns false on script error', () => {
		const engine = createEngine({
			plugins: [...rfc9535Plugins, scriptPlugin],
			options: {
				plugins: {
					'@jsonpath/plugin-script-expressions': { enabled: true },
				},
			},
		});

		const data = { items: [{ a: 1 }] };

		// Invalid JS in script
		const result = engine.evaluateSync(
			engine.compile('$.items[?(invalid syntax !!!)]'),
			data,
		);
		expect(result).toEqual([]);
	});
});
