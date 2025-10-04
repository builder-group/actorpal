import { useFeatureState } from 'feature-react/state';
import { createState } from 'feature-state';
import { BookOpen, SquareChevronRight } from 'lucide-react';
import React from 'react';
import { tokenizeText, type TToken } from '@/lib';

const TEXT = `I bought it... I bought it!
One moment...wait...if you would,
ladies and gentlemen... My head's
going round and round, I can't
speak... So now the cherry orchard
is mine! Mine! Great God in heaven
– the cherry orchard is mine!
Tell me I'm drunk – I'm out of my
mind – tell me it's all an illusion ...`;

const Page: React.FC = () => {
	const linesState = React.useMemo(() => {
		const tokens = tokenizeText(TEXT);
		const lines: TRevealableToken[][] = [];
		let currentLine: TRevealableToken[] = [];

		for (const token of tokens) {
			if (token.type === 'newline') {
				if (currentLine.length > 0) {
					lines.push(currentLine);
					currentLine = [];
				}
			} else {
				currentLine.push({ ...token, revealed: false });
			}
		}
		if (currentLine.length > 0) {
			lines.push(currentLine);
		}

		return createState(lines);
	}, []);
	const lines = useFeatureState(linesState);

	// =========================================================================
	// Events
	// =========================================================================

	const toggleLine = React.useCallback(
		(lineIndex: number) => {
			const line = linesState._v[lineIndex];
			if (line == null) {
				return;
			}

			// Check if all words are revealed
			const allWordsRevealed = line.filter((t) => t.type === 'word').every((t) => t.revealed);

			// Toggle all words in the line
			for (const token of line) {
				if (token.type === 'word') {
					token.revealed = !allWordsRevealed;
				}
			}

			linesState._notify();
		},
		[linesState]
	);

	const toggleWord = React.useCallback(
		(lineIndex: number, tokenIndex: number) => {
			const token = linesState._v[lineIndex]?.[tokenIndex];
			if (token == null || token.type !== 'word') {
				return;
			}

			token.revealed = !token.revealed;
			linesState._notify();
		},
		[linesState]
	);

	// =========================================================================
	// UI
	// =========================================================================

	return (
		<div className="bg-base-100 min-h-screen">
			<div className="mx-auto max-w-2xl px-6 py-20">
				<header className="mb-16">
					<p className="font-handwriting mb-2 text-xl text-neutral-400">Practice Makes Perfect</p>
					<h1 className="mb-4 font-serif text-6xl text-neutral-900">Learn Your Lines Fast</h1>
					<p className="mt-6 border-l-2 border-neutral-200 pl-4 font-sans text-base leading-relaxed text-neutral-500">
						Hover over each letter to reveal the full word. Practice recalling the lines using only
						the letter cues to strengthen your memory.
					</p>
				</header>

				<article className="prose prose-lg max-w-none">
					<div className="flex flex-col gap-4">
						{lines.map((line, lineIndex) => {
							const allWordsRevealed = line
								.filter((t) => t.type === 'word')
								.every((t) => t.revealed);

							return (
								<div key={lineIndex} className="flex flex-wrap gap-2 font-sans text-neutral-700">
									<button
										onClick={() => toggleLine(lineIndex)}
										className={`flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-all duration-200 ${
											allWordsRevealed
												? 'bg-secondary/20 text-secondary hover:bg-secondary/30'
												: 'bg-neutral-200/60 text-neutral-500 hover:bg-neutral-300/60 hover:text-neutral-700'
										}`}
										title={allWordsRevealed ? 'Hide all words' : 'Reveal all words'}
									>
										{allWordsRevealed ? (
											<SquareChevronRight className="h-5 w-5" />
										) : (
											<BookOpen className="h-5 w-5" />
										)}
									</button>

									{line.map((token, tokenIndex) => {
										if (token.type === 'space') {
											return null;
										}

										if (token.type === 'punctuation') {
											return (
												<div
													key={tokenIndex}
													className="flex h-12 items-center justify-center rounded-lg bg-blue-100 px-3 text-xl text-blue-700"
												>
													{token.display}
												</div>
											);
										}

										if (token.type === 'word') {
											return (
												<div
													key={tokenIndex}
													onClick={() => toggleWord(lineIndex, tokenIndex)}
													className={`flex h-12 cursor-pointer items-center justify-center rounded-lg px-3 text-xl font-medium transition-all duration-200 hover:shadow-md ${
														token.revealed
															? 'bg-secondary/20 text-secondary hover:bg-secondary/30'
															: 'hover:bg-secondary/20 hover:text-secondary bg-neutral-100'
													}`}
												>
													{token.revealed ? token.original : token.display}
												</div>
											);
										}

										return null;
									})}
								</div>
							);
						})}
					</div>
				</article>

				<footer className="mt-16 border-t border-neutral-200 pt-8">
					<p className="font-sans text-sm text-neutral-400">
						💡 Try to recall each word before hovering to strengthen your memory.
					</p>
				</footer>
			</div>
		</div>
	);
};

export default Page;

type TRevealableToken = TToken & { revealed: boolean };
