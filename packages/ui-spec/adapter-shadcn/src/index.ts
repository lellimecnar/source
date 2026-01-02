import { Button } from '@lellimecnar/ui/button';
import { Input } from '@lellimecnar/ui/input';
import { Label } from '@lellimecnar/ui/label';
import { Switch } from '@lellimecnar/ui/switch';
import { Textarea } from '@lellimecnar/ui/textarea';

import type { UISpecComponentAdapter } from '@ui-spec/react';

export const shadcnAdapter: UISpecComponentAdapter = {
	name: 'shadcn',
	getComponents() {
		return {
			Button,
			Input,
			Label,
			Switch,
			Textarea,
		};
	},
};
