'use client';

import Link from 'next/link';
import React, { useMemo } from 'react';

import { BriefcaseBusinessIcon, StarsIcon } from '@lellimecnar/ui/icons';
import { QRCode } from '@lellimecnar/ui/qrcode';

import data from './_data';

const QR_CODE_LINK =
	'https://github.com/lellimecnar/source/tree/master/apps/miller.pub/src/app/resume';

export default function ResumePage(): JSX.Element {
	return (
		<section className="container grid items-center w-full gap-6 pt-6 md:py-10">
			<div className="flex text-black w-full mx-auto rounded-sm shadow-lg p-[0.5in] max-w-[8.5in] min-h-[11in] flex-col items-start bg-white">
				<div className="flex w-full items-center justify-between gap-2 mb-4">
					<h1 className="text-2xl font-bold shrink flex flex-col items-center justify-center">
						<span className="px-2 border-b-2 border-black shrink leading-none uppercase">
							{data.name}
						</span>
						<span className="text-xl all-small-caps leading-none font-semibold">
							{data.title}
						</span>
					</h1>
					<div className="grid grid-cols-2 gap-x-4 gap-y-1 shrink">
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
				<div className="flex w-full gap-2 h-full grow">
					<div className="flex flex-col shrink h-full min-w-36">
						<Link href={QR_CODE_LINK}>
							<QRCode data={QR_CODE_LINK} className="w-full h-auto" />
							<p className="text-xs leading-none text-center p-0 mt-1 mb-4">
								scan to view the source code for this resume
							</p>
						</Link>
						<Heading>
							<StarsIcon />
							Skills
						</Heading>
						<SkillsList />
					</div>
					<div className="flex flex-col gap-2 grow min-h-full">
						<Heading>
							<BriefcaseBusinessIcon />
							Work Experience
						</Heading>
						<div className="flex flex-col gap-2 border-l-2 border-[#ccc] h-full ml-3 pl-3 pb-4">
							{data.experience.map((experience) => (
								<ExperienceItem key={experience.title} {...experience} />
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function Heading({ children }: { children: React.ReactNode }): JSX.Element {
	return (
		<h2 className="text-xl font-bold flex items-center gap-2 uppercase">
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
			<div className="flex items-baseline relative leading-none justify-between gap-4 border-b-2 border-[#777] -ml-3 pl-3">
				<span className="absolute block size-[10px] rounded-full border-[#777] border-2 bg-white -left-[1px] box-content -bottom-[1px] -translate-x-1/2 translate-y-1/2" />
				<span className="font-bold flex relative items-baseline gap-4">
					<span className="text-md font-semibold">{title}</span>
					{type ? (
						<span className="text-sm font-semibold all-small-caps text-[#777]">
							{type}
						</span>
					) : null}
				</span>
				<span className="text-sm">{employer}</span>
			</div>
			<div className="flex items-center justify-between text-base leading-none font-semibold all-small-caps text-[#777] lining-nums">
				<span className="">
					{start} – {end}
				</span>
				<span className="">
					{city}, {state}
				</span>
			</div>
			<ul className="list-ring list-outside pt-2 pr-2 pl-6 leading-tight text-xs columns-2 gap-8">
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
	return <li className="">{content}</li>;
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
		<div className="flex flex-col gap-4">
			{groups.map(({ title, items }) => (
				<div className="flex flex-col gap-1.5" key={title}>
					<span className="font-bold all-small-caps pl-8 text-lg text-[#777] border-b-2 border-[#ccc] leading-none whitespace-nowrap">
						{title}
					</span>
					{items.map(({ name, icon, score }) => (
						<div className="flex items-center gap-2" key={name}>
							<div className="shrink h-full flex items-center justify-center">
								{React.isValidElement(icon) ? (
									React.cloneElement(icon, {
										size: 24,
										style: { width: 24 },
									} as unknown as Record<string, unknown>)
								) : (
									<span />
								)}
							</div>
							<div className="flex flex-col grow">
								<span className="text-xs whitespace-nowrap pr-4">{name}</span>
								<div className="flex items-center relative justify-between overflow-hidden bg-[#ccc] rounded-full h-2">
									<div
										className="absolute top-0 left-0 bottom-0 bg-[#33b5e5]"
										style={{
											width: `${((score / 5) * 100).toFixed(2)}%`,
										}}
									/>
									<span className=" h-full grow box-content" />
									<span className="border-l-2 border-white h-full grow z-10 box-content" />
									<span className="border-l-2 border-white h-full grow z-10 box-content" />
									<span className="border-l-2 border-white h-full grow z-10 box-content" />
									<span className="border-l-2 border-white h-full grow z-10 box-content" />
								</div>
							</div>
						</div>
					))}
				</div>
			))}
		</div>
	);
}
