/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['media'],
	content: [
		'./app/**/*.{js,jsx,ts,tsx}',
		'./app/(tabs)/**/*.{js,jsx,ts,tsx}',
		'./components/**/*.{js,jsx,ts,tsx}',
		'./hooks/**/*.{js,jsx,ts,tsx}',
	],
	theme: {
		extend: {
			container: {
				padding: '0.5rem',
			},
		},
	},
	presets: [
		require('@lellimecnar/tailwind-config'),
		require('nativewind/preset'),
	],
	plugins: [],
};
