import { mockNextImage } from '../mocks/image.js';
import { mockNextNavigation } from '../mocks/navigation.js';

export function installNextAppRouterMocks() {
	mockNextNavigation();
	mockNextImage();
}
