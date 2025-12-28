import { vi } from 'vitest';

export function mockNextNavigation() {
	vi.mock('next/navigation', () => {
		return {
			usePathname: () => '/',
			useRouter: () => ({
				push: vi.fn(),
				replace: vi.fn(),
				prefetch: vi.fn(),
				back: vi.fn(),
				forward: vi.fn(),
				refresh: vi.fn(),
			}),
			useSearchParams: () => new URLSearchParams(),
			useParams: () => ({}),
		};
	});
}
