import { vi } from 'vitest';

export function mockNextImage() {
	vi.mock('next/image', () => {
		return {
			__esModule: true,
			default: () => null,
		};
	});
}
