'use client';

import { Page } from '@lellimecnar/ui/page';

import { Form } from './_form';
import { Preview } from './_preview';

export default function DiagonalWrappingPaperPage(): JSX.Element {
	return (
		<Page>
			<h2>Diagonal Wrapping Paper Calculator</h2>
			<p>
				This method of wrapping boxes is said to be the most efficient method
				for gift wrapping.
			</p>
			<Form>
				<Preview />
			</Form>
		</Page>
	);
}
