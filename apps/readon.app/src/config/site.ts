import { SiGithub } from '@lellimecnar/ui/icons';

export const siteConfig: SiteConfig = {
	name: 'Read On',
	description: 'Reading Plan Tracker',
	mainNav: [],
	links: [
		{
			title: 'GitHub',
			href: 'https://github.com/lellimecnar/source/tree/master/apps/readon.app',
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
