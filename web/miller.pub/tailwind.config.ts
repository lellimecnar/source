// tailwind config is required for editor support

import { resolve } from 'node:path';
import type { Config } from 'tailwindcss';

import sharedConfig from '@lellimecnar/tailwind-config';

import {
	SWATCH_GAP,
	SWATCH_H,
	SWATCH_W,
} from './src/app/projects/ohuhu-swatches/_const';

const config: Config = {
	content: [
		resolve(__dirname, 'src/**/*.{ts,tsx}'),
		resolve(__dirname, '../../packages/ui/src/**/*.{ts,tsx}'),
	],
	presets: [sharedConfig],
	safelist: [
		`h-${String(SWATCH_H)}`,

		`w-${String(SWATCH_W)}`,
		...['gap', 'p', 'px', 'py', 'pl', 'pr', 'pt', 'pb'].map(
			(p) => `${p}-${String(SWATCH_GAP)}`,
		),
		...Array.from({ length: 24 }).flatMap((_, i) => [
			`w-${String(i)}`,
			`h-${String(i)}`,
		]),
		...Array.from({ length: 100 }).flatMap((_, i) => [
			`grid-cols-${String(i)}`,
			`columns-${String(i)}`,
		]),
	],
};

export default config;
