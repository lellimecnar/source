// tailwind config is required for editor support

import { resolve } from 'node:path';
import type { Config } from 'tailwindcss';

import sharedConfig from '@lellimecnar/tailwind-config';

import {
	SWATCH_GAP,
	SWATCH_H,
	SWATCH_W,
} from './src/app/projects/ohuhu-swatches/_const';
import {
	getPokemonTypeColor,
	POKEMON_TYPES,
	type PokemonType,
} from './src/app/projects/pokemasher/_data';

const config: Config = {
	content: [
		resolve(__dirname, 'src/**/*.{ts,tsx}'),
		resolve(__dirname, '../../packages/ui/src/**/*.{ts,tsx}'),
	],
	presets: [sharedConfig],
	theme: {
		extend: {
			colors: {
				...Object.fromEntries(
					POKEMON_TYPES.map((type): [PokemonType, string] => [
						type,
						type.toLowerCase(),
					]).flatMap(([type, key]) => [
						[`poke-${key}-50`, getPokemonTypeColor(type, 2.25)],
						[`poke-${key}-100`, getPokemonTypeColor(type, 2)],
						[`poke-${key}-200`, getPokemonTypeColor(type, 1.75)],
						[`poke-${key}-300`, getPokemonTypeColor(type, 1.5)],
						[`poke-${key}-400`, getPokemonTypeColor(type, 1.25)],
						[`poke-${key}-500`, getPokemonTypeColor(type, 1)],
						[`poke-${key}-600`, getPokemonTypeColor(type, 0.8)],
						[`poke-${key}-700`, getPokemonTypeColor(type, 0.6)],
						[`poke-${key}-800`, getPokemonTypeColor(type, 0.4)],
						[`poke-${key}-900`, getPokemonTypeColor(type, 0.2)],
					]),
				),
			},
			boxShadow: {
				...Object.fromEntries(
					POKEMON_TYPES.map((type): [PokemonType, string] => [
						type,
						type.toLowerCase(),
					]).flatMap(([type, key]) => [
						[
							`poke-card-${key}`,
							[
								`inset 0 0 100px -10px rgba(${getPokemonTypeColor(type, 0.6, true).join(',')}, 0.5)`,
								`inset 0 0 40px -10px rgba(${getPokemonTypeColor(type, 0.3, true).join(',')}, 0.4)`,
								`inset 0 0 25px -15px rgba(${getPokemonTypeColor(type, 1, true).join(',')}, 0.9)`,
								`0 -20px 100px -10px rgba(255,255,255,0.1)`,
								`0 20px 25px -5px rgba(0,0,0,0.1)`,
								`0 10px 10px -5px rgba(0,0,0,0.04)`,
								`0 8px 8px -4px rgba(0,0,0,0.3)`,
								`-1px -1px 0 1px #fff6cd`,
								`1px 1px 0 1px #b29203`,
							].join(', '),
						],
						[
							`poke-img-${type.toLowerCase()}-inner`,
							[
								`inset 0 0 100px -25px rgba(${getPokemonTypeColor(type, 0.6, true).join(',')}, 0.4)`,
								`inset 0 0 40px -5px rgba(${getPokemonTypeColor(type, 0.6, true).join(',')}, 0.8)`,
								`inset 0 0 20px -5px rgba(${getPokemonTypeColor(type, 0.4, true).join(',')}, 0.6)`,
							].join(', '),
						],
					]),
				),
			},
			dropShadow: {
				...Object.fromEntries(
					POKEMON_TYPES.map((type): [PokemonType, string] => [
						type,
						type.toLowerCase(),
					]).flatMap(([type, key]) => [
						[
							`poke-img-${key}`,
							`0 -2px 30px rgba(${getPokemonTypeColor(type, 1.5, true).join(',')}, 0.9)`,
						],
						[
							`poke-img-${key}-unknown`,
							`0 0 8px rgba(${getPokemonTypeColor(type, 1.25, true).join(',')}, 0.9)`,
						],
					]),
				),
			},
		},
	},
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
		...POKEMON_TYPES.map((type) => type.toLowerCase()).flatMap((type) => [
			`shadow-poke-card-${type}`,
			`shadow-poke-img-${type}-inner`,
			`drop-shadow-poke-img-${type}`,
			`drop-shadow-poke-img-${type}-unknown`,
			...[
				'50',
				'100',
				'200',
				'300',
				'400',
				'500',
				'600',
				'700',
				'800',
				'900',
			].flatMap((variant) => [
				`from-poke-${type}-${variant}`,
				`to-poke-${type}-${variant}`,
				`bg-poke-${type}-${variant}`,
				`text-poke-${type}-${variant}`,
				`border-poke-${type}-${variant}`,
			]),
		]),
	],
};

export default config;
