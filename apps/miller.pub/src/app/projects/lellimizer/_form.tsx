'use client';

import { useMemo } from 'react';

import {
	Form as UiForm,
	useForm,
	useFormContext as useUiFormContext,
} from '@lellimecnar/ui/form';

export interface FormValues {
	input: string;
	transformAlphabet: boolean;
	transformWords: boolean;
	transformSentences: boolean;
	transformParagraphs: boolean;
}

export type FormProps = React.HTMLAttributes<HTMLFormElement>;
export const defaultValues: FormValues = {
	input: 'Hello there, my name is Lance Miller, and I built this thing.',
	transformAlphabet: false,
	transformWords: false,
	transformSentences: false,
	transformParagraphs: false,
};
export function Form(props: FormProps): JSX.Element {
	const form = useForm<FormValues>({
		defaultValues,
	});

	return (
		<UiForm {...form}>
			<form {...props} />
		</UiForm>
	);
}

export const useFormContext = (): ReturnType<
	typeof useUiFormContext<FormValues>
> => useUiFormContext<FormValues>();

export const useFormValues = (form?: ReturnType<typeof useFormContext>) => {
	const ctx = useFormContext();
	form ??= ctx;

	const values = form.watch();

	return useMemo(() => {
		const { input, ...opts } = values;
		return {
			...values,
			output: lellimize(input, opts),
		} as const;
	}, [
		values.input,
		values.transformAlphabet,
		values.transformWords,
		values.transformSentences,
		values.transformParagraphs,
	]);
};

const lellimizeArray = (parts: string[]): string[] => {
	if (parts.length <= 3) {
		return parts;
	}
	parts = parts.filter((str) => str.length);
	const firstIndex = parts.findIndex((part) => /[^+\W_-]+/.test(part));
	const lastIndex = parts.findLastIndex((part) => /[^+\W_-]+/.test(part));

	return [
		...parts.slice(0, firstIndex + 1),
		...parts.slice(firstIndex + 1, lastIndex).toReversed(),
		...parts.slice(lastIndex),
	];
};

const CONSONANTS = 'bcdfghjklmnpqrstvwxyz'.split('');
const VOWELS = 'aeiou'.split('');
const LETTER_MAP = {
	...Object.fromEntries(
		[CONSONANTS, VOWELS].flatMap((letters) => {
			const reversed = lellimizeArray(letters);
			return letters.map((letter, i): [string, string] => [
				letter,
				reversed[i] ?? letter,
			]);
		}),
	),
};

const lellimize = (
	input: string,
	options?: Omit<FormValues, 'input'>,
): string => {
	const {
		transformSentences,
		transformAlphabet,
		transformWords,
		transformParagraphs,
	} = {
		...options,
	};

	if (input.includes('\r') || input.includes('\n')) {
		let paragraphs = input.split(/(\s*[\r\n]+\s*)+/g);

		if (transformParagraphs) {
			paragraphs = lellimizeArray(paragraphs);
		}

		return paragraphs
			.map((paragraph) => {
				if (/[^\W_-]+/.test(paragraph)) {
					return lellimize(paragraph, options);
				}

				return paragraph;
			})
			.join('');
	}

	let output = input
		.replace(/\u2060/g, '\u200b')
		.replace(/([A-Z][^\s\W_-]*(?:\s*(?=[A-Z]))?)+/g, (str) => {
			return str.toLowerCase().replace(/\s+/g, '\u2060');
		})
		.replace(/([^\s\W_-]|\u2060|\u200b)+/g, (str) => {
			return lellimizeArray(str.split('')).join('').toLowerCase();
		})
		.replace(/\u200b/g, ' ');

	if (Boolean(transformWords) || Boolean(transformSentences)) {
		let sentences = output.split(/([^.!?]+[.!?]*\s*)/g);

		if (transformSentences) {
			sentences = lellimizeArray(sentences);
		}

		if (transformWords) {
			sentences = sentences.map((sentence) => {
				return lellimizeArray(sentence.split(/([\s\W_-]+)/g)).join('');
			});
		}

		output = sentences.join('');
	}

	if (transformAlphabet) {
		output = output.replace(
			/[a-z]/gi,
			(str) => LETTER_MAP[str.toLowerCase()] ?? str,
		);
	}

	return output;
};

const useParagraphs = (input: string): React.ReactNode[] =>
	useMemo(
		() =>
			input.split(/(\s*[\r\n]+\s*)+/g).map((str) => {
				if (!str.trim().length) {
					return null;
				}

				return <p key={`${input}-${str}`}>{str}</p>;
			}),
		[input],
	);

export function LellimizerOutput() {
	const { output, ...opts } = useFormValues();
	const content = useParagraphs(output);
	const reversedStr = useMemo(() => lellimize(output, opts), [output]);
	const reversed = useParagraphs(reversedStr);

	return (
		<>
			{content}
			<div className="mt-2 border-t border-neutral-300 pt-2">
				<p className="font-mono text-sm text-neutral-500">{reversed}</p>
			</div>
		</>
	);
}
