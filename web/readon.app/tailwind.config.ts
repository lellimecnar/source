// tailwind config is required for editor support

import { resolve } from 'node:path';
import type { Config } from 'tailwindcss';

import sharedConfig from '@lellimecnar/tailwind-config';

const config: Config = {
	content: [
		resolve(__dirname, 'src/**/*.{ts,tsx}'),
		resolve(__dirname, '../../packages/ui/src/**/*.{ts,tsx}'),
	],
	presets: [sharedConfig],
};

export default config;
