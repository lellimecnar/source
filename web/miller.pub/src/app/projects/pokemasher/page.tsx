'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLatest } from 'react-use';

import { Button } from '@lellimecnar/ui/button';
import { Checkbox } from '@lellimecnar/ui/checkbox';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	useForm,
} from '@lellimecnar/ui/form';
import { ArrowDown } from '@lellimecnar/ui/icons';
import { Page } from '@lellimecnar/ui/page';

import { PokemonCard } from './_card';
import {
	POKEMON_GENS,
	POKEMON_TYPES,
	type Pokemon,
	type PokemonType,
} from './_data';

interface PokemonMashup {
	pokemon?: Pokemon;
	type?: PokemonType;
}

const defaultGenerations = POKEMON_GENS.map((_, i) => i + 1);
const defaultTypes = POKEMON_TYPES;

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint -- needed to prevent JSX auto formatting
const getRandom = <T extends unknown = any>(list: T[]): T | undefined =>
	list[Math.floor(Math.random() * list.length)];

const getMashup = (
	generations?: number[],
	types?: PokemonType[],
	resultTypes?: PokemonType[],
): PokemonMashup => {
	generations ??= defaultGenerations;
	types ??= defaultTypes;
	resultTypes ??= defaultTypes;

	const pokemonList = generations
		.flatMap((gen): readonly Pokemon[] => POKEMON_GENS[gen - 1]!)
		.filter(
			(item) =>
				types.includes(item.type) &&
				(!item.type2 || types.includes(item.type2)),
		);

	const pokemon = getRandom(pokemonList);

	const typeList = resultTypes.filter(
		(type) =>
			type !== pokemon?.type && (!pokemon?.type2 || type !== pokemon.type2),
	);
	const type = getRandom(typeList);

	return { pokemon, type };
};

const usePokemonMashup = (
	generations?: number[],
	types?: PokemonType[],
	resultTypes?: PokemonType[],
): [mashup: PokemonMashup, update: () => void] => {
	const [mashup, setMashup] = useState<PokemonMashup>(
		getMashup(generations, types, resultTypes),
	);
	const ref = useLatest({
		generations,
		types,
		resultTypes,
	});
	const update = useCallback((): void => {
		setMashup(
			getMashup(
				ref.current.generations,
				ref.current.types,
				ref.current.resultTypes,
			),
		);
	}, [setMashup, ref]);

	useEffect(update, []);

	return [mashup, update];
};

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

export default function PokeMasherPage(): JSX.Element {
	const form = useForm({
		defaultValues: {
			generations: defaultGenerations,
			types: defaultTypes,
			resultTypes: defaultTypes,
		},
	});
	const [{ pokemon, type }, update] = usePokemonMashup(
		form.watch('generations'),
		form.watch('types'),
		form.watch('resultTypes'),
	);

	return (
		<Page className="space-y-8 print:my-0">
			<h2 className="print:hidden">PokeMasher</h2>
			<Form {...form}>
				<div className="flex flex-row items-center justify-center">
					<Button type="button" onClick={update} size="lg">
						Generate New Mashup
					</Button>
				</div>
				{pokemon && type ? (
					<div className="flex flex-col items-center justify-center space-y-8 md:flex-row md:justify-between md:space-x-6 md:space-y-0">
						<PokemonCard pokemon={pokemon} />
						<ArrowDown
							size={64}
							strokeWidth={3}
							className="text-white md:-rotate-90"
						/>
						<PokemonCard
							unknown
							pokemon={{
								...pokemon,
								type,
								type2: undefined,
							}}
						/>
					</div>
				) : null}
				<form className="space-y-8 print:hidden">
					<hr />
					<h3>Options</h3>
					<div className="grid w-fit gap-x-12 gap-y-4 md:grid-cols-2">
						<FormField
							name="generations"
							render={() => (
								<FormItem>
									<FormLabel>Generations</FormLabel>
									<div className="columns-2 gap-4 space-y-2">
										{POKEMON_GENS.map((genList, i) => (
											<FormField
												key={`gen_${i + 1}`}
												name="generations"
												render={({ field }) => (
													<FormItem
														key={`gen_${i + 1}`}
														className="flex flex-row items-center space-x-2 space-y-0"
													>
														<FormControl>
															<Checkbox
																checked={field.value?.includes(i + 1)}
																onCheckedChange={(checked) => {
																	const oldVal = field.value as number[];
																	let newVal = oldVal;
																	const val = i + 1;

																	if (checked && !oldVal.includes(val)) {
																		newVal = [...oldVal, val];
																	}

																	if (
																		!checked &&
																		oldVal.length > 1 &&
																		oldVal.includes(val)
																	) {
																		newVal = oldVal.filter(
																			(value: unknown) => value !== val,
																		);
																	}

																	if (newVal !== oldVal) {
																		field.onChange(newVal);
																	}
																}}
															/>
														</FormControl>
														<FormLabel className="whitespace-nowrap font-normal">
															<span className="font-bold">
																Generation {ROMAN_NUMERALS[i]}
															</span>{' '}
															<span className="text-muted-foreground text-[0.8em] italic">
																({genList.length})
															</span>
														</FormLabel>
													</FormItem>
												)}
											/>
										))}
									</div>
								</FormItem>
							)}
						/>
						<FormField
							name="types"
							render={() => (
								<FormItem>
									<FormLabel>Start Types</FormLabel>
									<div className="columns-2 gap-4 space-y-2 md:columns-4">
										{POKEMON_TYPES.map((val, i) => (
											<FormField
												key={`type_${i + 1}`}
												name="types"
												render={({ field }) => (
													<FormItem
														key={`type_${i + 1}`}
														className="flex flex-row items-center space-x-2 space-y-0"
													>
														<FormControl>
															<Checkbox
																checked={field.value?.includes(val)}
																onCheckedChange={(checked) => {
																	const oldVal = field.value as PokemonType[];
																	let newVal = oldVal;

																	if (checked && !oldVal.includes(val)) {
																		newVal = [...oldVal, val];
																	}

																	if (
																		!checked &&
																		oldVal.length > 1 &&
																		oldVal.includes(val)
																	) {
																		newVal = oldVal.filter(
																			(value: unknown) => value !== val,
																		);
																	}

																	if (newVal !== oldVal) {
																		field.onChange(newVal);
																	}
																}}
															/>
														</FormControl>
														<FormLabel className="whitespace-nowrap font-normal">
															<span className="font-bold">{val}</span>
														</FormLabel>
													</FormItem>
												)}
											/>
										))}
									</div>
								</FormItem>
							)}
						/>
						<div />
						<FormField
							name="types"
							render={() => (
								<FormItem>
									<FormLabel>Result Types</FormLabel>
									<div className="columns-2 gap-4 space-y-2 md:columns-4">
										{POKEMON_TYPES.map((val, i) => (
											<FormField
												key={`resultType_${i + 1}`}
												name="resultTypes"
												render={({ field }) => (
													<FormItem
														key={`resultType_${i + 1}`}
														className="flex flex-row items-center space-x-2 space-y-0"
													>
														<FormControl>
															<Checkbox
																checked={field.value?.includes(val)}
																onCheckedChange={(checked) => {
																	const oldVal = field.value as PokemonType[];
																	let newVal = oldVal;

																	if (checked && !oldVal.includes(val)) {
																		newVal = [...oldVal, val];
																	}

																	if (
																		!checked &&
																		oldVal.length > 1 &&
																		oldVal.includes(val)
																	) {
																		newVal = oldVal.filter(
																			(value: unknown) => value !== val,
																		);
																	}

																	if (newVal !== oldVal) {
																		field.onChange(newVal);
																	}
																}}
															/>
														</FormControl>
														<FormLabel className="whitespace-nowrap font-normal">
															<span className="font-bold">{val}</span>
														</FormLabel>
													</FormItem>
												)}
											/>
										))}
									</div>
								</FormItem>
							)}
						/>
					</div>
				</form>
				{/* <pre>{JSON.stringify({ pokemon, type, ...form.watch() }, null, 4)}</pre> */}
			</Form>

			{/* <pre>
				{JSON.stringify({ pokemon, type, defaultGenerations }, null, 4)}
			</pre> */}
		</Page>
	);
}
