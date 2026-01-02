import type { UISpecComponentAdapter } from '@ui-spec/react';

import { Button } from '@lellimecnar/ui/button';
import { Input } from '@lellimecnar/ui/input';

export function createShadcnAdapter(): UISpecComponentAdapter {
	return {
		getComponents: () => ({
			Button,
			Input,
		}),
	};
}
