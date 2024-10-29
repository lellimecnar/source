'use client';

import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
} from '@lellimecnar/ui/form';
import { Input } from '@lellimecnar/ui/input';
import { Page } from '@lellimecnar/ui/page';

import { Form } from './_form';
import { Preview } from './_preview';

export default function DiagonalWrappingPaperPage(): JSX.Element {
	return (
		<Page className="!h-full">
			<h2>Diagonal Wrapping Paper Calculator</h2>
			<p>
				This method of wrapping boxes is said to be the most efficient method
				for gift wrapping.
			</p>
			<Form>
				<div className="mb-8 flex justify-center gap-x-2 gap-y-4">
					<FormField
						name="width"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Width</FormLabel>
								<FormControl>
									<Input type="number" {...field} className="w-[80px]" />
								</FormControl>
							</FormItem>
						)}
					/>
					<FormField
						name="length"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Length</FormLabel>
								<FormControl>
									<Input type="number" {...field} className="w-[80px]" />
								</FormControl>
							</FormItem>
						)}
					/>
					<FormField
						name="height"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Height</FormLabel>
								<FormControl>
									<Input type="number" {...field} className="w-[80px]" />
								</FormControl>
							</FormItem>
						)}
					/>
					<div className="w-[80px]" />
					<FormField
						name="buffer"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Edge Buffer</FormLabel>
								<FormControl>
									<Input
										type="number"
										step={0.25}
										min={0}
										max={1}
										{...field}
										className="w-[80px]"
									/>
								</FormControl>
								<FormDescription>
									Extra spacing around the edges, for overlap.
								</FormDescription>
							</FormItem>
						)}
					/>
				</div>
				<Preview />
			</Form>
		</Page>
	);
}
