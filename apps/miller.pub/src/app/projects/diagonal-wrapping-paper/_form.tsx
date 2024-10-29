import { useMemo } from 'react';

import {
	Form as UiForm,
	useForm as useUiForm,
	useFormContext as useUiFormContext,
} from '@lellimecnar/ui/form';
import { memoize } from '@lellimecnar/utils';

import { calcDiagonal, calcRotate, calcSize } from './_utils';

export interface FormProps {
	children: React.ReactNode;
}
export interface FormValues {
	width: number;
	length: number;
	height: number;
}

const IN = 50;
const BUFF = 0.5;

export const defaultValues: FormValues = {
	width: 16,
	length: 8,
	height: 3,
};

export function Form({ children }: FormProps): JSX.Element {
	const form = useUiForm<FormValues>({
		defaultValues,
	});

	return (
		<UiForm {...form}>
			<form>{children}</form>
		</UiForm>
	);
}

export const useFormContext = () => useUiFormContext<FormValues>();

const calcValues = memoize(
	({ width: _width, height: _height, length: _length }: FormValues) => {
		const _diagonal = calcDiagonal(_width, _length);
		const sizeInches = calcSize(_diagonal, _height) + BUFF * 2;
		const size = sizeInches * IN;
		const diagonal = _diagonal * IN;
		const width = Math.max(_width, _length) * IN;
		const length = Math.min(_width, _length) * IN;
		const height = _height * IN;
		const rotate = calcRotate(width, length, size);
		const center = size / 2;

		return {
			diagonal,
			sizeInches,
			center,
			height,
			IN,
			length,
			rotate,
			size,
			width,
		} as const;
	},
	({ width, height, length }: FormValues) => `${width}x${height}x${length}`,
);
export const useFormValues = (form?: ReturnType<typeof useFormContext>) => {
	const ctx = useFormContext();
	form ??= ctx;

	const values = form.watch();

	return useMemo(
		() => calcValues(values),
		[values.width, values.height, values.length],
	);
};
