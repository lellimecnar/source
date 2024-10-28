import { SiGithub } from '@lellimecnar/ui/icons';

export const siteConfig: SiteConfig = {
	name: 'Miller.pub',
	description: 'The Online Home of Lance Miller',
	mainNav: [
		{ title: 'Resume', href: '/resume' },
		{
			title: 'Projects',
			items: [],
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
