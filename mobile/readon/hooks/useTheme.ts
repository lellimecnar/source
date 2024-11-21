import { useColorScheme } from 'react-native';

import Colors, {
	type ColorScheme,
	type ColorSchemeVal,
	type ColorSchemeValues,
} from '@/const/colors';

export function useTheme(): ColorSchemeValues {
	const theme = useColorScheme() ?? 'light';

	return Colors[theme];
}

export function useThemeColor<T extends ColorSchemeVal>(
	colorName: T,
): ColorSchemeValues[T];
export function useThemeColor<T extends ColorSchemeVal>(
	props: Partial<Record<ColorScheme, string>>,
	colorName: T,
): ColorSchemeValues[T];
export function useThemeColor<T extends ColorSchemeVal>(
	...args: unknown[]
): ColorSchemeValues[T] {
	const theme = useColorScheme() ?? 'light';
	const colorName = args.pop() as T;
	const props = args.pop() as Partial<Record<ColorScheme, string>> | undefined;

	return props?.[theme] ?? Colors[theme][colorName];
}
