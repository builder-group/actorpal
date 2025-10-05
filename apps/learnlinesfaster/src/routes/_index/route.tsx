import { Moon, Sun } from 'lucide-react';
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
						<span className="font-handwriting text-base-content/50 text-2xl font-bold sm:text-3xl">
							Learn Lines Faster
						</span>
					</div>
					<h1 className="text-base-content mt-4 font-serif text-5xl leading-tight font-semibold sm:text-6xl">
						The First Letter Method
					</h1>
					<p className="text-base-content/80 mt-5 font-sans text-lg leading-relaxed">
						Robert Downey Jr. used this technique to memorize Sherlock Holmes—write only the first
						letter of each word, practice with those letters, and let your memory fill in the rest.
						It&apos;s called the first letter method, and it&apos;s helped me learn lines about 4x
						faster. Try it yourself with the interactive tool below.
					</p>
				</div>

				{/* Interactive Demo */}
				<div id="demo" className="mt-10 overflow-hidden md:mt-14 md:px-4">
					<div className="mx-auto w-full max-w-[69rem]">
						<div className="border-base-300 bg-base-200 relative border-y p-6 md:rounded-2xl md:border md:p-8">
							<LinesPractice />
						</div>
					</div>
				</div>
			</section>

			{/* Blog Content Section */}
			<section className="px-4 py-6 md:px-6 md:py-10">
				<div className="mx-auto max-w-3xl">
					<article className="prose prose-base dark:prose-invert max-w-none">
						<Content components={mdxComponents} />
					</article>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-base-300 bg-base-200 mt-16 border-t py-8">
				<div className="mx-auto max-w-3xl px-4 md:px-6">
					<div className="flex items-center justify-between">
						<p className="text-base-content/60 font-sans text-sm">
							Made by{' '}
							<a
								href="https://github.com/bennobuilder"
								target="_blank"
								rel="noopener noreferrer"
								className="text-base-content hover:text-base-content/80 font-medium transition-colors"
							>
								@bennobuilder
							</a>
						</p>

						{/* Theme Toggle */}
						<label className="swap swap-rotate">
							<input type="checkbox" value="dark" className="theme-controller" />
							<Sun className="swap-on text-base-content h-5 w-5 fill-current" />
							<Moon className="swap-off text-base-content h-5 w-5 fill-current" />
						</label>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default Page;

export function meta() {
	return [
		{ title: 'The First Letter Method - Learn Lines 4x Faster Like RDJ' },
		{
			name: 'description',
			content:
				'Master the first letter method (acronym technique) used by Robert Downey Jr. to memorize lines 4x faster. Write the first letter of each word and let your memory do the rest. Free interactive practice tool included.'
		},
		{
			name: 'keywords',
			content:
				'first letter method, acronym method, memorize lines, acting technique, Robert Downey Jr, line learning, actor memorization, learn lines fast, memory technique for actors'
		},
		// Open Graph
		{ property: 'og:title', content: 'The First Letter Method - Learn Lines 4x Faster' },
		{
			property: 'og:description',
			content:
				"Master Robert Downey Jr.'s first letter method to memorize lines 4x faster. Free interactive practice tool."
		},
		{ property: 'og:type', content: 'website' },
		{ property: 'og:url', content: 'https://learnlinesfaster.com' },
		// Twitter Card
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:title', content: 'The First Letter Method - Learn Lines 4x Faster' },
		{
			name: 'twitter:description',
			content:
				"Master RDJ's first letter method to memorize lines 4x faster. Free interactive tool."
		}
	];
}
