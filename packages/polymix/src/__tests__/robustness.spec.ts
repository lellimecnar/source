import { mix } from '../core';
import { delegate } from '../decorators';

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

	it('delegate() should support symbol property keys', () => {
		const controlsKey = Symbol('controls');

		class MediaControls {
			play() {
				return 'play';
			}
			pause() {
				return 'pause';
			}
		}

		class AudioPlayer {
			[controlsKey] = new MediaControls();
		}

		delegate(MediaControls)(AudioPlayer.prototype, controlsKey);

		const player = new AudioPlayer() as any;
		expect(player.play()).toBe('play');
		expect(player.pause()).toBe('pause');
	});

	it('should resolve strategy metadata for symbol-named methods via Symbol.for("polymix:strategy:...")', () => {
		const sym = Symbol('doWork');
		const strategySymbol = Symbol.for(`polymix:strategy:${String(sym)}`);

		class A {
			static get [strategySymbol]() {
				return 'first';
			}
			[sym]() {
				return 'A';
			}
		}

		class B {
			[sym]() {
				return 'B';
			}
		}

		const Mixed = mix(A, B);
		const instance = new Mixed() as any;
		expect(instance[sym]()).toBe('A');
	});

	it('delegate() should throw when the delegated property is missing/undefined', () => {
		class MediaControls {
			play() {
				return 'play';
			}
		}

		class AudioPlayer {
			controls?: MediaControls;
		}

		delegate(MediaControls)(AudioPlayer.prototype, 'controls');

		const player = new AudioPlayer() as any;
		expect(() => player.play()).toThrow();
	});
});
