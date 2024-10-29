import { useMemo } from 'react';

import {
	Form as UiForm,
	useForm as useUiForm,
	useFormContext as useUiFormContext,
} from '@lellimecnar/ui/form';
import { memoize } from '@lellimecnar/utils';

import { calcDiagonal, calcSize } from './_utils';

export interface FormProps {
	children: React.ReactNode;
}
export interface FormValues {
	width: number;
	length: number;
	height: number;
	buffer: number;
}

const IN = 50;

export const defaultValues: FormValues = {
	width: 16,
	length: 8,
	height: 3,
	buffer: 0.25,
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
	({ width: _width, height: _height, length: _length, buffer }: FormValues) => {
		const width = Math.max(_width, _length) * IN;
		const length = Math.min(_width, _length) * IN;
		const height = _height * IN;
		const diagonal = calcDiagonal(width, length);
		const rotate = 90 + Math.asin(width / diagonal) * (180 / Math.PI);
		const [sizeW, sizeH] = calcSize(width, length, height, rotate).map(
			(s) => s + buffer * 2 * IN,
		) as [number, number];
		const size = Math.max(sizeW, sizeH);
		const sizeInches = Math.ceil(size / IN);
		const center = size / 2;
		const fromEdge = (sizeW - diagonal) / 2;

		return {
			diagonal,
			sizeInches,
			center,
			height,
			IN,
			length,
			rotate,
			size,
			sizeW,
			sizeH,
			sizeWIN: sizeW / IN,
			sizeHIN: sizeH / IN,
			width,
			buffer,
			fromEdge,
			fromEdgeIN: fromEdge / IN,
		} as const;
	},
	({ width, height, length, buffer }: FormValues) =>
		`${width}x${height}x${length}x${buffer}`,
);
export const useFormValues = (form?: ReturnType<typeof useFormContext>) => {
	const ctx = useFormContext();
	form ??= ctx;

	const values = form.watch();

	return useMemo(
		() => calcValues(values),
		[values.width, values.height, values.length, values.buffer],
	);
};
