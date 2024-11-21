const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export type ColorScheme = 'light' | 'dark';
export interface ColorSchemeValues {
	background: string;
	text: string;
	tint: string;
	tabIconDefault: string;
	tabIconSelected: string;
	headerBackground: string;
	headerText: string;
	headerBorder: string;
}
export type ColorSchemeVal = keyof ColorSchemeValues;

export default {
	light: {
		text: '#000',
		background: '#7dd3fc',
		tint: tintColorLight,
		tabIconDefault: '#075985',
		tabIconSelected: tintColorLight,
		headerBackground: '#bae6fd',
		headerText: '#075985',
		headerBorder: '#f0f9ff',
	},
	dark: {
		text: '#fff',
		background: '#082f49',
		tint: tintColorDark,
		tabIconDefault: '#7dd3fc',
		tabIconSelected: tintColorDark,
		headerBackground: '#0c4a6e',
		headerText: '#7dd3fc',
		headerBorder: '#075985',
	},
} as const satisfies Record<ColorScheme, ColorSchemeValues>;
