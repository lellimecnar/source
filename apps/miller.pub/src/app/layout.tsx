import { type Metadata, type Viewport } from 'next';

import { cn } from '@lellimecnar/ui/lib';
import { ThemeProvider } from '@lellimecnar/ui/theme';

import { SiteHeader } from '@/components/site-header';
import { fontSans } from '@/config/fonts';

import './globals.css';

export const metadata: Metadata = {
	title: 'Create Turborepo',
	description: 'Generated by create turbo',
};

export const viewport: Viewport = {
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: 'white' },
		{ media: '(prefers-color-scheme: dark)', color: 'black' },
	],
};

export interface RootLayoutProps {
	children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
	return (
		<html lang="en" suppressHydrationWarning>
			<head />
			<body
				className={cn(
					'min-h-screen bg-background font-sans antialiased',
					fontSans.variable,
				)}
			>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					<div className="relative flex min-h-screen flex-col">
						<SiteHeader />
						<div className="flex-1 justify-center items-center">{children}</div>
					</div>
				</ThemeProvider>
			</body>
		</html>
	);
}
