import { RGB, shade } from '@lellimecnar/ui/lib';

export enum PokemonType {
	Normal = 'Normal',
	Fighting = 'Fighting',
	Flying = 'Flying',
	Poison = 'Poison',
	Ground = 'Ground',
	Rock = 'Rock',
	Bug = 'Bug',
	Ghost = 'Ghost',
	Steel = 'Steel',
	Fire = 'Fire',
	Water = 'Water',
	Grass = 'Grass',
	Electric = 'Electric',
	Psychic = 'Psychic',
	Ice = 'Ice',
	Dragon = 'Dragon',
	Dark = 'Dark',
	Fairy = 'Fairy',
}

export const POKEMON_TYPES = [
	PokemonType.Normal,
	PokemonType.Fighting,
	PokemonType.Flying,
	PokemonType.Poison,
	PokemonType.Ground,
	PokemonType.Rock,
	PokemonType.Bug,
	PokemonType.Ghost,
	PokemonType.Steel,
	PokemonType.Fire,
	PokemonType.Water,
	PokemonType.Grass,
	PokemonType.Electric,
	PokemonType.Psychic,
	PokemonType.Ice,
	PokemonType.Dragon,
	PokemonType.Dark,
	PokemonType.Fairy,
];

export const POKEMON_TYPE_COLORS = [
	// Normal
	'#A0A19F',
	// Fighting
	'#FF8000',
	// Flying
	'#82B9EF',
	// Poison
	'#9040CC',
	// Ground
	'#915120',
	// Rock
	'#AFAA81',
	// Bug
	'#90A11A',
	// Ghost
	'#71416F',
	// Steel
	'#5FA1B8',
	// Fire
	'#E62729',
	// Water
	'#2880EF',
	// Grass
	'#41A128',
	// Electric
	'#FAC000',
	// Psychic
	'#EE4279',
	// Ice
	'#40D8FF',
	// Dragon
	'#4F61E1',
	// Dark
	'#50413E',
	// Fairy
	'#F171F1',
];

export const getPokemonTypeNumber = (type: PokemonType): number =>
	POKEMON_TYPES.indexOf(type) + 1;

export const getPokemonTypeIcon = (type: PokemonType): string =>
	`https://raw.githubusercontent.com/PokeAPI/sprites/refs/heads/master/sprites/types/generation-ix/scarlet-violet/${getPokemonTypeNumber(type)}.png`;

export const getPokemonTypeColor: {
	(type: PokemonType, shadeAmount?: number, asRGB?: boolean): string;
	(type: PokemonType, shadeAmount: number, asRGB: true): RGB;
} = (type: PokemonType, shadeAmount = 1, asRGB?: boolean): any =>
	shade(
		POKEMON_TYPE_COLORS[getPokemonTypeNumber(type) - 1]!,
		shadeAmount,
		asRGB,
	);

export const getRandomPokemonType = (
	...exclude: (PokemonType | undefined)[]
): PokemonType => {
	const types =
		Array.isArray(exclude) && exclude.length
			? POKEMON_TYPES.filter((type) => type && !exclude.includes(type))
			: POKEMON_TYPES;

	return types[Math.floor(Math.random() * types.length)]!;
};
