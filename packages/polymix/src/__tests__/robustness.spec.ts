import { mix } from '../core';

describe('robustness', () => {
	it('should not crash composition when a mixin prototype has a throwing getter', () => {
		class ThrowingGetterMixin {
			get boom(): string {
				throw new Error('boom');
			}
		}

		class PlainMixin {
			value = 123;
		}

		expect(() => {
			class Mixed extends mix(ThrowingGetterMixin, PlainMixin) {}
			const instance = new Mixed() as any;
			expect(instance.value).toBe(123);
			expect(() => instance.boom).toThrow('boom');
		}).not.toThrow();
	});
});
