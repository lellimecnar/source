'use client';

import { useMemo } from 'react';

import { Button } from '@lellimecnar/ui/button';
import { Checkbox } from '@lellimecnar/ui/checkbox';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	useForm,
} from '@lellimecnar/ui/form';
import { PrinterIcon } from '@lellimecnar/ui/icons';
import { Input } from '@lellimecnar/ui/input';
import { Page } from '@lellimecnar/ui/page';
import { Switch } from '@lellimecnar/ui/switch';

import { MAX_COLS, MIN_COLS, SWATCH_GAP, SWATCH_W } from './_const';
import { colors, sets, type Color, type ColorId } from './_data';
import { Section } from './_section';
import { type ControlsState } from './_state';

const defaultSelectedSets = sets.map((set) => set.id);

const createSections = ({ selectedSets, sectionCount }: ControlsState) => {
	if (!Array.isArray(selectedSets) || !sectionCount) {
		return [];
	}

	const filteredColors = colors.filter(({ family, sequence }) => {
		const id = (family ? `${family}${sequence}` : sequence) as ColorId;
		return sets.some(
			(s) =>
				selectedSets.includes(s.id) && (s.colors as ColorId[]).includes(id),
		);
	});
	const perSection = Math.ceil(filteredColors.length / sectionCount);
	const sections: Color[][] = [];
	let curr = 0;
	while (curr < sectionCount) {
		const start = curr * perSection;
		const end = start + perSection;
		sections.push(filteredColors.slice(start, end));
		curr++;
	}

	return sections;
};

export default function OhuhuSwatchesPage(): JSX.Element {
	const form = useForm({
		defaultValues: {
			sectionCount: 6,
			showSectionGrid: true,
			selectedSets: defaultSelectedSets,
			numberSections: true,
		},
	});
	const values = form.watch();
	const { sectionCount, showSectionGrid, numberSections } = values;
	const sections = useMemo(() => createSections(values), [values]);
	const count = useMemo(
		() => sections.reduce((result, section) => result + section.length, 0),
		[sections],
	);
	const cols = Math.max(
		MIN_COLS,
		Math.min(
			MAX_COLS,
			Math.max(1, Math.ceil(Math.sqrt(count / sections.length))),
		),
	);
	const sectionWidth = (SWATCH_W + SWATCH_GAP) * cols + SWATCH_GAP;

	return (
		<Page className="space-y-8 print:my-0">
			<h2 className="print:hidden">Ohuho Honolulu Color Swatch Generator</h2>
			<Form {...form}>
				<form className="print:hidden">
					<div className="grid w-fit gap-x-8 gap-y-4 md:grid-cols-2">
						<div className="flex flex-col gap-y-4">
							<FormField
								name="sectionCount"
								render={({ field }) => (
									<FormItem>
										<div>
											<FormLabel className="whitespace-nowrap">
												Number of Sections
											</FormLabel>
											<FormDescription>
												I use 6 to correspond with the 3 sections in the 320
												marker set bag.
											</FormDescription>
										</div>
										<FormControl>
											<Input
												type="number"
												min={1}
												max={12}
												defaultValue={sectionCount}
												className="w-18"
												{...field}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
							<FormField
								name="showSectionGrid"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center space-x-2 space-y-0">
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<FormLabel className="whitespace-nowrap font-normal">
											Show Section Grid
										</FormLabel>
									</FormItem>
								)}
							/>
							<FormField
								name="numberSections"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center space-x-2 space-y-0">
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<FormLabel className="font-normal">
											Show Swatch Numbers
										</FormLabel>
									</FormItem>
								)}
							/>
						</div>
						<FormField
							name="selectedSets"
							render={() => (
								<FormItem>
									<FormLabel>Marker Sets</FormLabel>
									{sets.map(({ id, name }) => (
										<FormField
											key={id}
											name="selectedSets"
											render={({ field }) => (
												<FormItem
													key={id}
													className="flex flex-row items-center space-x-2 space-y-0"
												>
													<FormControl>
														<Checkbox
															checked={field.value?.includes(id)}
															onCheckedChange={(checked) => {
																checked
																	? field.onChange([...field.value, id])
																	: field.onChange(
																			field.value?.filter(
																				(value: unknown) => value !== id,
																			),
																		);
															}}
														/>
													</FormControl>
													<FormLabel className="whitespace-nowrap font-normal">
														{name}
													</FormLabel>
												</FormItem>
											)}
										/>
									))}
								</FormItem>
							)}
						/>
					</div>
				</form>
			</Form>
			<div className="mb-8 flex w-full items-center justify-center print:hidden">
				<Button
					className="max-w-fit px-12 print:hidden"
					size="sm"
					variant="outline"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						window.print();
					}}
				>
					<PrinterIcon size={24} />
					Print
				</Button>
			</div>
			<div className="flex w-full flex-row flex-wrap items-start justify-center gap-8 print:gap-0">
				{sections.map((items, i) => (
					<Section
						colors={items}
						count={sections.length}
						width={sectionWidth}
						index={i}
						showGrid={showSectionGrid}
						showNumber={numberSections}
						key={`section-${String(i)}`}
					/>
				))}
			</div>
		</Page>
	);
}
