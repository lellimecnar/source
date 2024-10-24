import {
	JetBrains_Mono as FontMono,
	Source_Sans_3 as FontSans,
} from 'next/font/google';

export const fontSans = FontSans({
	subsets: ['latin'],
	variable: '--font-sans',
});

export const fontMono = FontMono({
	subsets: ['latin'],
	variable: '--font-mono',
});
