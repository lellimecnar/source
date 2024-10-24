import Link from 'next/link';

import { HomeIcon } from '@lellimecnar/ui/icons';
import { cn } from '@lellimecnar/ui/lib';

import { siteConfig, type LinkItem } from '@/config/site';

export function SiteHeader(): JSX.Element {
	return (
		<header className="bg-background sticky top-0 z-40 w-full border-b">
			<div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
				<div className="flex gap-6 md:gap-10">
					<Link href="/" className="flex items-center space-x-2">
						<HomeIcon className="h-6 w-6" />
						<span className="inline-block font-bold">Miller.pub</span>
					</Link>
					<nav className="flex gap-6">
						{siteConfig.mainNav.map((item) => (
							<LinkItem
								key={item.href}
								item={item}
								className="flex items-center text-sm font-medium text-muted-foreground"
							/>
						))}
					</nav>
				</div>
				<div className="flex flex-1 items-center justify-end space-x-4">
					<nav className="flex items-center space-x-1">
						{siteConfig.links.map((item) => (
							<LinkItem key={item.href} item={item} />
						))}
					</nav>
				</div>
			</div>
		</header>
	);
}

interface LinkItemProps
	extends Omit<React.ComponentProps<typeof Link>, 'href'> {
	item: LinkItem;
}

const LinkItem: React.FC<LinkItemProps> = ({ item, className, ...props }) => {
	const content = (
		<>
			{item.icon ? <item.icon className="h-6 w-6" /> : null}
			{item.title ? (
				<span className={cn(item.icon && 'sr-only')}>{item.title}</span>
			) : null}
		</>
	);

	className = cn(className, item.disabled && 'cursor-not-allowed opacity-80');

	return item.href ? (
		<Link
			href={item.href}
			className={className}
			target="_blank"
			rel="noreferrer"
			{...props}
		>
			{content}
		</Link>
	) : (
		<span className={className} {...props}>
			{content}
		</span>
	);
};
