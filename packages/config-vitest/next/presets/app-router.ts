import { mockNextImage } from '../mocks/image.ts';
import { mockNextNavigation } from '../mocks/navigation.ts';

export function installNextAppRouterMocks() {
	mockNextNavigation();
	mockNextImage();
}
