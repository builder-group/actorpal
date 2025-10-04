import { mdxComponents } from '@/components';
import Content from './content.mdx';
import { LinesPractice } from './LinesPractice';

const Page: React.FC = () => {
	return (
		<div className="bg-base-100 min-h-screen">
			{/* Hero Section */}
			<section className="relative pt-16 sm:pt-24">
				<div className="mx-auto max-w-3xl px-4 text-left md:px-6">
					<div className="flex items-center gap-2">
						<span className="font-handwriting text-2xl font-bold text-neutral-400 sm:text-3xl">
							Learn Lines Fast
						</span>
					</div>
					<h1 className="mt-4 font-serif text-5xl leading-tight font-semibold text-neutral-900 sm:text-6xl">
						The Acronym Method
					</h1>
					<p className="mt-5 font-sans text-lg leading-relaxed text-neutral-600">
						I found this watching Robert Downey Jr. talk about learning lines for Sherlock Holmes.
						He calls it the acronym method (also known as the first letter method). Write the first
						letter of each word, practice with just those letters, and let your memory do what it
						does best. It&apos;s helped me learn lines way faster.
					</p>
				</div>

				{/* Interactive Demo */}
				<div id="demo" className="mt-10 overflow-hidden md:mt-14 md:px-4">
					<div className="mx-auto w-full max-w-[69rem]">
						<div className="relative border-y border-neutral-200 bg-neutral-50 p-6 md:rounded-2xl md:border md:p-8">
							<LinesPractice />
						</div>
					</div>
				</div>
			</section>

			{/* Blog Content Section */}
			<section className="px-4 py-6 md:px-6 md:py-10">
				<div className="mx-auto max-w-3xl">
					<article className="prose prose-base prose-gray max-w-none">
						<Content components={mdxComponents} />
					</article>
				</div>
			</section>
		</div>
	);
};

export default Page;

export function meta() {
	return [
		{ title: 'Learn Lines Fast - The Acronym Method (First Letter Method)' },
		{
			name: 'description',
			content:
				"Learn RDJ's acronym method (first letter method) to memorize lines faster. Write the first letter of each word and practice with just those letters. Interactive tool included."
		},
		{
			name: 'keywords',
			content:
				'acronym method, first letter method, learn lines fast, memorize lines, acting technique, Robert Downey Jr, line learning, actor tips, memorization technique'
		},
		// Open Graph
		{ property: 'og:title', content: 'Learn Lines Fast - The Acronym Method' },
		{
			property: 'og:description',
			content:
				"Learn RDJ's acronym method to memorize lines faster. Interactive tool to practice the first letter technique."
		},
		{ property: 'og:type', content: 'website' },
		// Twitter Card
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:title', content: 'Learn Lines Fast - The Acronym Method' },
		{
			name: 'twitter:description',
			content:
				"Learn RDJ's acronym method to memorize lines faster. Interactive practice tool included."
		}
	];
}
