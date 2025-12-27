import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@lellimecnar/ui/lib';

export const pageVariants = cva(
	'container flex flex-col items-center justify-center print:my-0',
	{
		variants: {
			variant: {
				default: 'my-8 gap-2',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

export interface PageProps
	extends
		React.ComponentPropsWithoutRef<'section'>,
		VariantProps<typeof pageVariants> {
	notProse?: boolean;
}
export function Page({
	className,
	variant,
	children,
	notProse,
	...props
}: PageProps): JSX.Element {
	return (
		<article
			className={cn(
				notProse
					? 'not-prose'
					: 'prose prose-slate dark:prose-invert max-w-none flex-1 grow',
			)}
		>
			<section className={cn(pageVariants({ variant }), className)} {...props}>
				{children}
			</section>
		</article>
	);
}
