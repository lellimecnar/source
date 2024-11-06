'use client';

import { useEffect, useMemo } from 'react';
import { useAudio } from 'react-use';

import { Button } from '@lellimecnar/ui/button';
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
} from '@lellimecnar/ui/form';
import {
	ArrowRightIcon,
	DivideIcon,
	EqualIcon,
	MinusIcon,
	PlusIcon,
	XIcon,
	type LucideIcon,
} from '@lellimecnar/ui/icons';
import { Input } from '@lellimecnar/ui/input';
import { cn } from '@lellimecnar/ui/lib';
import { Page } from '@lellimecnar/ui/page';
import { RadioGroup, RadioGroupItem } from '@lellimecnar/ui/radio-group';

import { Form, Mode, Operation, useFormValues } from './_form';

const OPERATIONS = Object.values(Operation);
const MODES = Object.values(Mode);

export default function MathBotPage(): JSX.Element {
	return (
		<Page>
			<h2>Math Bot</h2>
			<Form className="mx-auto grid w-full max-w-2xl gap-x-8 gap-y-4 md:grid-cols-3">
				<FormField
					name="operation"
					render={({ field }) => (
						<FormItem className="space-y-3">
							<FormLabel>Operation</FormLabel>
							<FormControl>
								<RadioGroup
									onValueChange={field.onChange}
									defaultValue={field.value}
									className="flex flex-col space-y-1"
								>
									{OPERATIONS.map((value) => (
										<FormItem
											key={value}
											className="flex items-center space-x-3 space-y-0"
										>
											<FormControl>
												<RadioGroupItem value={value} />
											</FormControl>
											<FormLabel className="font-normal">{value}</FormLabel>
										</FormItem>
									))}
								</RadioGroup>
							</FormControl>
						</FormItem>
					)}
				/>
				<FormField
					name="mode"
					render={({ field }) => (
						<FormItem className="space-y-3">
							<FormLabel>Mode</FormLabel>
							<FormControl>
								<RadioGroup
									onValueChange={field.onChange}
									defaultValue={field.value}
									className="flex flex-col space-y-1"
								>
									{MODES.map((value) => (
										<FormItem
											key={value}
											className="flex items-center space-x-3 space-y-0"
										>
											<FormControl>
												<RadioGroupItem value={value} />
											</FormControl>
											<FormLabel className="font-normal">{value}</FormLabel>
										</FormItem>
									))}
								</RadioGroup>
							</FormControl>
						</FormItem>
					)}
				/>
				<FormField
					name="maxNum"
					render={({ field }) => (
						<FormItem className="space-y-3">
							<FormLabel>Max Number</FormLabel>
							<FormControl>
								<Input {...field} type="number" min={5} max={100} step={5} />
							</FormControl>
						</FormItem>
					)}
				/>
				<div className="col-span-3 mt-12 flex items-center justify-center">
					<div className="grid w-full grid-cols-4 gap-x-4">
						<div className="flex flex-row items-start justify-center gap-x-4">
							<NumberInput name="operand1" />
							<span className="flex h-14 items-center justify-center">
								<OperationIcon />
							</span>
						</div>
						<div className="flex flex-row items-start justify-center gap-x-4">
							<NumberInput name="operand2" />
							<span className="flex h-14 items-center justify-center">
								<EqualIcon />
							</span>
						</div>
						<NumberInput name="result" />
						<NextButton />
					</div>
				</div>
			</Form>
		</Page>
	);
}

interface DotsProps {
	value: number;
}

function Dots({ value }: DotsProps): JSX.Element {
	const { mode } = useFormValues();
	const cols = useMemo(() => Math.min(5, Math.ceil(Math.sqrt(value))), [value]);
	const content = useMemo(
		() =>
			mode === Mode.DOTS &&
			Array.from({ length: value }).map((_, i) => (
				<>
					<span key={`dot_${i} grow shrink-0 basis-0`} className="">
						&#11044;
					</span>
					{!((i + 1) % cols) && <span className="!h-0 basis-full" />}
					{!((i + 1) % 10) && i + 1 < value && (
						<span className="border-foreground/30 mx-4 my-1 !h-0 basis-full border-t" />
					)}
				</>
			)),
		[mode, value, cols],
	);

	return (
		<div
			className={cn(
				'flex flex-wrap gap-x-1 leading-none justify-center items-start w-fit mx-auto text-xs',
			)}
		>
			{content || null}
		</div>
	);
}

interface NumberInputProps {
	name: keyof ReturnType<typeof useFormValues>['expected'];
}

function NumberInput({ name }: NumberInputProps): JSX.Element {
	const { expected, mode } = useFormValues();
	const value = expected[name];
	const isOperand = name.startsWith('op');
	const isNumeric = mode === Mode.NUMERIC;

	return (
		<FormField
			name={name}
			render={({ field }) => (
				<FormItem className="space-y-4">
					<FormControl>
						<Input
							{...field}
							type="number"
							value={isNumeric && isOperand ? value : field.value}
							disabled={Boolean(isNumeric && isOperand)}
							className={cn(
								'font-bold text-center text-2xl h-14 rounded-xl',
								((typeof field.value === 'string' && field.value.trim()) ||
									typeof value === 'number') &&
									Number(field.value) === value &&
									'!bg-green-700',
							)}
						/>
					</FormControl>
					{isOperand ? <Dots value={value} /> : null}
				</FormItem>
			)}
		/>
	);
}

function OperationIcon(): JSX.Element | null {
	const { operation } = useFormValues();

	const Comp = useMemo((): LucideIcon | null => {
		switch (operation) {
			case Operation.ADD:
				return PlusIcon;
			case Operation.SUBTRACT:
				return MinusIcon;
			case Operation.MULTIPLY:
				return XIcon;
			case Operation.DIVIDE:
				return DivideIcon;
			default:
				return null;
		}
	}, [operation]);

	return Comp && <Comp size={24} />;
}

function NextButton(): JSX.Element | null {
	const { next, isCorrect } = useFormValues();
	const [audio, , controls] = useAudio({
		src: 'http://soundbible.com/mp3/Ta%20Da-SoundBible.com-1884170640.mp3',
		preload: 'auto',
	});

	useEffect(() => {
		if (isCorrect) {
			controls.play()?.catch(() => null);
		}
	}, [isCorrect]);

	return (
		<div className="min-w-32">
			{audio}
			{isCorrect ? (
				<Button
					size="lg"
					variant="secondary"
					onClick={next}
					className="h-14 w-full rounded-xl bg-green-700 px-12 text-xl"
				>
					<span>Next</span>
					<ArrowRightIcon size={48} />
				</Button>
			) : null}
			{/* <pre>{JSON.stringify(state, null, 4)}</pre> */}
		</div>
	);
}
