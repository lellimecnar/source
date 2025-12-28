import { parseUISpecSchema } from './parse';

describe('parseUISpecSchema (v1)', () => {
	it('parses a minimal valid schema (MVP-compatible)', () => {
		const schema = parseUISpecSchema({
			$uispec: '1.0',
			root: {
				type: 'div',
				children: 'hello',
			},
		});

		expect(schema.$uispec).toBe('1.0');
		expect(schema.root?.type).toBe('div');
	});

	it('accepts $if/$then structural shape', () => {
		const schema = parseUISpecSchema({
			$uispec: '1.0',
			root: {
				type: 'div',
				$if: { $path: '$.flag' },
				$then: { type: 'span', children: 'yes' },
				$else: { type: 'span', children: 'no' },
			},
		});

		expect(schema.root?.type).toBe('div');
	});

	it('accepts routed schema without root (router add-on)', () => {
		const schema = parseUISpecSchema({
			$uispec: '1.0',
			routes: [{ path: '/', root: { type: 'div' } }],
		});

		expect(Array.isArray(schema.routes)).toBe(true);
	});
});
