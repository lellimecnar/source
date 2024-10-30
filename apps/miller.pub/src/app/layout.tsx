import { type Metadata, type Viewport } from 'next';

import { cn } from '@lellimecnar/ui/lib';
import { ThemeProvider } from '@lellimecnar/ui/theme';

import { SiteHeader } from '@/components/site-header';
import { fontSans } from '@/config/fonts';
import { siteConfig } from '@/config/site';

import './globals.css';

export const metadata: Metadata = {
	title: siteConfig.name,
	description: siteConfig.description,
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
					'min-h-screen bg-sky-950 font-sans antialiased',
					fontSans.variable,
				)}
			>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					<div className="relative flex min-h-screen flex-col">
						<SiteHeader />
						{children}
					</div>
				</ThemeProvider>
			</body>
		</html>
	);
}
