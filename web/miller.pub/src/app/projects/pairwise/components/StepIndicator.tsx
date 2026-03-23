/* eslint-disable no-nested-ternary -- don't care */
'use client';

import { motion } from 'framer-motion';
import { Fragment } from 'react';

export interface StepIndicatorProps {
	currentStep: number;
	steps: string[];
}

export function StepIndicator({
	currentStep,
	steps,
}: StepIndicatorProps): JSX.Element {
	return (
		<div className="mb-8 flex items-center justify-center gap-2 sm:gap-3">
			{steps.map((step, idx) => (
				<Fragment key={step}>
					<motion.div
						className="flex items-center gap-1.5 sm:gap-2"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: idx * 0.1 }}
					>
						<motion.div
							className={`flex size-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-500 sm:size-8 sm:text-sm ${
								idx < currentStep
									? 'bg-primary text-primary-foreground'
									: idx === currentStep
										? 'bg-foreground text-background'
										: 'bg-muted text-muted-foreground'
							}`}
							animate={{
								scale: idx === currentStep ? 1.1 : 1,
							}}
						>
							{idx < currentStep ? (
								<svg
									className="size-3.5 sm:size-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							) : (
								idx + 1
							)}
						</motion.div>
						<span
							className={`hidden text-xs transition-colors duration-300 sm:text-sm md:block ${
								idx === currentStep
									? 'text-foreground font-medium'
									: 'text-muted-foreground'
							}`}
						>
							{step}
						</span>
					</motion.div>
					{idx < steps.length - 1 ? (
						<div
							className={`h-0.5 w-4 transition-colors duration-500 sm:w-8 ${
								idx < currentStep ? 'bg-primary' : 'bg-muted'
							}`}
						/>
					) : null}
				</Fragment>
			))}
		</div>
	);
}
