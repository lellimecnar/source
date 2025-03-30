'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@lellimecnar/ui/button';
import { ArrowRight } from '@lellimecnar/ui/icons';
import { Page } from '@lellimecnar/ui/page';

import { PokemonCard } from './_card';
import {
	POKEMON,
	// POKEMON_GENS,
	getRandomPokemonType,
	type Pokemon,
	type PokemonType,
} from './_data';

// import { useForm } from '@lellimecnar/ui/form';

const getPokemon = (): Pokemon =>
	POKEMON[Math.floor(Math.random() * POKEMON.length)]!;

interface PokemonMashup {
	pokemon: Pokemon;
	type: PokemonType;
}

const getMashup = (): PokemonMashup => {
	const pokemon = getPokemon();
	const type = getRandomPokemonType(pokemon.type, pokemon.type2);

	return { pokemon, type };
};

const usePokemonMashup = (): [mashup: PokemonMashup, update: () => void] => {
	const [mashup, setMashup] = useState<PokemonMashup>(getMashup());
	const update = useCallback((): void => {
		setMashup(getMashup());
	}, [setMashup]);

	useEffect(update, []);

	return [mashup, update];
};

// const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
// const defaultGenerations = POKEMON_GENS.map((_, i) => i + 1);
export default function PokeMasherPage(): JSX.Element {
	// const form = useForm({
	// 	defaultValues: {
	// 		generations: defaultGenerations,
	// 	},
	// });
	const [{ pokemon, type }, update] = usePokemonMashup();

	return (
		<Page className="space-y-8 print:my-0">
			<h2 className="print:hidden">PokeMasher</h2>

			<Button onClick={update} size="lg">
				Generate New Mashup
			</Button>
			{/* <Form {...form}>
				<form className="print:hidden">
					<div className="grid w-fit gap-x-8 gap-y-4 md:grid-cols-2">
						<FormField
							name="generations"
							render={() => (
								<FormItem>
									<FormLabel>Generations</FormLabel>
									<div className="flex flex-col space-y-2 columns-3">
										{POKEMON_GENS.map((pokemon, i) => (
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
																	checked
																		? field.onChange([...field.value, i + 1])
																		: field.onChange(
																				field.value?.filter(
																					(value: unknown) => value !== i + 1,
																				),
																			);
																}}
															/>
														</FormControl>
														<FormLabel className="whitespace-nowrap font-normal">
															<span className="font-bold">
																Generation {ROMAN_NUMERALS[i]}
															</span>{' '}
															<span className="italic text-muted-foreground text-[0.8em]">
																({pokemon.length})
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
					</div>
				</form>
			</Form> */}

			<div className="flex flex-row items-center justify-between space-x-6">
				<PokemonCard pokemon={pokemon} />
				<ArrowRight size={64} strokeWidth={3} className="text-white" />
				<PokemonCard
					unknown
					pokemon={{
						...pokemon,
						type,
						type2: undefined,
					}}
				/>
			</div>

			{/* <pre>
				{JSON.stringify({ pokemon, type, defaultGenerations }, null, 4)}
			</pre> */}
		</Page>
	);
}
