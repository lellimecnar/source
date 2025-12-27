'use client';

import Link from 'next/link';
import React from 'react';

import { HomeIcon } from '@lellimecnar/ui/icons';
import { cn } from '@lellimecnar/ui/lib';
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
} from '@lellimecnar/ui/navigation-menu';

import { siteConfig, type LinkItem } from '@/config/site';

export function SiteHeader(): JSX.Element {
	return (
		<header className="sticky top-0 z-40 w-full border-b-2 border-sky-50 bg-sky-200 text-sky-800 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-300 print:hidden">
			<div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
				<div className="flex gap-6 md:gap-10">
					<Link href="/" className="flex items-center space-x-2">
						<HomeIcon className="size-6" />
						<span className="inline-block font-bold">Lance Miller</span>
					</Link>
					<NavigationMenu>
						<NavigationMenuList>
							{siteConfig.mainNav.map((item) => (
								<NavLinkItem
									key={item.href}
									item={item}
									className="flex items-center text-sm font-medium text-muted-foreground"
								/>
							))}
						</NavigationMenuList>
					</NavigationMenu>
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

const LinkItem: React.FC<LinkItemProps> = ({
	item,
	className,
	children,
	...props
}) => {
	const Ico = item.icon;
	const content: React.ReactNode = (
		<>
			{Ico ? <Ico className="size-6" /> : null}
			{item.title ? (
				<div
					className={cn(
						'text-sm font-medium leading-none',
						item.icon && 'sr-only',
					)}
				>
					{item.title}
				</div>
			) : null}
			{item.description ? (
				<p
					className={cn(
						'line-clamp-2 text-sm leading-snug text-muted-foreground',
						item.icon && 'sr-only',
					)}
				>
					{item.description}
				</p>
			) : null}
		</>
	);

	className = cn(
		'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none',
		className,
		item.disabled && 'cursor-not-allowed opacity-80',
	);

	return item.href ? (
		<Link
			href={item.href}
			className={cn(
				className,
				'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors',
			)}
			target="_blank"
			rel="noreferrer"
			{...props}
		>
			{children && React.isValidElement(children)
				? React.cloneElement(children, {}, content)
				: content}
		</Link>
	) : (
		<span
			className={cn(
				'!bg-transparent !text-sky-800 dark:!text-sky-300',
				className,
			)}
			{...props}
		>
			{content}
		</span>
	);
};

const NavLinkItem: React.FC<LinkItemProps> = ({ item, children, ...props }) => {
	const hasItems = Array.isArray(item.items) && Boolean(item.items.length);
	const hasLink = Boolean(item.href);

	if (!hasItems && !hasLink) {
		return null;
	}

	let link = (
		<LinkItem item={item} {...props} legacyBehavior passHref>
			{hasLink ? (
				<NavigationMenuLink className={navigationMenuTriggerStyle()}>
					{children}
				</NavigationMenuLink>
			) : (
				children
			)}
		</LinkItem>
	);

	if (hasItems) {
		link = <NavigationMenuTrigger>{link}</NavigationMenuTrigger>;
	}

	return (
		<NavigationMenuItem>
			{link}
			{hasItems ? (
				<NavigationMenuContent className="min-w-max">
					<ul className="grid gap-3 p-4 md:grid-cols-2">
						{item.items?.map((subItem, i) => (
							<li key={`subItem-${String(i)}`} className="w-full max-w-[200px]">
								{subItem.href ? (
									<NavigationMenuLink asChild>
										<LinkItem item={subItem} />
									</NavigationMenuLink>
								) : (
									<LinkItem item={subItem} />
								)}
							</li>
						))}
					</ul>
				</NavigationMenuContent>
			) : null}
		</NavigationMenuItem>
	);
};
