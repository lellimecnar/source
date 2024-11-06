'use client';

import { useCallback, useMemo } from 'react';
import { useLatest } from 'react-use';

import {
	Form as UiForm,
	useForm,
	useFormContext as useUiFormContext,
} from '@lellimecnar/ui/form';

export enum Operation {
	ADD = 'add',
	SUBTRACT = 'subtract',
	MULTIPLY = 'multiply',
	DIVIDE = 'divide',
}

export enum Mode {
	NUMERIC = 'numeric',
	DOTS = 'dots',
}

export interface FormValues extends Partial<ExpectedValues> {
	operation: Operation;
	mode: Mode;
	maxNum: number;
	expected: ExpectedValues;
}

export interface ExpectedValues {
	operand1: number;
	operand2: number;
	result: number;
}

export type FormProps = React.HTMLAttributes<HTMLFormElement>;

const generateExpectedNumbers = (
	operation: Operation,
	maxNum: number,
): ExpectedValues => {
	const operand1 = Math.round(Math.random() * maxNum);
	const operand2 = Math.round(Math.random() * maxNum);
	let result: number;

	switch (operation) {
		case Operation.ADD:
			result = operand1 + operand2;
			break;
		case Operation.SUBTRACT:
			result = operand1 - operand2;
			break;
		case Operation.MULTIPLY:
			result = operand1 * operand2;
			break;
		case Operation.DIVIDE:
			result = Number((operand1 / operand2).toFixed(2));
			break;
	}

	return {
		operand1,
		operand2,
		result,
	};
};

export const defaultValues: FormValues = {
	operation: Operation.ADD,
	mode: Mode.DOTS,
	maxNum: 10,
	expected: generateExpectedNumbers(Operation.ADD, 10),
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

const checkNum = (
	a: number | string | undefined,
	b: number | string | undefined,
): boolean => {
	if (typeof a === 'string' && a.trim()) {
		a = Number(a);
	}

	if (typeof b === 'string' && b.trim()) {
		b = Number(a);
	}

	if (typeof a === 'number' && typeof b === 'number') {
		return a === b;
	}

	return false;
};

export const useFormValues = (form?: ReturnType<typeof useFormContext>) => {
	const ctx = useFormContext();
	form ??= ctx;

	const values = form.watch();
	const ref = useLatest({
		values,
		form,
	});
	const next = useCallback(() => {
		ref.current.form.reset(
			(val) =>
				({
					...val,
					expected: generateExpectedNumbers(val.operation, val.maxNum),
					operand1: '',
					operand2: '',
					result: '',
				}) as unknown as FormValues,
			{
				keepValues: false,
				keepDefaultValues: false,
				keepDirtyValues: false,
				keepDirty: false,
				keepTouched: false,
				keepErrors: false,
				keepIsSubmitSuccessful: false,
				keepIsSubmitted: false,
				keepIsValid: false,
				keepIsValidating: false,
				keepSubmitCount: false,
			},
		);
	}, [ref]);
	const isCorrect = useMemo(() => {
		if (values.mode === Mode.NUMERIC) {
			return checkNum(values.result, values.expected.result);
		}

		return (
			checkNum(values.operand1, values.expected.operand1) &&
			checkNum(values.operand2, values.expected.operand2) &&
			checkNum(values.result, values.expected.result)
		);
	}, [
		values.operand1,
		values.operand2,
		values.result,
		values.expected.operand1,
		values.expected.operand2,
		values.expected.result,
		values.mode,
		values.operation,
	]);

	return useMemo(() => {
		return {
			...values,
			next,
			isCorrect,
		} as const;
	}, [
		values.mode,
		values.operation,
		values.operand1,
		values.operand2,
		values.result,
		values.expected.operand1,
		values.expected.operand2,
		values.expected.result,
		next,
	]);
};
