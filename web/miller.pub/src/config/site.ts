import { SiGithub } from '@lellimecnar/ui/icons';

export const siteConfig: SiteConfig = {
	name: 'Miller.pub',
	description: 'The Online Home of Lance Miller',
	mainNav: [
		{ title: 'Resume', href: '/resume' },
		{
			title: 'Projects',
			items: [
				{
					title: 'Marker Swatch Generator',
					description:
						'Generate printable swatches for Ohuhu Honolulu Markers.',
					href: '/projects/ohuhu-swatches',
				},
				{
					title: 'Wrapping Paper Calculator',
					description: 'Calculate the most efficient method of wrapping a box.',
					href: '/projects/diagonal-wrapping-paper',
				},
				{
					title: 'Lellimizer',
					description: 'Convert text like "Lance Miller" to "Lellimecnar."',
					href: '/projects/lellimizer',
				},
				{
					title: 'Math Bot',
					description: 'Practice elementary math.',
					href: '/projects/math-bot',
				},
				{
					title: 'PokeMasher',
					description: 'Randomly generate Pokemon Mash-Ups.',
					href: '/projects/pokemasher',
				},
			],
		},
	],
	links: [
		{
			title: 'GitHub',
			href: 'https://github.com/lellimecnar/source',
			icon: SiGithub,
		},
	],
};

export interface LinkItem {
	title?: React.ReactNode;
	description?: React.ReactNode;
	href?: string;
	icon?: React.ComponentType<Record<string, unknown>>;
	disabled?: boolean;
	items?: LinkItem[];
}

export interface SiteConfig {
	name: string;
	description: string;
	mainNav: LinkItem[];
	links: LinkItem[];
}
