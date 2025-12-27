import { mix } from '../core';

describe('lifecycle Methods', () => {
	it('should call init() on mixins if present', () => {
		const log: string[] = [];

		class MixinA {
			init() {
				log.push('MixinA.init');
			}
		}

		class MixinB {
			init() {
				log.push('MixinB.init');
			}
		}

		class Mixed extends mix(MixinA, MixinB) {}

		new Mixed();

		expect(log).toEqual(['MixinA.init', 'MixinB.init']);
	});

	it('should pass constructor arguments to init()', () => {
		let capturedArgs: any[] = [];

		class MixinA {
			init(...args: any[]) {
				capturedArgs = args;
			}
		}

		class Mixed extends mix(MixinA) {
			constructor(a: number, b: string) {
				super(a, b);
			}
		}

		new Mixed(123, 'hello');

		expect(capturedArgs).toEqual([123, 'hello']);
	});

	it('should work with mixins that do not have init()', () => {
		const log: string[] = [];

		class MixinA {
			init() {
				log.push('MixinA.init');
			}
		}

		class MixinB {
			// No init
		}

		class Mixed extends mix(MixinA, MixinB) {}

		new Mixed();

		expect(log).toEqual(['MixinA.init']);
	});
});
