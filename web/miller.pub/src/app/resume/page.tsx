'use client';

import Link from 'next/link';
import React, { useMemo } from 'react';

import { Button } from '@lellimecnar/ui/button';
import {
	BriefcaseBusinessIcon,
	PrinterIcon,
	StarsIcon,
} from '@lellimecnar/ui/icons';
import { Page } from '@lellimecnar/ui/page';
import { QRCode } from '@lellimecnar/ui/qrcode';

import data from './_data';

const QR_CODE_LINK =
	'https://github.com/lellimecnar/source/tree/master/web/miller.pub/src/app/resume';

export default function ResumePage(): JSX.Element {
	return (
		<Page notProse>
			<Button
				size="sm"
				variant="outline"
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					window.print();
				}}
				className="max-w-fit px-12 print:hidden"
			>
				<PrinterIcon size={24} />
				<span>Print Resume</span>
			</Button>
			<div className="mx-auto flex min-h-[11in] w-full max-w-[8.5in] flex-col items-start rounded-sm border border-neutral-400 bg-white p-[0.5in] text-black shadow-2xl print:border-none print:bg-transparent print:p-0 print:shadow-none">
				<div className="mb-4 flex w-full items-center justify-between gap-2">
					<h1 className="flex shrink flex-col items-center justify-center text-2xl font-bold leading-none">
						<span className="border-b-2 border-black px-2 uppercase leading-none">
							{data.name}
						</span>
						<span className="text-xl font-semibold leading-none all-small-caps">
							{data.title}
						</span>
						<span className="text-sm font-semibold leading-none text-[#777] all-small-caps">
							{data.location}
						</span>
					</h1>
					<div className="grid shrink grid-cols-2 gap-x-4 gap-y-1">
						{data.contacts.length % 2 ? <span /> : null}
						{data.contacts.map((contact) => (
							<Link
								key={contact.value}
								href={contact.href}
								className="flex items-center gap-1 text-sm"
							>
								{React.cloneElement(contact.icon, { size: 16 })}
								<span>{contact.value}</span>
							</Link>
						))}
					</div>
				</div>
				<div className="flex size-full grow gap-2">
					<div className="flex h-full min-w-36 shrink flex-col">
						<Link href={QR_CODE_LINK} className="mx-2 mt-2">
							<QRCode data={QR_CODE_LINK} className="h-auto w-full" />
							<p className="mb-4 mt-1 p-0 text-center text-xs leading-none">
								scan to view the code for this resume on GitHub
							</p>
						</Link>
						<Heading>
							<StarsIcon />
							Skills
						</Heading>
						<SkillsList />
					</div>
					<div className="flex min-h-full grow flex-col gap-2">
						<Heading>
							<BriefcaseBusinessIcon />
							Work Experience
						</Heading>
						<div className="ml-3 flex h-full flex-col gap-2 border-l-2 border-[#ccc] pb-4 pl-3">
							{data.experience.map((experience) => (
								<ExperienceItem key={experience.title} {...experience} />
							))}
						</div>
					</div>
				</div>
			</div>
		</Page>
	);
}

function Heading({ children }: { children: React.ReactNode }): JSX.Element {
	return (
		<h2 className="flex items-center gap-2 text-xl font-bold uppercase">
			{children}
		</h2>
	);
}

type ExperienceItemProps = (typeof data)['experience'][number];
function ExperienceItem({
	title,
	type,
	employer,
	city,
	state,
	startDate,
	endDate,
	items,
}: ExperienceItemProps): JSX.Element {
	const start = useMemo(
		() =>
			new Date(startDate).toLocaleDateString('en-US', {
				month: 'short',
				year: 'numeric',
			}),
		[startDate],
	);
	const end = useMemo(
		() =>
			endDate
				? new Date(endDate).toLocaleDateString('en-US', {
						month: 'short',
						year: 'numeric',
					})
				: 'present',
		[endDate],
	);
	return (
		<div className="flex flex-col">
			<div className="relative -ml-3 flex break-after-avoid-page items-baseline justify-between gap-4 border-b-2 border-[#777] pl-3 leading-none">
				<span className="absolute -bottom-px -left-px box-content block size-[8px] -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-[#777] bg-white" />
				<span className="relative flex items-baseline gap-4 font-bold">
					<span className="text-md font-semibold">{title}</span>
					{type ? (
						<span className="text-sm font-medium text-[#777] all-small-caps">
							{type}
						</span>
					) : null}
				</span>
				<span className="text-sm italic">{employer}</span>
			</div>
			<div className="flex break-before-avoid-page break-after-avoid-page items-center justify-between text-sm font-medium lining-nums leading-none text-[#777] all-small-caps">
				<span className="">
					{start} – {end}
				</span>
				<span className="">
					{city}, {state}
				</span>
			</div>
			<ul className="list-outside list-ring columns-2 break-before-avoid-page gap-8 pl-6 pr-2 pt-2 text-xs leading-tight">
				{items.map((item) => (
					<ExperienceItemPoint key={item} value={item} />
				))}
			</ul>
		</div>
	);
}

const sanitizeStr = (str: string): string =>
	str.replace(/\W+/g, ' ').trim().toLowerCase();

const keywords = Array.from(
	new Set(
		data.skills
			.map(({ name }) => name)
			.concat(data.keywords)
			.flatMap((str) => {
				str = sanitizeStr(str);

				return [str, ...str.split(/\W+/g)];
			})
			.filter((val) => val.trim()),
	),
);

function ExperienceItemPoint({ value }: { value: string }): JSX.Element {
	const content = useMemo(
		() =>
			value
				.trim()
				.split(/(\S+)/g)
				.map((word, i) => {
					const str = sanitizeStr(word);

					if (keywords.includes(str)) {
						return (
							<span key={`${str}_${String(i)}`} className="font-semibold">
								{word}
							</span>
						);
					}

					return word;
				}),
		[value],
	);
	return <li className="break-inside-avoid-page">{content}</li>;
}

function SkillsList(): JSX.Element {
	const groupMap = useMemo(
		() =>
			data.skills.reduce<
				Record<
					(typeof data.skills)[number]['category'],
					(typeof data.skills)[number][]
				>
			>((result, item) => {
				result[item.category] ??= [];
				result[item.category]?.push(item);

				return result;
			}, {}),
		[data.skills],
	);
	const groups = Object.entries(groupMap)
		.toSorted(([a], [b]) => {
			if (a > b) {
				return 1;
			}

			if (b > a) {
				return -1;
			}

			return 0;
		})
		.map(
			([category, items]) => ({
				title: category,
				items: items.toSorted(({ name: a }, { name: b }) => {
					if (a > b) {
						return 1;
					}

					if (b > a) {
						return -1;
					}

					return 0;
				}),
			}),
			[groupMap],
		);

	return (
		<div className="flex w-full flex-col gap-4">
			{groups.map(({ title, items }) => (
				<div className="flex w-full flex-col gap-1.5" key={title}>
					<div className="relative whitespace-nowrap border-b-2 border-[#ccc] pl-2 text-lg font-bold leading-none text-[#777] all-small-caps">
						<span>{title}</span>
					</div>
					{items.map(({ name, icon, score }) => (
						<div
							className="flex break-inside-avoid-page items-center gap-2 px-2"
							key={name}
						>
							<div className="flex h-full shrink items-center justify-center">
								{React.isValidElement(icon) ? (
									React.cloneElement(icon, {
										size: 24,
										style: { width: 24 },
									} as unknown as Record<string, unknown>)
								) : (
									<span />
								)}
							</div>
							<div className="flex grow flex-col">
								<span className="whitespace-nowrap pr-4 text-xs">{name}</span>
								<div className="relative flex h-1.5 items-center justify-between overflow-hidden rounded-full bg-[#ccc]">
									<div
										className="absolute inset-y-0 left-0 box-content border-r border-white bg-[#33b5e5]"
										style={{
											width: `${((score / 5) * 100).toFixed(2)}%`,
										}}
									/>
									<span className=" box-content h-full grow" />
									<span className="z-10 box-content h-full grow border-l-2 border-white" />
									<span className="z-10 box-content h-full grow border-l-2 border-white" />
									<span className="z-10 box-content h-full grow border-l-2 border-white" />
									<span className="z-10 box-content h-full grow border-l-2 border-white" />
								</div>
							</div>
						</div>
					))}
				</div>
			))}
		</div>
	);
}
