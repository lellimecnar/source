/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./app/**/*.{js,jsx,ts,tsx}',
		'./app/(tabs)/**/*.{js,jsx,ts,tsx}',
		'./components/**/*.{js,jsx,ts,tsx}',
		'./hooks/**/*.{js,jsx,ts,tsx}',
	],
	theme: {
		extend: {},
	},
	presets: [
		require('@lellimecnar/tailwind-config'),
		require('nativewind/preset'),
	],
	plugins: [],
};
