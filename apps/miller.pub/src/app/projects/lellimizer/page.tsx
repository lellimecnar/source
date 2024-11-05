'use client';

import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
} from '@lellimecnar/ui/form';
import { Page } from '@lellimecnar/ui/page';
import { Switch } from '@lellimecnar/ui/switch';
import { Textarea } from '@lellimecnar/ui/textarea';

import { Form, LellimizerOutput } from './_form';

export default function LellimizerPage(): JSX.Element {
	return (
		<Page>
			<h2>Lellimizer</h2>
			<Form className="mx-auto w-full max-w-2xl">
				<div className="mx-auto flex w-fit flex-col items-start justify-start gap-x-8 gap-y-4">
					<FormField
						name="transformCharacters"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center gap-x-2">
								<FormControl>
									<Switch
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
								<FormLabel>Lellimize Characters</FormLabel>
							</FormItem>
						)}
					/>
					<FormField
						name="transformAlphabet"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center gap-x-2">
								<FormControl>
									<Switch
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
								<FormLabel>Lellimize Alphabet</FormLabel>
							</FormItem>
						)}
					/>
					<FormField
						name="transformWords"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center gap-x-2">
								<FormControl>
									<Switch
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
								<FormLabel>Lellimize Words</FormLabel>
							</FormItem>
						)}
					/>
					<FormField
						name="transformSentences"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center gap-x-2">
								<FormControl>
									<Switch
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
								<FormLabel>Lellimize Sentences</FormLabel>
							</FormItem>
						)}
					/>
					<FormField
						name="transformParagraphs"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center gap-x-2">
								<FormControl>
									<Switch
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
								<FormLabel>Lellimize Paragraphs</FormLabel>
							</FormItem>
						)}
					/>
				</div>
				<div className="mt-8">
					<FormField
						name="input"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Input</FormLabel>
								<FormControl>
									<Textarea {...field} />
								</FormControl>
							</FormItem>
						)}
					/>
				</div>
				<div className="mt-8">
					<LellimizerOutput />
				</div>
			</Form>
		</Page>
	);
}
