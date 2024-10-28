import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@lellimecnar/ui/lib';

export const pageVariants = cva('container grid items-center', {
	variants: {
		variant: {
			default: 'my-8 print:my-0',
		},
	},
	defaultVariants: {
		variant: 'default',
	},
});

export interface PageProps
	extends React.ComponentPropsWithoutRef<'section'>,
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
		<section className={cn(pageVariants({ variant }), className)} {...props}>
			<article className={cn(notProse && 'not-prose')}>{children}</article>
		</section>
	);
}
