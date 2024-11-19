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
	transformCharacters: boolean;
}

export type FormProps = React.HTMLAttributes<HTMLFormElement>;
export const defaultValues: FormValues = {
	input: 'Hello there, my name is Lance Miller, and I built this thing.',
	transformAlphabet: false,
	transformWords: false,
	transformSentences: false,
	transformParagraphs: false,
	transformCharacters: false,
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
		const output = lellimize(input, opts);
		return {
			...values,
			output,
		} as const;
	}, [
		values.input,
		values.transformCharacters,
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
	const firstIndex = parts.findIndex((part) => /\p{L}/u.test(part));
	const lastIndex = parts.findLastIndex((part) => /\p{L}/u.test(part));

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
			return letters.flatMap((letter, i): [string, string][] => [
				[letter, reversed[i] ?? letter],
				[letter.toUpperCase(), (reversed[i] ?? letter).toUpperCase()],
			]);
		}),
	),
};

const shavianDiff = 0x10450 - 0x61;
const shavianize = (str: string, toShavian?: boolean) => {
	toShavian ??= !/[\u{10450}-\u{1047f}]/gu.test(str);

	return str.replace(/[\p{L}]/gu, (char) => {
		char = char.toLowerCase();

		let code = char.codePointAt(0);

		if (!code) {
			return char;
		}

		if (toShavian && code >= 0x61 && code <= 0x7a) {
			code += shavianDiff;
		}

		if (!toShavian && code >= 0x10450 && code <= 0x1047f) {
			code -= shavianDiff;
		}

		const result = String.fromCodePoint(code);

		return result;
	});
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
		transformCharacters,
	} = {
		...options,
	};
	const hasShavian =
		transformCharacters && /[\u{10450}-\u{1047f}]/gu.test(input);

	if (hasShavian) {
		input = shavianize(input, false);
	}

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
		.replace(/\u{2060}/gu, '\u200b')
		.replace(/(\p{Lu}\p{L}*(?:\s*(?=\p{Lu}))?)+/gu, (str) => {
			if (/\s+/.test(str)) {
				str = str.toLowerCase();
			}

			return str.replace(/\s+/g, '\u2060');
		})
		.replace(/[\p{L}\u{2060}\u{200b}]+/giu, (str) =>
			lellimizeArray(str.split('')).join(''),
		);

	if (transformAlphabet) {
		output = output
			.split('')
			.map((str) => LETTER_MAP[str] ?? str)
			.join('');
	}

	if (Boolean(transformWords) || Boolean(transformSentences)) {
		let sentences = output.split(/([^.!?]+[.!?]*\s*)/g);

		if (transformSentences) {
			sentences = lellimizeArray(sentences);
		}

		if (transformWords) {
			sentences = sentences.map((sentence) => {
				return lellimizeArray(sentence.split(/([^\S\u2060\u200b]+)/g)).join('');
			});
		}

		output = sentences.join('');
	}

	output = output.replace(/((\S+)?\u200b(\S+)?)+/g, (match) => {
		return match
			.split(/\u200b/g)
			.map((str) => str[0]!.toUpperCase() + str.slice(1))
			.join(' ');
	});

	if (transformCharacters && !hasShavian) {
		output = shavianize(output, true);
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
	const { output } = useFormValues();
	const content = useParagraphs(output);

	return (
		<>
			<h4>Transformed Text:</h4>
			{content}
		</>
	);
}
